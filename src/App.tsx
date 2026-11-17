import React from 'react';
import {
  ACCESSORY_CATALOG,
  BUILDING_CATALOG,
  BuildingType,
  PetCoat,
  PetEntity,
  PetSpecies,
  PlacedBuilding,
  RaceInputAction,
  RaceRoomSnapshot,
  ServerWsMessage,
  UserSummary,
  UserVillageState,
  cellKey,
  computePetStats,
  getBuildingUpgradeCost,
  getCellUnlockCost,
} from '@/src/shared/types';
import { initCocos4Runtime, runCocosScene } from '@/src/engine/cocosRuntime';
import { SanctuarySceneController } from '@/src/engine/SanctuarySceneController';
import { RaceTrackSceneController } from '@/src/engine/RaceTrackSceneController';
import {
  BuildDock,
  BuildingInspector,
  NeighborsDrawer,
  PetDrawer,
  StrayCard,
  UnlockCellCard,
} from '@/src/components/HudDrawers';
import { RaceHudOverlay, RaceLobbyModal } from '@/src/components/RaceOverlay';
import {
  Award,
  Coins,
  Flag,
  Hammer,
  Home,
  Moon,
  PawPrint,
  Sun,
  Sunset,
  Trees,
  Users,
} from 'lucide-react';

type ActivePanel = 'none' | 'build' | 'pets' | 'neighbors' | 'race';

function getSessionUserId(): string {
  const params = new URLSearchParams(window.location.search);
  const qUser = params.get('user');
  if (qUser) {
    sessionStorage.setItem('kp_user_id', qUser);
    return qUser;
  }
  const existing = sessionStorage.getItem('kp_user_id');
  if (existing) return existing;
  sessionStorage.setItem('kp_user_id', 'player-1');
  return 'player-1';
}

export default function App() {
  const [engineReady, setEngineReady] = React.useState(false);
  const [bootError, setBootError] = React.useState<string | null>(null);
  const [contextLost, setContextLost] = React.useState(false);
  const [village, setVillage] = React.useState<UserVillageState | null>(null);
  const [allUsers, setAllUsers] = React.useState<UserSummary[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);

  const [activePanel, setActivePanel] = React.useState<ActivePanel>('none');
  const [buildType, setBuildType] = React.useState<BuildingType | null>('kandang');
  const [selectedBuildingId, setSelectedBuildingId] = React.useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = React.useState<string | null>(null);
  const [selectedStray, setSelectedStray] = React.useState<{
    id: string;
    species: PetSpecies;
    coat: PetCoat;
    name: string;
  } | null>(null);
  const [pendingUnlockCell, setPendingUnlockCell] = React.useState<{ gx: number; gz: number } | null>(null);

  // Race & WebSocket state
  const [sceneMode, setSceneMode] = React.useState<'sanctuary' | 'race'>('sanctuary');
  const [raceRoom, setRaceRoom] = React.useState<RaceRoomSnapshot | null>(null);
  const [localPlayerId, setLocalPlayerId] = React.useState<string | null>(null);
  const [raceError, setRaceError] = React.useState<string | null>(null);
  const [raceRewards, setRaceRewards] = React.useState<{
    coins: number;
    trophies: number;
    rank: number;
  } | null>(null);

  const sanctuaryRef = React.useRef<SanctuarySceneController | null>(null);
  const raceCtrlRef = React.useRef<RaceTrackSceneController | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const villageRef = React.useRef<UserVillageState | null>(null);
  const buildTypeRef = React.useRef<BuildingType | null>(buildType);
  const localPlayerIdRef = React.useRef<string | null>(null);

  villageRef.current = village;
  buildTypeRef.current = buildType;
  localPlayerIdRef.current = localPlayerId;

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
  }, []);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const persistVillage = React.useCallback(async (next: UserVillageState) => {
    setVillage(next);
    sanctuaryRef.current?.syncVillage(next);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(next.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const listRes = await fetch('/api/users');
        if (listRes.ok) {
          const data = (await listRes.json()) as { users: UserSummary[] };
          setAllUsers(data.users);
        }
      }
    } catch {
      // Keep local state responsive even if transient network hiccup occurs
    }
  }, []);

  const loadUserAndNeighbors = React.useCallback(async (userId: string) => {
    const [uRes, listRes] = await Promise.all([
      fetch(`/api/users/${encodeURIComponent(userId)}`),
      fetch('/api/users'),
    ]);
    const uJson = (await uRes.json()) as { user: UserVillageState };
    const lJson = (await listRes.json()) as { users: UserSummary[] };

    setVillage(uJson.user);
    setAllUsers(lJson.users);
    sanctuaryRef.current?.syncVillage(uJson.user);

    // Fetch up to 3 remote users / neighbors to render their 3D compounds across the lane
    const others = lJson.users.filter((u) => u.id !== uJson.user.id).slice(0, 3);
    const neighborStates = await Promise.all(
      others.map(async (o) => {
        const r = await fetch(`/api/users/${encodeURIComponent(o.id)}`);
        const d = (await r.json()) as { user: UserVillageState };
        return d.user;
      })
    );
    sanctuaryRef.current?.syncRemoteNeighbors(neighborStates);
  }, []);

  // Handle grid clicks in Build Mode
  const handleGridAction = React.useCallback(
    (gx: number, gz: number) => {
      const v = villageRef.current;
      const ctrl = sanctuaryRef.current;
      if (!v || !ctrl) return;
      const bType = buildTypeRef.current;
      const key = cellKey(gx, gz);

      if (bType === null) {
        if (!v.unlockedCells.includes(key)) {
          setPendingUnlockCell({ gx, gz });
        }
        return;
      }

      const spec = BUILDING_CATALOG[bType];
      if (!ctrl.canPlaceAt(gx, gz, spec.footprint)) {
        showToast('Need unlocked empty cells');
        return;
      }
      if (
        v.coins < spec.baseCost.coins ||
        v.bamboo < spec.baseCost.bamboo ||
        v.teak < spec.baseCost.teak
      ) {
        showToast('Not enough resources');
        return;
      }

      const newBuilding: PlacedBuilding = {
        id: `bld-${Date.now().toString(36)}`,
        type: bType,
        gx,
        gz,
        level: 1,
        lastCollectedAt: Date.now(),
      };

      const next: UserVillageState = {
        ...v,
        coins: v.coins - spec.baseCost.coins,
        bamboo: v.bamboo - spec.baseCost.bamboo,
        teak: v.teak - spec.baseCost.teak,
        buildings: [...v.buildings, newBuilding],
      };
      void persistVillage(next);
      setSelectedBuildingId(newBuilding.id);
      setActivePanel('none');
    },
    [persistVillage, showToast]
  );

  // Boot Cocos 4 Engine & Scene 1
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initCocos4Runtime(
          () => setContextLost(true),
          () => setContextLost(false)
        );
        if (!mounted) return;

        const sanctuary = new SanctuarySceneController({
          onSelectBuilding: (id) => {
            setSelectedBuildingId(id);
            setSelectedPetId(null);
            setSelectedStray(null);
            setPendingUnlockCell(null);
          },
          onSelectPet: (id) => {
            setSelectedPetId(id);
            setSelectedBuildingId(null);
            setSelectedStray(null);
            setActivePanel('pets');
            sanctuary.focusPet(id);
          },
          onSelectStray: (stray) => {
            setSelectedStray(stray);
            setSelectedBuildingId(null);
            setPendingUnlockCell(null);
          },
          onGridAction: handleGridAction,
        });

        sanctuaryRef.current = sanctuary;
        runCocosScene(sanctuary.scene);

        const canvas = document.getElementById('GameCanvas') as HTMLCanvasElement | null;
        if (canvas) {
          sanctuary.attachInputListeners(canvas);
        }

        await loadUserAndNeighbors(getSessionUserId());
        if (mounted) setEngineReady(true);
      } catch (err) {
        console.error('Cocos 4 boot error:', err);
        if (mounted) {
          setBootError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      mounted = false;
      sanctuaryRef.current?.detachInputListeners();
      wsRef.current?.close();
    };
  }, [handleGridAction, loadUserAndNeighbors]);

  // Sync Build Mode state to Cocos 4 Scene 1
  React.useEffect(() => {
    sanctuaryRef.current?.setBuildMode(activePanel === 'build' && sceneMode === 'sanctuary', buildType);
  }, [activePanel, buildType, sceneMode]);

  // WebSocket Connection for PVP Race
  const ensureWebSocket = React.useCallback((): Promise<WebSocket> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return Promise.resolve(wsRef.current);
    }
    return new Promise((resolve, reject) => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/race`);
      wsRef.current = ws;

      ws.onopen = () => resolve(ws);
      ws.onerror = () => reject(new Error('WebSocket failed'));

      ws.onmessage = (evt) => {
        const msg = JSON.parse(String(evt.data)) as ServerWsMessage;
        if (msg.type === 'room:error') {
          setRaceError(msg.message);
          return;
        }
        if (msg.type === 'room:joined') {
          setRaceError(null);
          setRaceRewards(null);
          setLocalPlayerId(msg.playerId);
          setRaceRoom(msg.room);
          return;
        }
        if (msg.type === 'room:state') {
          setRaceRoom(msg.room);
          if (msg.room.status === 'countdown' && !raceCtrlRef.current) {
            // Switch Cocos 4 to Scene 2: PetRaceTrack
            sanctuaryRef.current?.detachInputListeners();
            const rCtrl = new RaceTrackSceneController(
              msg.room,
              localPlayerIdRef.current || '',
              villageRef.current?.timeOfDay ?? 0.66
            );
            raceCtrlRef.current = rCtrl;
            runCocosScene(rCtrl.scene);
            setSceneMode('race');
            setActivePanel('none');
          }
          if (msg.room.status === 'racing') {
            raceCtrlRef.current?.setRacingActive(true);
          }
          return;
        }
        if (msg.type === 'race:countdown') {
          setRaceRoom((prev) => (prev ? { ...prev, status: 'countdown', countdownSec: msg.countdownSec } : prev));
          return;
        }
        if (msg.type === 'race:tick') {
          raceCtrlRef.current?.setRacingActive(true);
          raceCtrlRef.current?.syncPlayers(msg.players);
          setRaceRoom((prev) =>
            prev ? { ...prev, status: 'racing', elapsedMs: msg.elapsedMs, players: msg.players } : prev
          );
          return;
        }
        if (msg.type === 'race:finished') {
          raceCtrlRef.current?.setRacingActive(false);
          raceCtrlRef.current?.syncPlayers(msg.room.players);
          setRaceRoom(msg.room);
          const uid = villageRef.current?.id;
          if (uid && msg.rewardsByUserId[uid]) {
            setRaceRewards(msg.rewardsByUserId[uid]);
          }
          if (uid) {
            void loadUserAndNeighbors(uid);
          }
        }
      };
    });
  }, [loadUserAndNeighbors]);

  const sendRaceInput = React.useCallback((action: RaceInputAction) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'race:input', action }));
    }
  }, []);

  // Keyboard controls in Scene 2 Race
  React.useEffect(() => {
    if (sceneMode !== 'race') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        sendRaceInput('laneLeft');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        sendRaceInput('laneRight');
      } else if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        sendRaceInput('jump');
      } else if (e.key === 'Shift') {
        sendRaceInput('boost');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sceneMode, sendRaceInput]);

  const exitRaceToSanctuary = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'room:leave' }));
    }
    setRaceRoom(null);
    setRaceRewards(null);
    setLocalPlayerId(null);
    raceCtrlRef.current = null;
    if (sanctuaryRef.current) {
      runCocosScene(sanctuaryRef.current.scene);
      const canvas = document.getElementById('GameCanvas') as HTMLCanvasElement | null;
      if (canvas) sanctuaryRef.current.attachInputListeners(canvas);
      sanctuaryRef.current.focusCompound(-1);
    }
    setSceneMode('sanctuary');
  };

  // Gameplay Actions
  const handleUnlockCell = () => {
    if (!village || !pendingUnlockCell) return;
    const { gx, gz } = pendingUnlockCell;
    const key = cellKey(gx, gz);
    if (village.unlockedCells.includes(key)) return;
    const cost = getCellUnlockCost(gx, gz);
    if (village.coins < cost.coins || village.bamboo < cost.bamboo) return;
    const next: UserVillageState = {
      ...village,
      coins: village.coins - cost.coins,
      bamboo: village.bamboo - cost.bamboo,
      unlockedCells: [...village.unlockedCells, key],
    };
    setPendingUnlockCell(null);
    void persistVillage(next);
  };

  const handleUpgradeBuilding = (buildingId: string) => {
    if (!village) return;
    const b = village.buildings.find((x) => x.id === buildingId);
    if (!b || b.level >= 10) return;
    const cost = getBuildingUpgradeCost(b.type, b.level);
    if (village.coins < cost.coins || village.bamboo < cost.bamboo || village.teak < cost.teak) {
      showToast('Not enough resources');
      return;
    }
    const next: UserVillageState = {
      ...village,
      coins: village.coins - cost.coins,
      bamboo: village.bamboo - cost.bamboo,
      teak: village.teak - cost.teak,
      buildings: village.buildings.map((x) => (x.id === buildingId ? { ...x, level: x.level + 1 } : x)),
    };
    void persistVillage(next);
  };

  const handleCollectBuilding = (buildingId: string) => {
    if (!village) return;
    const b = village.buildings.find((x) => x.id === buildingId);
    if (!b) return;
    const spec = BUILDING_CATALOG[b.type];
    const elapsedMin = Math.max(0, (Date.now() - b.lastCollectedAt) / 60000);
    const amount = Math.floor(elapsedMin * spec.coinPerMin * (1 + (b.level - 1) * 0.35));
    if (amount < 1) return;
    const next: UserVillageState = {
      ...village,
      coins: village.coins + amount,
      bamboo: village.bamboo + 2,
      teak: village.teak + 1,
      buildings: village.buildings.map((x) =>
        x.id === buildingId ? { ...x, lastCollectedAt: Date.now() } : x
      ),
    };
    void persistVillage(next);
    showToast(`+${amount} coins`);
  };

  const handleAdoptStray = () => {
    if (!village || !selectedStray || village.coins < 60) return;
    const newPet: PetEntity = {
      id: `pet-${Date.now().toString(36)}`,
      name: selectedStray.name,
      species: selectedStray.species,
      coat: selectedStray.coat,
      hunger: 72,
      hygiene: 68,
      health: 86,
      happiness: 85,
      xp: 0,
      equipped: {},
    };
    sanctuaryRef.current?.removeStray(selectedStray.id);
    setSelectedStray(null);
    const next: UserVillageState = {
      ...village,
      coins: village.coins - 60,
      pets: [...village.pets, newPet],
    };
    void persistVillage(next);
    setSelectedPetId(newPet.id);
    setActivePanel('pets');
  };

  const handlePetCare = (petId: string, action: 'feed' | 'wash' | 'heal') => {
    if (!village) return;
    const cost = action === 'heal' ? 20 : 12;
    if (village.coins < cost) {
      showToast('Need more coins');
      return;
    }
    const nextPets = village.pets.map((p) => {
      if (p.id !== petId) return p;
      return {
        ...p,
        hunger: action === 'feed' ? Math.min(100, p.hunger + 24) : p.hunger,
        hygiene: action === 'wash' ? Math.min(100, p.hygiene + 26) : p.hygiene,
        health: action === 'heal' ? Math.min(100, p.health + 24) : p.health,
        happiness: Math.min(100, p.happiness + 12),
        xp: p.xp + 10,
      };
    });
    sanctuaryRef.current?.triggerPetCelebration(petId);
    void persistVillage({ ...village, coins: village.coins - cost, pets: nextPets });
  };

  const handleEquipAccessory = (petId: string, accId: string) => {
    if (!village) return;
    const spec = ACCESSORY_CATALOG.find((a) => a.id === accId);
    if (!spec) return;
    const owned = village.ownedAccessories.includes(accId);
    let nextCoins = village.coins;
    let nextOwned = village.ownedAccessories;

    if (!owned) {
      if (village.coins < spec.costCoins) {
        showToast('Not enough coins');
        return;
      }
      nextCoins -= spec.costCoins;
      nextOwned = [...nextOwned, accId];
    }

    const nextPets = village.pets.map((p) => {
      if (p.id !== petId) return p;
      const alreadyEquipped = p.equipped[spec.slot] === accId;
      return {
        ...p,
        equipped: {
          ...p.equipped,
          [spec.slot]: alreadyEquipped ? undefined : accId,
        },
      };
    });
    sanctuaryRef.current?.triggerPetCelebration(petId);
    void persistVillage({
      ...village,
      coins: nextCoins,
      ownedAccessories: nextOwned,
      pets: nextPets,
    });
  };

  const handleTimeOfDayChange = (val: number) => {
    if (!village) return;
    sanctuaryRef.current?.setTimeOfDay(val);
    raceCtrlRef.current?.lighting.applyTimeOfDay(val);
    setVillage({ ...village, timeOfDay: val });
  };

  const commitTimeOfDay = (val: number) => {
    if (!village) return;
    void persistVillage({ ...village, timeOfDay: val });
  };

  const handleVisitUser = async (targetId: string, compoundIdx: 0 | 1 | 2) => {
    if (!village) return;
    sanctuaryRef.current?.focusCompound(compoundIdx);
    const res = await fetch(
      `/api/users/${encodeURIComponent(village.id)}/visit/${encodeURIComponent(targetId)}`,
      { method: 'POST' }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        visitor: UserVillageState;
        grantedCoins: number;
        grantedBamboo: number;
        alreadyVisitedToday: boolean;
      };
      setVillage(data.visitor);
      if (!data.alreadyVisitedToday) {
        showToast(`+${data.grantedCoins}c · +${data.grantedBamboo} bamboo`);
      }
    }
  };

  const handleSwitchUser = async (userId: string) => {
    sessionStorage.setItem('kp_user_id', userId);
    await loadUserAndNeighbors(userId);
    sanctuaryRef.current?.focusCompound(-1);
    setActivePanel('none');
  };

  const handleCreateUser = async (name: string) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: UserVillageState };
      sessionStorage.setItem('kp_user_id', data.user.id);
      await loadUserAndNeighbors(data.user.id);
      sanctuaryRef.current?.focusCompound(-1);
      setActivePanel('none');
    }
  };

  const selectedBuilding = village?.buildings.find((b) => b.id === selectedBuildingId) || null;

  return (
    <div className="pointer-events-none relative w-screen h-screen overflow-hidden">
      {/* Loading Veil */}
      {(!engineReady || contextLost) && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#14110f]/95 text-stone-200 px-6 text-center">
          <div className="font-display text-2xl font-bold tracking-tight text-amber-300">
            Kampung Paws
          </div>
          <p className="mt-2 text-xs text-stone-400">
            {bootError
              ? `Render error: ${bootError}`
              : contextLost
              ? 'Restoring WebGL2 context...'
              : 'Loading Cocos 4 village...'}
          </p>
        </div>
      )}

      {/* Scene 1 HUD: Kampung Sanctuary */}
      {engineReady && sceneMode === 'sanctuary' && village && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-[#161311]/78 px-4 py-2 backdrop-blur-md border border-white/10">
              <span className="font-display text-base font-bold tracking-tight text-stone-100 whitespace-nowrap">
                Kampung Paws
              </span>
              <span className="text-stone-500">·</span>
              <span className="text-xs font-medium text-amber-300 whitespace-nowrap">
                {village.name}
              </span>
            </div>

            {/* Resources + Time-of-Day Lighting Control */}
            <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-[#161311]/78 px-4 py-2 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-3 text-xs font-mono-num text-stone-100">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  {village.coins}
                </span>
                <span className="text-stone-600">/</span>
                <span className="flex items-center gap-1 text-emerald-300">
                  <Trees className="w-3.5 h-3.5" />
                  {village.bamboo}
                </span>
                <span className="text-stone-600">/</span>
                <span className="text-amber-200">{village.teak}t</span>
                <span className="text-stone-600">/</span>
                <span className="flex items-center gap-1 text-teal-300">
                  <Award className="w-3.5 h-3.5" />
                  {village.trophies}
                </span>
              </div>

              <div className="h-4 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-amber-200" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={village.timeOfDay}
                  onChange={(e) => handleTimeOfDayChange(parseFloat(e.target.value))}
                  onMouseUp={(e) => commitTimeOfDay(parseFloat((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => commitTimeOfDay(parseFloat((e.target as HTMLInputElement).value))}
                  aria-label="Lighting time of day"
                  className="sun-slider w-24"
                />
                {village.timeOfDay > 0.78 ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-300" />
                ) : (
                  <Sunset className="w-3.5 h-3.5 text-orange-400" />
                )}
              </div>
            </div>
          </div>

          {/* Toast Feedback */}
          {toast && (
            <div className="self-center rounded-lg bg-[#161311]/90 px-3.5 py-1.5 text-xs font-medium text-amber-200 border border-amber-400/20 backdrop-blur-md">
              {toast}
            </div>
          )}

          {/* Context Drawers (Right Edge) */}
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 flex justify-center">
              {activePanel === 'build' ? (
                <BuildDock
                  activeType={buildType}
                  onSelectType={setBuildType}
                  onClose={() => setActivePanel('none')}
                />
              ) : (
                <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-[#161311]/78 p-1.5 backdrop-blur-md border border-white/10 shadow-xl">
                  <button
                    onClick={() => {
                      sanctuaryRef.current?.focusCompound(-1);
                      setActivePanel('none');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-stone-200 hover:bg-white/10 whitespace-nowrap cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Home</span>
                  </button>
                  <button
                    onClick={() => setActivePanel('build')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-stone-200 hover:bg-white/10 whitespace-nowrap cursor-pointer"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>Build</span>
                  </button>
                  <button
                    onClick={() => setActivePanel(activePanel === 'pets' ? 'none' : 'pets')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                      activePanel === 'pets'
                        ? 'bg-teal-700 text-white'
                        : 'text-stone-200 hover:bg-white/10'
                    }`}
                  >
                    <PawPrint className="w-3.5 h-3.5" />
                    <span>Pets</span>
                  </button>
                  <button
                    onClick={() => setActivePanel(activePanel === 'neighbors' ? 'none' : 'neighbors')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                      activePanel === 'neighbors'
                        ? 'bg-amber-600 text-white'
                        : 'text-stone-200 hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Visit</span>
                  </button>
                  <button
                    onClick={() => setActivePanel(activePanel === 'race' ? 'none' : 'race')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-600 text-white whitespace-nowrap cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Race</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right-anchored active drawer */}
            <div className="flex flex-col items-end gap-3">
              {pendingUnlockCell && (
                <UnlockCellCard
                  gx={pendingUnlockCell.gx}
                  gz={pendingUnlockCell.gz}
                  coins={village.coins}
                  bamboo={village.bamboo}
                  onUnlock={handleUnlockCell}
                  onCancel={() => setPendingUnlockCell(null)}
                />
              )}

              {selectedStray && (
                <StrayCard
                  stray={selectedStray}
                  coins={village.coins}
                  onAdopt={handleAdoptStray}
                  onClose={() => setSelectedStray(null)}
                />
              )}

              {selectedBuilding && (
                <BuildingInspector
                  building={selectedBuilding}
                  village={village}
                  onUpgrade={handleUpgradeBuilding}
                  onCollect={handleCollectBuilding}
                  onClose={() => setSelectedBuildingId(null)}
                />
              )}

              {activePanel === 'pets' && (
                <PetDrawer
                  village={village}
                  selectedPetId={selectedPetId}
                  onSelectPet={(id) => {
                    setSelectedPetId(id);
                    sanctuaryRef.current?.focusPet(id);
                  }}
                  onCare={handlePetCare}
                  onEquip={handleEquipAccessory}
                  onClose={() => setActivePanel('none')}
                />
              )}

              {activePanel === 'neighbors' && (
                <NeighborsDrawer
                  currentUserId={village.id}
                  users={allUsers}
                  onFocusHome={() => sanctuaryRef.current?.focusCompound(-1)}
                  onVisitUser={handleVisitUser}
                  onSwitchUser={handleSwitchUser}
                  onCreateUser={handleCreateUser}
                  onClose={() => setActivePanel('none')}
                />
              )}

              {activePanel === 'race' && (
                <RaceLobbyModal
                  village={village}
                  room={raceRoom}
                  localPlayerId={localPlayerId}
                  errorMsg={raceError}
                  onCreateRoom={async (pet) => {
                    const ws = await ensureWebSocket();
                    ws.send(
                      JSON.stringify({
                        type: 'room:create',
                        userId: village.id,
                        name: village.name,
                        pet,
                        stats: computePetStats(pet, village.buildings),
                      })
                    );
                  }}
                  onJoinRoom={async (code, pet) => {
                    const ws = await ensureWebSocket();
                    ws.send(
                      JSON.stringify({
                        type: 'room:join',
                        roomCode: code,
                        userId: village.id,
                        name: village.name,
                        pet,
                        stats: computePetStats(pet, village.buildings),
                      })
                    );
                  }}
                  onQuickMatch={async (pet) => {
                    const ws = await ensureWebSocket();
                    ws.send(
                      JSON.stringify({
                        type: 'room:quick',
                        userId: village.id,
                        name: village.name,
                        pet,
                        stats: computePetStats(pet, village.buildings),
                      })
                    );
                  }}
                  onToggleReady={(ready) => {
                    wsRef.current?.send(JSON.stringify({ type: 'room:ready', ready }));
                  }}
                  onStartSolo={() => {
                    wsRef.current?.send(JSON.stringify({ type: 'room:start_solo' }));
                  }}
                  onLeave={() => {
                    wsRef.current?.send(JSON.stringify({ type: 'room:leave' }));
                    setRaceRoom(null);
                    setLocalPlayerId(null);
                  }}
                  onClose={() => setActivePanel('none')}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scene 2 HUD: PVP Pet Racing */}
      {engineReady && sceneMode === 'race' && raceRoom && (
        <RaceHudOverlay
          room={raceRoom}
          localPlayerId={localPlayerId}
          rewards={raceRewards}
          onInput={sendRaceInput}
          onExitRace={exitRaceToSanctuary}
        />
      )}
    </div>
  );
}
