export type PetSpecies = 'cat' | 'dog' | 'duck';
export type PetCoat = 'calico' | 'tabby' | 'black' | 'tan' | 'spotted' | 'white' | 'brown';
export type AccessorySlot = 'head' | 'neck' | 'back';

export type BuildingType =
  | 'kandang'
  | 'warung'
  | 'pancuran'
  | 'klinik'
  | 'lentera'
  | 'arena';

export interface BuildingSpec {
  type: BuildingType;
  name: string;
  shortLabel: string;
  footprint: 1 | 2;
  baseCost: {
    coins: number;
    bamboo: number;
    teak: number;
  };
  coinPerMin: number;
  lightRadius: number;
  accentHex: string;
}

export interface AccessorySpec {
  id: string;
  name: string;
  slot: AccessorySlot;
  costCoins: number;
  speedBonus: number;
  staminaBonus: number;
  boostBonus: number;
  colorHex: string;
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  gx: number;
  gz: number;
  level: number; // 1..10
  lastCollectedAt: number;
}

export interface PetEntity {
  id: string;
  name: string;
  species: PetSpecies;
  coat: PetCoat;
  hunger: number;    // 0..100
  hygiene: number;   // 0..100
  health: number;    // 0..100
  happiness: number; // 0..100
  xp: number;
  equipped: {
    head?: string;
    neck?: string;
    back?: string;
  };
}

export interface UserVillageState {
  id: string;
  name: string;
  isStarterNeighbor?: boolean;
  houseStyle: 'joglo' | 'limasan' | 'bambu';
  coins: number;
  bamboo: number;
  teak: number;
  trophies: number;
  timeOfDay: number; // 0..1 (0.65 = golden hour, 0.85 = lantern twilight)
  unlockedCells: string[]; // "gx,gz"
  buildings: PlacedBuilding[];
  pets: PetEntity[];
  ownedAccessories: string[];
  dailyVisits: Record<string, number>; // targetUserId -> timestamp
  updatedAt: number;
}

export interface UserSummary {
  id: string;
  name: string;
  isStarterNeighbor: boolean;
  trophies: number;
  coins: number;
  petCount: number;
  buildingCount: number;
  maxBuildingLevel: number;
  updatedAt: number;
}

export interface DatabaseSchema {
  users: Record<string, UserVillageState>;
}

export interface PetComputedStats {
  speed: number;
  stamina: number;
  boost: number;
  careScore: number;
}

export const GRID_MIN = -3;
export const GRID_MAX = 3;
export const CELL_SIZE = 3.2;

export const BUILDING_CATALOG: Record<BuildingType, BuildingSpec> = {
  kandang: {
    type: 'kandang',
    name: 'Kandang Bambu',
    shortLabel: 'Shelter',
    footprint: 1,
    baseCost: { coins: 90, bamboo: 8, teak: 2 },
    coinPerMin: 14,
    lightRadius: 4.5,
    accentHex: '#d97706',
  },
  warung: {
    type: 'warung',
    name: 'Warung Pakan',
    shortLabel: 'Food',
    footprint: 1,
    baseCost: { coins: 120, bamboo: 10, teak: 4 },
    coinPerMin: 26,
    lightRadius: 5.5,
    accentHex: '#ea580c',
  },
  pancuran: {
    type: 'pancuran',
    name: 'Pancuran Air',
    shortLabel: 'Bath',
    footprint: 1,
    baseCost: { coins: 110, bamboo: 12, teak: 2 },
    coinPerMin: 16,
    lightRadius: 4.0,
    accentHex: '#0d9488',
  },
  klinik: {
    type: 'klinik',
    name: 'Klinik Jamu',
    shortLabel: 'Clinic',
    footprint: 1,
    baseCost: { coins: 150, bamboo: 10, teak: 6 },
    coinPerMin: 20,
    lightRadius: 5.0,
    accentHex: '#059669',
  },
  lentera: {
    type: 'lentera',
    name: 'Menara Lentera',
    shortLabel: 'Lantern',
    footprint: 1,
    baseCost: { coins: 140, bamboo: 8, teak: 6 },
    coinPerMin: 18,
    lightRadius: 11.0,
    accentHex: '#f59e0b',
  },
  arena: {
    type: 'arena',
    name: 'Arena Latihan',
    shortLabel: 'Arena',
    footprint: 2,
    baseCost: { coins: 240, bamboo: 16, teak: 10 },
    coinPerMin: 34,
    lightRadius: 7.5,
    accentHex: '#0f766e',
  },
};

export const ACCESSORY_CATALOG: AccessorySpec[] = [
  {
    id: 'caping',
    name: 'Caping',
    slot: 'head',
    costCoins: 80,
    speedBonus: 1.2,
    staminaBonus: 10,
    boostBonus: 0.8,
    colorHex: '#d6b370',
  },
  {
    id: 'blangkon',
    name: 'Blangkon',
    slot: 'head',
    costCoins: 140,
    speedBonus: 2.0,
    staminaBonus: 12,
    boostBonus: 1.5,
    colorHex: '#7c4a2d',
  },
  {
    id: 'kalung_batik',
    name: 'Batik Scarf',
    slot: 'neck',
    costCoins: 95,
    speedBonus: 1.0,
    staminaBonus: 16,
    boostBonus: 1.2,
    colorHex: '#b45309',
  },
  {
    id: 'lonceng',
    name: 'Brass Bell',
    slot: 'neck',
    costCoins: 160,
    speedBonus: 1.8,
    staminaBonus: 14,
    boostBonus: 2.0,
    colorHex: '#fbbf24',
  },
  {
    id: 'sayap_layangan',
    name: 'Kite Wings',
    slot: 'back',
    costCoins: 210,
    speedBonus: 2.4,
    staminaBonus: 18,
    boostBonus: 2.8,
    colorHex: '#0d9488',
  },
];

export function cellKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

export function getCellUnlockCost(gx: number, gz: number): { coins: number; bamboo: number } {
  const ring = Math.max(Math.abs(gx), Math.abs(gz));
  return {
    coins: 55 + ring * 45,
    bamboo: 4 + ring * 4,
  };
}

export function getBuildingUpgradeCost(type: BuildingType, currentLevel: number): {
  coins: number;
  bamboo: number;
  teak: number;
} {
  const spec = BUILDING_CATALOG[type];
  const factor = Math.pow(1.38, currentLevel);
  return {
    coins: Math.round(spec.baseCost.coins * factor),
    bamboo: Math.round(spec.baseCost.bamboo * (1 + currentLevel * 0.45)),
    teak: Math.round(spec.baseCost.teak * (1 + currentLevel * 0.5)),
  };
}

export function computePetStats(pet: PetEntity, buildings: PlacedBuilding[]): PetComputedStats {
  const baseBySpecies: Record<PetSpecies, { speed: number; stamina: number; boost: number }> = {
    cat: { speed: 15.2, stamina: 95, boost: 6.2 },
    dog: { speed: 14.8, stamina: 112, boost: 5.8 },
    duck: { speed: 14.4, stamina: 105, boost: 6.8 },
  };
  const base = baseBySpecies[pet.species];
  const careAvg = (pet.hunger + pet.hygiene + pet.health + pet.happiness) / 400; // 0..1
  const careMult = 0.85 + careAvg * 0.25; // up to +25% from care

  let speedBonus = 0;
  let staminaBonus = 0;
  let boostBonus = 0;

  for (const accId of Object.values(pet.equipped)) {
    if (!accId) continue;
    const acc = ACCESSORY_CATALOG.find((a) => a.id === accId);
    if (acc) {
      speedBonus += acc.speedBonus;
      staminaBonus += acc.staminaBonus;
      boostBonus += acc.boostBonus;
    }
  }

  // Building synergy from Arena Latihan & Kandang
  const arenaBonus = buildings
    .filter((b) => b.type === 'arena')
    .reduce((sum, b) => sum + b.level * 0.28, 0);
  const lanternBonus = buildings
    .filter((b) => b.type === 'lentera')
    .reduce((sum, b) => sum + b.level * 1.5, 0);

  return {
    speed: Number(((base.speed + speedBonus + arenaBonus) * careMult).toFixed(1)),
    stamina: Math.round(base.stamina + staminaBonus + lanternBonus),
    boost: Number((base.boost + boostBonus).toFixed(1)),
    careScore: Math.round(careAvg * 100),
  };
}

// ==========================================
// Real-time WebSocket PVP Race Protocol
// ==========================================

export type TrackObstacleKind = 'hurdle' | 'mud' | 'boostPad';

export interface TrackObstacle {
  id: string;
  kind: TrackObstacleKind;
  lane: 0 | 1 | 2;
  z: number;
}

export interface RacePlayerInfo {
  playerId: string;
  userId: string;
  name: string;
  petName: string;
  species: PetSpecies;
  coat: PetCoat;
  equipped: PetEntity['equipped'];
  stats: PetComputedStats;
  ready: boolean;
  lane: 0 | 1 | 2;
  z: number;
  y: number;
  vy: number;
  speed: number;
  stamina: number;
  maxStamina: number;
  boostTimer: number;
  stunTimer: number;
  finishedRank: number | null;
  finishTimeMs: number | null;
  isBot?: boolean;
}

export interface RaceRoomSnapshot {
  roomCode: string;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownSec: number;
  elapsedMs: number;
  trackLength: number;
  obstacles: TrackObstacle[];
  players: RacePlayerInfo[];
}

export type RaceInputAction = 'laneLeft' | 'laneRight' | 'jump' | 'boost';

export type ClientWsMessage =
  | {
      type: 'room:create';
      userId: string;
      name: string;
      pet: PetEntity;
      stats: PetComputedStats;
    }
  | {
      type: 'room:join';
      roomCode: string;
      userId: string;
      name: string;
      pet: PetEntity;
      stats: PetComputedStats;
    }
  | {
      type: 'room:quick';
      userId: string;
      name: string;
      pet: PetEntity;
      stats: PetComputedStats;
    }
  | {
      type: 'room:ready';
      ready: boolean;
    }
  | {
      type: 'room:start_solo';
    }
  | {
      type: 'race:input';
      action: RaceInputAction;
    }
  | {
      type: 'room:leave';
    };

export type ServerWsMessage =
  | {
      type: 'room:joined';
      playerId: string;
      room: RaceRoomSnapshot;
    }
  | {
      type: 'room:state';
      room: RaceRoomSnapshot;
    }
  | {
      type: 'race:countdown';
      countdownSec: number;
    }
  | {
      type: 'race:tick';
      elapsedMs: number;
      players: RacePlayerInfo[];
    }
  | {
      type: 'race:finished';
      room: RaceRoomSnapshot;
      rewardsByUserId: Record<string, { coins: number; trophies: number; rank: number }>;
    }
  | {
      type: 'room:error';
      message: string;
    };
