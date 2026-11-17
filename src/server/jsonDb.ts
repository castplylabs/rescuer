import fs from 'node:fs';
import path from 'node:path';
import {
  DatabaseSchema,
  PetEntity,
  PlacedBuilding,
  UserSummary,
  UserVillageState,
} from '../shared/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function createStarterUnlockedCells(): string[] {
  const cells: string[] = [];
  for (let gx = -1; gx <= 1; gx++) {
    for (let gz = -1; gz <= 1; gz++) {
      cells.push(`${gx},${gz}`);
    }
  }
  return cells;
}

export function createStarterVillage(id: string, name: string): UserVillageState {
  const now = Date.now();
  const starterPets: PetEntity[] = [
    {
      id: `pet-${id}-1`,
      name: 'Milo',
      species: 'cat',
      coat: 'calico',
      hunger: 78,
      hygiene: 82,
      health: 92,
      happiness: 84,
      xp: 0,
      equipped: { neck: 'kalung_batik' },
    },
  ];
  const starterBuildings: PlacedBuilding[] = [
    {
      id: `bld-${id}-1`,
      type: 'kandang',
      gx: -1,
      gz: -1,
      level: 1,
      lastCollectedAt: now,
    },
    {
      id: `bld-${id}-2`,
      type: 'lentera',
      gx: 1,
      gz: 1,
      level: 1,
      lastCollectedAt: now,
    },
  ];

  return {
    id,
    name,
    isStarterNeighbor: false,
    houseStyle: 'joglo',
    coins: 360,
    bamboo: 32,
    teak: 14,
    trophies: 0,
    timeOfDay: 0.66, // Warm golden hour default
    unlockedCells: createStarterUnlockedCells(),
    buildings: starterBuildings,
    pets: starterPets,
    ownedAccessories: ['kalung_batik'],
    dailyVisits: {},
    updatedAt: now,
  };
}

function createSeedDatabase(): DatabaseSchema {
  const now = Date.now();
  const pakBudi: UserVillageState = {
    id: 'pak-budi',
    name: 'Pak Budi',
    isStarterNeighbor: true,
    houseStyle: 'joglo',
    coins: 940,
    bamboo: 60,
    teak: 40,
    trophies: 4,
    timeOfDay: 0.66,
    unlockedCells: createStarterUnlockedCells(),
    buildings: [
      { id: 'nb-budi-1', type: 'kandang', gx: -1, gz: -1, level: 5, lastCollectedAt: now },
      { id: 'nb-budi-2', type: 'warung', gx: 1, gz: -1, level: 4, lastCollectedAt: now },
      { id: 'nb-budi-3', type: 'lentera', gx: 0, gz: 1, level: 6, lastCollectedAt: now },
    ],
    pets: [
      {
        id: 'nb-pet-budi-1',
        name: 'Belang',
        species: 'cat',
        coat: 'tabby',
        hunger: 90,
        hygiene: 88,
        health: 95,
        happiness: 92,
        xp: 120,
        equipped: { head: 'blangkon', neck: 'lonceng' },
      },
      {
        id: 'nb-pet-budi-2',
        name: 'Kopi',
        species: 'dog',
        coat: 'brown',
        hunger: 85,
        hygiene: 80,
        health: 90,
        happiness: 89,
        xp: 90,
        equipped: { neck: 'kalung_batik' },
      },
    ],
    ownedAccessories: ['blangkon', 'lonceng', 'kalung_batik'],
    dailyVisits: {},
    updatedAt: now,
  };

  const buSari: UserVillageState = {
    id: 'bu-sari',
    name: 'Bu Sari',
    isStarterNeighbor: true,
    houseStyle: 'limasan',
    coins: 1220,
    bamboo: 75,
    teak: 52,
    trophies: 7,
    timeOfDay: 0.66,
    unlockedCells: createStarterUnlockedCells(),
    buildings: [
      { id: 'nb-sari-1', type: 'warung', gx: -1, gz: 0, level: 7, lastCollectedAt: now },
      { id: 'nb-sari-2', type: 'pancuran', gx: 1, gz: 0, level: 5, lastCollectedAt: now },
      { id: 'nb-sari-3', type: 'klinik', gx: 0, gz: -1, level: 4, lastCollectedAt: now },
      { id: 'nb-sari-4', type: 'lentera', gx: 1, gz: 1, level: 7, lastCollectedAt: now },
    ],
    pets: [
      {
        id: 'nb-pet-sari-1',
        name: 'Wekwek',
        species: 'duck',
        coat: 'white',
        hunger: 94,
        hygiene: 96,
        health: 94,
        happiness: 95,
        xp: 200,
        equipped: { head: 'caping', back: 'sayap_layangan' },
      },
    ],
    ownedAccessories: ['caping', 'sayap_layangan'],
    dailyVisits: {},
    updatedAt: now,
  };

  const masRaka: UserVillageState = {
    id: 'mas-raka',
    name: 'Mas Raka',
    isStarterNeighbor: true,
    houseStyle: 'bambu',
    coins: 1680,
    bamboo: 90,
    teak: 68,
    trophies: 11,
    timeOfDay: 0.66,
    unlockedCells: createStarterUnlockedCells(),
    buildings: [
      { id: 'nb-raka-1', type: 'arena', gx: -1, gz: -1, level: 8, lastCollectedAt: now },
      { id: 'nb-raka-2', type: 'lentera', gx: 1, gz: 1, level: 9, lastCollectedAt: now },
      { id: 'nb-raka-3', type: 'kandang', gx: 1, gz: -1, level: 6, lastCollectedAt: now },
    ],
    pets: [
      {
        id: 'nb-pet-raka-1',
        name: 'Loreng',
        species: 'dog',
        coat: 'tan',
        hunger: 92,
        hygiene: 90,
        health: 96,
        happiness: 94,
        xp: 310,
        equipped: { head: 'blangkon', neck: 'lonceng', back: 'sayap_layangan' },
      },
      {
        id: 'nb-pet-raka-2',
        name: 'Cemong',
        species: 'cat',
        coat: 'black',
        hunger: 88,
        hygiene: 91,
        health: 93,
        happiness: 90,
        xp: 180,
        equipped: { head: 'caping' },
      },
    ],
    ownedAccessories: ['blangkon', 'lonceng', 'sayap_layangan', 'caping'],
    dailyVisits: {},
    updatedAt: now,
  };

  const playerDefault = createStarterVillage('player-1', 'Sanctuary 1');

  return {
    users: {
      [playerDefault.id]: playerDefault,
      [pakBudi.id]: pakBudi,
      [buSari.id]: buSari,
      [masRaka.id]: masRaka,
    },
  };
}

let cachedDb: DatabaseSchema | null = null;

function ensureDbLoaded(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    writeDbAtomically(seed);
    cachedDb = seed;
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed || typeof parsed.users !== 'object') {
      throw new Error('Invalid db.json schema');
    }
    cachedDb = parsed;
    return cachedDb;
  } catch {
    const seed = createSeedDatabase();
    writeDbAtomically(seed);
    cachedDb = seed;
    return cachedDb;
  }
}

function writeDbAtomically(db: DatabaseSchema): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function listUserSummaries(): UserSummary[] {
  const db = ensureDbLoaded();
  return Object.values(db.users)
    .map((u) => ({
      id: u.id,
      name: u.name,
      isStarterNeighbor: Boolean(u.isStarterNeighbor),
      trophies: u.trophies,
      coins: u.coins,
      petCount: u.pets.length,
      buildingCount: u.buildings.length,
      maxBuildingLevel: u.buildings.reduce((m, b) => Math.max(m, b.level), 1),
      updatedAt: u.updatedAt,
    }))
    .sort((a, b) => {
      if (a.isStarterNeighbor !== b.isStarterNeighbor) {
        return a.isStarterNeighbor ? 1 : -1;
      }
      return b.trophies - a.trophies || b.updatedAt - a.updatedAt;
    });
}

export function getOrCreateUser(userId: string, fallbackName?: string): UserVillageState {
  const db = ensureDbLoaded();
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'player-1';
  if (db.users[safeId]) {
    return db.users[safeId];
  }
  const created = createStarterVillage(safeId, fallbackName?.trim() || safeId);
  db.users[safeId] = created;
  writeDbAtomically(db);
  return created;
}

export function createNewUser(name: string): UserVillageState {
  const db = ensureDbLoaded();
  const cleanName = name.trim().slice(0, 24) || `Player ${Object.keys(db.users).length + 1}`;
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18);
  const id = `${slug || 'player'}-${Math.random().toString(36).slice(2, 6)}`;
  const village = createStarterVillage(id, cleanName);
  db.users[id] = village;
  writeDbAtomically(db);
  return village;
}

export function saveUserVillage(userId: string, state: UserVillageState): UserVillageState {
  const db = ensureDbLoaded();
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const next: UserVillageState = {
    ...state,
    id: safeId,
    updatedAt: Date.now(),
  };
  db.users[safeId] = next;
  writeDbAtomically(db);
  return next;
}

export function applyRaceRewardToUser(userId: string, addCoins: number, addTrophies: number): UserVillageState | null {
  const db = ensureDbLoaded();
  const user = db.users[userId];
  if (!user) return null;
  user.coins += addCoins;
  user.trophies += addTrophies;
  user.updatedAt = Date.now();
  writeDbAtomically(db);
  return user;
}

export function recordNeighborVisit(visitorId: string, targetId: string): {
  visitor: UserVillageState;
  grantedCoins: number;
  grantedBamboo: number;
  alreadyVisitedToday: boolean;
} {
  const db = ensureDbLoaded();
  const visitor = getOrCreateUser(visitorId);
  const now = Date.now();
  const lastVisit = visitor.dailyVisits[targetId] || 0;
  const cooldownMs = 60_000 * 5; // 5 min gift cooldown so testing is responsive
  if (now - lastVisit < cooldownMs) {
    return {
      visitor,
      grantedCoins: 0,
      grantedBamboo: 0,
      alreadyVisitedToday: true,
    };
  }
  visitor.dailyVisits[targetId] = now;
  const grantedCoins = 45;
  const grantedBamboo = 4;
  visitor.coins += grantedCoins;
  visitor.bamboo += grantedBamboo;
  visitor.updatedAt = now;
  writeDbAtomically(db);
  return {
    visitor,
    grantedCoins,
    grantedBamboo,
    alreadyVisitedToday: false,
  };
}
