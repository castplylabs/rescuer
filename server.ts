import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import {
  ClientWsMessage,
  PetEntity,
  RaceInputAction,
  RacePlayerInfo,
  RaceRoomSnapshot,
  ServerWsMessage,
  TrackObstacle,
  UserVillageState,
} from './src/shared/types.js';
import {
  applyRaceRewardToUser,
  createNewUser,
  getOrCreateUser,
  listUserSummaries,
  recordNeighborVisit,
  saveUserVillage,
} from './src/server/jsonDb.js';

const PORT = 3000;
const TRACK_LENGTH = 260;

interface ServerRoom extends RaceRoomSnapshot {
  tickHandle?: NodeJS.Timeout;
  countdownHandle?: NodeJS.Timeout;
  nextRank: number;
}

const rooms = new Map<string, ServerRoom>();
const clientRoomMap = new Map<WebSocket, { roomCode: string; playerId: string }>();
const roomSockets = new Map<string, Map<string, WebSocket>>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generateTrackObstacles(): TrackObstacle[] {
  const obs: TrackObstacle[] = [];
  let z = 26;
  let idx = 0;
  while (z < TRACK_LENGTH - 18) {
    const lane = (idx % 3) as 0 | 1 | 2;
    const roll = (idx * 7 + 3) % 10;
    if (roll < 4) {
      obs.push({ id: `obs-${idx}`, kind: 'hurdle', lane, z });
    } else if (roll < 7) {
      obs.push({ id: `obs-${idx}`, kind: 'mud', lane, z });
    } else {
      obs.push({ id: `obs-${idx}`, kind: 'boostPad', lane, z });
    }
    if (idx % 2 === 0 && roll < 7) {
      const altLane = ((lane + 1) % 3) as 0 | 1 | 2;
      obs.push({ id: `obs-${idx}-b`, kind: 'boostPad', lane: altLane, z: z + 5 });
    }
    z += 15 + (idx % 3) * 4;
    idx++;
  }
  return obs;
}

function toPublicSnapshot(room: ServerRoom): RaceRoomSnapshot {
  return {
    roomCode: room.roomCode,
    status: room.status,
    countdownSec: room.countdownSec,
    elapsedMs: room.elapsedMs,
    trackLength: room.trackLength,
    obstacles: room.obstacles,
    players: room.players,
  };
}

function broadcastRoom(roomCode: string, msg: ServerWsMessage): void {
  const sockets = roomSockets.get(roomCode);
  if (!sockets) return;
  const payload = JSON.stringify(msg);
  for (const ws of sockets.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function createRacerFromPayload(
  playerId: string,
  userId: string,
  name: string,
  pet: PetEntity,
  stats: RacePlayerInfo['stats'],
  lane: 0 | 1 | 2,
  isBot = false
): RacePlayerInfo {
  return {
    playerId,
    userId,
    name,
    petName: pet.name,
    species: pet.species,
    coat: pet.coat,
    equipped: pet.equipped,
    stats,
    ready: isBot,
    lane,
    z: 0,
    y: 0,
    vy: 0,
    speed: 0,
    stamina: stats.stamina,
    maxStamina: stats.stamina,
    boostTimer: 0,
    stunTimer: 0,
    finishedRank: null,
    finishTimeMs: null,
    isBot,
  };
}

function startCountdown(room: ServerRoom): void {
  if (room.status !== 'lobby') return;
  // If only 1 human player, add 2 village pacers so the race track always feels lively
  if (room.players.length === 1) {
    const pacerTemplates: Array<{ id: string; name: string; petName: string; species: 'cat' | 'dog' | 'duck'; coat: 'tabby' | 'tan' | 'white' }> = [
      { id: 'pacer-1', name: 'Pak Budi', petName: 'Belang', species: 'cat', coat: 'tabby' },
      { id: 'pacer-2', name: 'Mas Raka', petName: 'Loreng', species: 'dog', coat: 'tan' },
    ];
    pacerTemplates.forEach((tpl, i) => {
      const lane = ((i + 1) % 3) as 0 | 1 | 2;
      room.players.push({
        playerId: `bot-${i + 1}`,
        userId: tpl.id,
        name: tpl.name,
        petName: tpl.petName,
        species: tpl.species,
        coat: tpl.coat,
        equipped: { head: i === 0 ? 'caping' : 'blangkon' },
        stats: { speed: 15.2 + i * 0.7, stamina: 100, boost: 5.5, careScore: 88 },
        ready: true,
        lane,
        z: 0,
        y: 0,
        vy: 0,
        speed: 0,
        stamina: 100,
        maxStamina: 100,
        boostTimer: 0,
        stunTimer: 0,
        finishedRank: null,
        finishTimeMs: null,
        isBot: true,
      });
    });
  }

  room.status = 'countdown';
  room.countdownSec = 3;
  broadcastRoom(room.roomCode, { type: 'room:state', room: toPublicSnapshot(room) });
  broadcastRoom(room.roomCode, { type: 'race:countdown', countdownSec: 3 });

  room.countdownHandle = setInterval(() => {
    room.countdownSec -= 1;
    if (room.countdownSec > 0) {
      broadcastRoom(room.roomCode, { type: 'race:countdown', countdownSec: room.countdownSec });
    } else {
      if (room.countdownHandle) clearInterval(room.countdownHandle);
      room.countdownHandle = undefined;
      startRaceLoop(room);
    }
  }, 1000);
}

function startRaceLoop(room: ServerRoom): void {
  room.status = 'racing';
  room.elapsedMs = 0;
  room.nextRank = 1;
  broadcastRoom(room.roomCode, { type: 'room:state', room: toPublicSnapshot(room) });

  const dtSec = 0.05; // 20Hz authoritative tick
  const passedObsByPlayer = new Map<string, Set<string>>();
  for (const p of room.players) {
    passedObsByPlayer.set(p.playerId, new Set());
  }

  room.tickHandle = setInterval(() => {
    room.elapsedMs += 50;

    for (const p of room.players) {
      if (p.finishedRank !== null) continue;

      // Simple pacer steering so village runners dodge hurdles
      if (p.isBot) {
        const upcoming = room.obstacles.find(
          (o) => o.z > p.z + 1 && o.z < p.z + 7 && o.lane === p.lane
        );
        if (upcoming) {
          if (upcoming.kind === 'hurdle' && p.y === 0) {
            p.vy = 7.4;
          } else if (upcoming.kind === 'mud') {
            p.lane = ((p.lane + 1) % 3) as 0 | 1 | 2;
          }
        } else if (p.stamina > 35 && p.boostTimer <= 0 && Math.random() < 0.03) {
          p.boostTimer = 1.1;
          p.stamina = Math.max(0, p.stamina - 24);
        }
      }

      // Vertical jump integration
      if (p.y > 0 || p.vy > 0) {
        p.y += p.vy * dtSec;
        p.vy -= 21 * dtSec;
        if (p.y <= 0) {
          p.y = 0;
          p.vy = 0;
        }
      }

      if (p.boostTimer > 0) p.boostTimer = Math.max(0, p.boostTimer - dtSec);
      if (p.stunTimer > 0) p.stunTimer = Math.max(0, p.stunTimer - dtSec);
      if (p.boostTimer <= 0) {
        p.stamina = Math.min(p.maxStamina, p.stamina + 9 * dtSec);
      }

      let targetSpeed = p.stats.speed;
      if (p.boostTimer > 0) targetSpeed += p.stats.boost;
      if (p.stunTimer > 0) targetSpeed *= 0.48;

      p.speed += (targetSpeed - p.speed) * Math.min(1, dtSec * 6);
      const prevZ = p.z;
      p.z += p.speed * dtSec;

      // Obstacle triggers
      const hitSet = passedObsByPlayer.get(p.playerId)!;
      for (const obs of room.obstacles) {
        if (hitSet.has(obs.id)) continue;
        if (obs.lane === p.lane && obs.z >= prevZ - 0.6 && obs.z <= p.z + 0.6) {
          hitSet.add(obs.id);
          if (obs.kind === 'hurdle') {
            if (p.y < 0.75) {
              p.stunTimer = 0.85;
              p.speed *= 0.45;
            }
          } else if (obs.kind === 'mud') {
            if (p.y < 0.3) {
              p.stunTimer = 0.9;
            }
          } else if (obs.kind === 'boostPad') {
            p.boostTimer = Math.max(p.boostTimer, 1.35);
          }
        }
      }

      if (p.z >= room.trackLength) {
        p.z = room.trackLength;
        p.finishedRank = room.nextRank++;
        p.finishTimeMs = room.elapsedMs;
      }
    }

    broadcastRoom(room.roomCode, {
      type: 'race:tick',
      elapsedMs: room.elapsedMs,
      players: room.players,
    });

    const allFinished = room.players.every((p) => p.finishedRank !== null);
    if (allFinished || room.elapsedMs > 45_000) {
      // Assign remaining ranks by progress
      const remaining = room.players
        .filter((p) => p.finishedRank === null)
        .sort((a, b) => b.z - a.z);
      for (const p of remaining) {
        p.finishedRank = room.nextRank++;
        p.finishTimeMs = room.elapsedMs;
      }

      if (room.tickHandle) clearInterval(room.tickHandle);
      room.tickHandle = undefined;
      room.status = 'finished';

      const rewardsByUserId: Record<string, { coins: number; trophies: number; rank: number }> = {};
      for (const p of room.players) {
        if (p.isBot) continue;
        const rank = p.finishedRank || 3;
        const coins = rank === 1 ? 150 : rank === 2 ? 95 : 55;
        const trophies = rank === 1 ? 2 : rank === 2 ? 1 : 0;
        applyRaceRewardToUser(p.userId, coins, trophies);
        rewardsByUserId[p.userId] = { coins, trophies, rank };
      }

      broadcastRoom(room.roomCode, {
        type: 'race:finished',
        room: toPublicSnapshot(room),
        rewardsByUserId,
      });
    }
  }, 50);
}

function handleInput(player: RacePlayerInfo, action: RaceInputAction): void {
  if (action === 'laneLeft') {
    player.lane = Math.max(0, player.lane - 1) as 0 | 1 | 2;
  } else if (action === 'laneRight') {
    player.lane = Math.min(2, player.lane + 1) as 0 | 1 | 2;
  } else if (action === 'jump') {
    if (player.y <= 0.02) {
      player.vy = 7.8;
    }
  } else if (action === 'boost') {
    if (player.stamina >= 22 && player.boostTimer <= 0.15) {
      player.stamina -= 22;
      player.boostTimer = 1.25;
    }
  }
}

function leaveRoom(ws: WebSocket): void {
  const link = clientRoomMap.get(ws);
  if (!link) return;
  clientRoomMap.delete(ws);

  const sockets = roomSockets.get(link.roomCode);
  sockets?.delete(link.playerId);

  const room = rooms.get(link.roomCode);
  if (!room) return;
  room.players = room.players.filter((p) => p.playerId !== link.playerId);

  const hasHuman = room.players.some((p) => !p.isBot);
  if (!hasHuman) {
    if (room.tickHandle) clearInterval(room.tickHandle);
    if (room.countdownHandle) clearInterval(room.countdownHandle);
    rooms.delete(link.roomCode);
    roomSockets.delete(link.roomCode);
    return;
  }

  broadcastRoom(room.roomCode, { type: 'room:state', room: toPublicSnapshot(room) });
}

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/users', (_req, res) => {
    res.json({ users: listUserSummaries() });
  });

  app.get('/api/users/:id', (req, res) => {
    const user = getOrCreateUser(req.params.id, typeof req.query.name === 'string' ? req.query.name : undefined);
    res.json({ user });
  });

  app.post('/api/users', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name : 'Village Guest';
    const user = createNewUser(name);
    res.status(201).json({ user });
  });

  app.put('/api/users/:id', (req, res) => {
    const body = req.body as Partial<UserVillageState>;
    if (!body || !Array.isArray(body.buildings) || !Array.isArray(body.pets)) {
      res.status(400).json({ error: 'Invalid village payload' });
      return;
    }
    const saved = saveUserVillage(req.params.id, body as UserVillageState);
    res.json({ user: saved });
  });

  app.post('/api/users/:id/visit/:targetId', (req, res) => {
    const result = recordNeighborVisit(req.params.id, req.params.targetId);
    res.json(result);
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/race' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: ClientWsMessage;
      try {
        msg = JSON.parse(String(raw)) as ClientWsMessage;
      } catch {
        return;
      }

      if (msg.type === 'room:create') {
        leaveRoom(ws);
        const roomCode = generateRoomCode();
        const playerId = `p-${Math.random().toString(36).slice(2, 8)}`;
        const room: ServerRoom = {
          roomCode,
          status: 'lobby',
          countdownSec: 3,
          elapsedMs: 0,
          trackLength: TRACK_LENGTH,
          obstacles: generateTrackObstacles(),
          players: [createRacerFromPayload(playerId, msg.userId, msg.name, msg.pet, msg.stats, 1)],
          nextRank: 1,
        };
        rooms.set(roomCode, room);
        roomSockets.set(roomCode, new Map([[playerId, ws]]));
        clientRoomMap.set(ws, { roomCode, playerId });
        ws.send(JSON.stringify({ type: 'room:joined', playerId, room: toPublicSnapshot(room) } satisfies ServerWsMessage));
        return;
      }

      if (msg.type === 'room:join' || msg.type === 'room:quick') {
        leaveRoom(ws);
        let room: ServerRoom | undefined;
        if (msg.type === 'room:join') {
          room = rooms.get(msg.roomCode.trim().toUpperCase());
          if (!room || room.status !== 'lobby' || room.players.length >= 3) {
            ws.send(JSON.stringify({ type: 'room:error', message: 'Room unavailable or full' } satisfies ServerWsMessage));
            return;
          }
        } else {
          for (const r of rooms.values()) {
            if (r.status === 'lobby' && r.players.length < 3) {
              room = r;
              break;
            }
          }
          if (!room) {
            const roomCode = generateRoomCode();
            room = {
              roomCode,
              status: 'lobby',
              countdownSec: 3,
              elapsedMs: 0,
              trackLength: TRACK_LENGTH,
              obstacles: generateTrackObstacles(),
              players: [],
              nextRank: 1,
            };
            rooms.set(roomCode, room);
            roomSockets.set(roomCode, new Map());
          }
        }

        const usedLanes = new Set(room.players.map((p) => p.lane));
        const openLane = ([1, 0, 2] as const).find((l) => !usedLanes.has(l)) ?? 0;
        const playerId = `p-${Math.random().toString(36).slice(2, 8)}`;
        room.players.push(createRacerFromPayload(playerId, msg.userId, msg.name, msg.pet, msg.stats, openLane));
        roomSockets.get(room.roomCode)!.set(playerId, ws);
        clientRoomMap.set(ws, { roomCode: room.roomCode, playerId });

        ws.send(JSON.stringify({ type: 'room:joined', playerId, room: toPublicSnapshot(room) } satisfies ServerWsMessage));
        broadcastRoom(room.roomCode, { type: 'room:state', room: toPublicSnapshot(room) });
        return;
      }

      const link = clientRoomMap.get(ws);
      if (!link) return;
      const room = rooms.get(link.roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.playerId === link.playerId);
      if (!player) return;

      if (msg.type === 'room:ready') {
        if (room.status !== 'lobby') return;
        player.ready = msg.ready;
        broadcastRoom(room.roomCode, { type: 'room:state', room: toPublicSnapshot(room) });
        const humanPlayers = room.players.filter((p) => !p.isBot);
        if (humanPlayers.length >= 2 && humanPlayers.every((p) => p.ready)) {
          startCountdown(room);
        }
        return;
      }

      if (msg.type === 'room:start_solo') {
        if (room.status === 'lobby') {
          player.ready = true;
          startCountdown(room);
        }
        return;
      }

      if (msg.type === 'race:input') {
        if (room.status === 'racing' && player.finishedRank === null) {
          handleInput(player, msg.action);
        }
        return;
      }

      if (msg.type === 'room:leave') {
        leaveRoom(ws);
      }
    });

    ws.on('close', () => {
      leaveRoom(ws);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Kampung Paws server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
