import React from 'react';
import {
  ACCESSORY_CATALOG,
  BUILDING_CATALOG,
  BuildingType,
  PetEntity,
  PlacedBuilding,
  UserSummary,
  UserVillageState,
  computePetStats,
  getBuildingUpgradeCost,
  getCellUnlockCost,
} from '@/src/shared/types';
import {
  Award,
  Check,
  Coins,
  Droplets,
  Hammer,
  Heart,
  Home,
  Plus,
  ShieldPlus,
  Sparkles,
  UserPlus,
  Users,
  Utensils,
  X,
} from 'lucide-react';

interface BuildDockProps {
  activeType: BuildingType | null;
  onSelectType: (t: BuildingType | null) => void;
  onClose: () => void;
}

export const BuildDock: React.FC<BuildDockProps> = ({ activeType, onSelectType, onClose }) => {
  const types = Object.values(BUILDING_CATALOG);
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-[#161311]/82 px-3 py-2.5 backdrop-blur-md border border-white/10 shadow-xl">
      <button
        onClick={() => onSelectType(null)}
        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
          activeType === null
            ? 'bg-amber-600 text-white'
            : 'bg-white/5 text-stone-200 hover:bg-white/10'
        }`}
      >
        Unlock Land
      </button>
      <div className="h-6 w-px bg-white/10" />
      {types.map((b) => {
        const selected = activeType === b.type;
        return (
          <button
            key={b.type}
            onClick={() => onSelectType(b.type)}
            className={`flex flex-col items-start px-3 py-1.5 rounded-lg text-left whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selected
                ? 'bg-teal-700 text-white'
                : 'bg-white/5 text-stone-200 hover:bg-white/10'
            }`}
          >
            <span className="text-xs font-semibold leading-tight">{b.shortLabel}</span>
            <span className="text-[11px] font-mono-num text-amber-300/90 leading-tight">
              {b.baseCost.coins}c · {b.footprint}x{b.footprint}
            </span>
          </button>
        );
      })}
      <button
        onClick={onClose}
        aria-label="Close Build"
        className="ml-1 p-2 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface BuildingInspectorProps {
  building: PlacedBuilding;
  village: UserVillageState;
  onUpgrade: (id: string) => void;
  onCollect: (id: string) => void;
  onClose: () => void;
}

export const BuildingInspector: React.FC<BuildingInspectorProps> = ({
  building,
  village,
  onUpgrade,
  onCollect,
  onClose,
}) => {
  const spec = BUILDING_CATALOG[building.type];
  const isMax = building.level >= 10;
  const cost = getBuildingUpgradeCost(building.type, building.level);
  const canAfford =
    !isMax &&
    village.coins >= cost.coins &&
    village.bamboo >= cost.bamboo &&
    village.teak >= cost.teak;

  const elapsedMin = Math.max(0, (Date.now() - building.lastCollectedAt) / 60000);
  const pendingCoins = Math.floor(elapsedMin * spec.coinPerMin * (1 + (building.level - 1) * 0.35));

  return (
    <div className="pointer-events-auto w-72 rounded-xl bg-[#161311]/85 p-4 backdrop-blur-md border border-white/12 shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-stone-100">{spec.name}</h3>
          <p className="text-xs text-stone-400 font-mono-num">
            Lv.{building.level} / 10 · {spec.footprint}x{spec.footprint}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-stone-300 border-t border-white/10 pt-3">
        <span>Yield</span>
        <span className="font-mono-num text-amber-300">
          +{Math.round(spec.coinPerMin * (1 + (building.level - 1) * 0.35))}/min
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onCollect(building.id)}
          disabled={pendingCoins < 1}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-amber-600/90 hover:bg-amber-500 disabled:opacity-40 text-white whitespace-nowrap cursor-pointer"
        >
          <Coins className="w-3.5 h-3.5" />
          <span className="font-mono-num">+{pendingCoins}</span>
        </button>

        {!isMax ? (
          <button
            onClick={() => onUpgrade(building.id)}
            disabled={!canAfford}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white whitespace-nowrap cursor-pointer"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Upgrade</span>
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold bg-white/10 text-amber-300">
            Max Level
          </div>
        )}
      </div>

      {!isMax && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono-num text-stone-400">
          <span className={village.coins >= cost.coins ? 'text-stone-300' : 'text-rose-400'}>
            {cost.coins}c
          </span>
          <span className={village.bamboo >= cost.bamboo ? 'text-stone-300' : 'text-rose-400'}>
            {cost.bamboo} bamboo
          </span>
          <span className={village.teak >= cost.teak ? 'text-stone-300' : 'text-rose-400'}>
            {cost.teak} teak
          </span>
        </div>
      )}
    </div>
  );
};

interface PetDrawerProps {
  village: UserVillageState;
  selectedPetId: string | null;
  onSelectPet: (id: string) => void;
  onCare: (petId: string, action: 'feed' | 'wash' | 'heal') => void;
  onEquip: (petId: string, accessoryId: string) => void;
  onClose: () => void;
}

export const PetDrawer: React.FC<PetDrawerProps> = ({
  village,
  selectedPetId,
  onSelectPet,
  onCare,
  onEquip,
  onClose,
}) => {
  const pet = village.pets.find((p) => p.id === selectedPetId) || village.pets[0];
  if (!pet) return null;
  const stats = computePetStats(pet, village.buildings);

  const renderBar = (label: string, val: number, color: string) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-stone-300">
        <span>{label}</span>
        <span className="font-mono-num">{Math.round(val)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, val)}%` }} />
      </div>
    </div>
  );

  return (
    <div className="pointer-events-auto w-80 rounded-xl bg-[#161311]/88 p-4 backdrop-blur-md border border-white/12 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {village.pets.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPet(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                p.id === pet.id
                  ? 'bg-teal-700 text-white'
                  : 'bg-white/5 text-stone-300 hover:bg-white/10'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
        <span className="capitalize">{pet.species} · {pet.coat}</span>
        <span className="font-mono-num text-amber-300">
          SPD {stats.speed} · STA {stats.stamina}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {renderBar('Hunger', pet.hunger, 'bg-amber-500')}
        {renderBar('Hygiene', pet.hygiene, 'bg-teal-400')}
        {renderBar('Health', pet.health, 'bg-emerald-500')}
        {renderBar('Mood', pet.happiness, 'bg-orange-400')}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => onCare(pet.id, 'feed')}
          className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-white/8 hover:bg-amber-600/80 text-stone-100 cursor-pointer"
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Feed</span>
        </button>
        <button
          onClick={() => onCare(pet.id, 'wash')}
          className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-white/8 hover:bg-teal-600/80 text-stone-100 cursor-pointer"
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>Wash</span>
        </button>
        <button
          onClick={() => onCare(pet.id, 'heal')}
          className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-white/8 hover:bg-emerald-600/80 text-stone-100 cursor-pointer"
        >
          <ShieldPlus className="w-3.5 h-3.5" />
          <span>Heal</span>
        </button>
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="text-[11px] font-medium text-stone-400 mb-2">Accessories</div>
        <div className="grid grid-cols-2 gap-1.5">
          {ACCESSORY_CATALOG.map((acc) => {
            const owned = village.ownedAccessories.includes(acc.id);
            const equipped = pet.equipped[acc.slot] === acc.id;
            return (
              <button
                key={acc.id}
                onClick={() => onEquip(pet.id, acc.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
                  equipped
                    ? 'bg-teal-700 text-white'
                    : owned
                    ? 'bg-white/8 text-stone-200 hover:bg-white/15'
                    : 'bg-white/4 text-stone-400 hover:bg-white/10'
                }`}
              >
                <span className="truncate">{acc.name}</span>
                <span className="ml-1.5 font-mono-num text-[11px]">
                  {equipped ? (
                    <Check className="w-3 h-3" />
                  ) : owned ? (
                    'Equip'
                  ) : (
                    `${acc.costCoins}c`
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface StrayModalProps {
  stray: { id: string; species: string; coat: string; name: string };
  coins: number;
  onAdopt: () => void;
  onClose: () => void;
}

export const StrayCard: React.FC<StrayModalProps> = ({ stray, coins, onAdopt, onClose }) => {
  const adoptCost = 60;
  return (
    <div className="pointer-events-auto w-68 rounded-xl bg-[#161311]/88 p-4 backdrop-blur-md border border-white/12 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-stone-100">{stray.name}</h3>
          <p className="text-xs text-stone-400 capitalize">Stray {stray.species} · {stray.coat}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={onAdopt}
        disabled={coins < adoptCost}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white cursor-pointer"
      >
        <Heart className="w-3.5 h-3.5" />
        <span>Adopt · {adoptCost}c</span>
      </button>
    </div>
  );
};

interface NeighborsDrawerProps {
  currentUserId: string;
  users: UserSummary[];
  onFocusHome: () => void;
  onVisitUser: (userId: string, compoundIdx: 0 | 1 | 2) => void;
  onSwitchUser: (userId: string) => void;
  onCreateUser: (name: string) => void;
  onClose: () => void;
}

export const NeighborsDrawer: React.FC<NeighborsDrawerProps> = ({
  currentUserId,
  users,
  onFocusHome,
  onVisitUser,
  onSwitchUser,
  onCreateUser,
  onClose,
}) => {
  const [newName, setNewName] = React.useState('');
  const visitTargets = users.filter((u) => u.id !== currentUserId);

  return (
    <div className="pointer-events-auto w-84 rounded-xl bg-[#161311]/88 p-4 backdrop-blur-md border border-white/12 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <h3 className="font-display text-sm font-semibold text-stone-100">Village & Users</h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
        <button
          onClick={onFocusHome}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/6 hover:bg-white/12 text-xs text-stone-100 cursor-pointer"
        >
          <span className="flex items-center gap-2 font-medium">
            <Home className="w-3.5 h-3.5 text-teal-400" />
            <span>My Plot</span>
          </span>
          <span className="text-stone-400 font-mono-num">Focus</span>
        </button>

        {visitTargets.map((u, idx) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/6"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-stone-100 truncate">{u.name}</div>
              <div className="text-[11px] font-mono-num text-stone-400">
                Lv.{u.maxBuildingLevel} · {u.petCount} pets · <Award className="inline w-3 h-3 text-amber-400" /> {u.trophies}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onVisitUser(u.id, (idx % 3) as 0 | 1 | 2)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-600/85 hover:bg-amber-500 text-white cursor-pointer"
              >
                Visit
              </button>
              {!u.isStarterNeighbor && (
                <button
                  onClick={() => onSwitchUser(u.id)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-white/10 hover:bg-white/20 text-stone-200 cursor-pointer"
                >
                  Play
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          onCreateUser(newName.trim());
          setNewName('');
        }}
        className="mt-3 pt-3 border-t border-white/10 flex gap-2"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New player name..."
          maxLength={20}
          className="flex-1 min-w-0 rounded-lg bg-white/8 border border-white/12 px-2.5 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-teal-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </form>
    </div>
  );
};

interface UnlockCellCardProps {
  gx: number;
  gz: number;
  coins: number;
  bamboo: number;
  onUnlock: () => void;
  onCancel: () => void;
}

export const UnlockCellCard: React.FC<UnlockCellCardProps> = ({
  gx,
  gz,
  coins,
  bamboo,
  onUnlock,
  onCancel,
}) => {
  const cost = getCellUnlockCost(gx, gz);
  const canAfford = coins >= cost.coins && bamboo >= cost.bamboo;
  return (
    <div className="pointer-events-auto w-64 rounded-xl bg-[#161311]/88 p-4 backdrop-blur-md border border-white/12 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-stone-100">
          Plot ({gx}, {gz})
        </span>
        <button
          onClick={onCancel}
          aria-label="Close"
          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs font-mono-num text-stone-300">
        <span className={coins >= cost.coins ? '' : 'text-rose-400'}>{cost.coins}c</span>
        <span>·</span>
        <span className={bamboo >= cost.bamboo ? '' : 'text-rose-400'}>{cost.bamboo} bamboo</span>
      </div>
      <button
        onClick={onUnlock}
        disabled={!canAfford}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Unlock Land</span>
      </button>
    </div>
  );
};

export { Sparkles };
