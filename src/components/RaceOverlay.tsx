import React from 'react';
import {
  PetEntity,
  RaceInputAction,
  RaceRoomSnapshot,
  UserVillageState,
  computePetStats,
} from '@/src/shared/types';
import { ArrowLeft, ArrowRight, ArrowUp, Award, Coins, Flag, Play, Users, X, Zap } from 'lucide-react';

interface RaceLobbyModalProps {
  village: UserVillageState;
  room: RaceRoomSnapshot | null;
  localPlayerId: string | null;
  errorMsg: string | null;
  onCreateRoom: (pet: PetEntity) => void;
  onJoinRoom: (code: string, pet: PetEntity) => void;
  onQuickMatch: (pet: PetEntity) => void;
  onToggleReady: (ready: boolean) => void;
  onStartSolo: () => void;
  onLeave: () => void;
  onClose: () => void;
}

export const RaceLobbyModal: React.FC<RaceLobbyModalProps> = ({
  village,
  room,
  localPlayerId,
  errorMsg,
  onCreateRoom,
  onJoinRoom,
  onQuickMatch,
  onToggleReady,
  onStartSolo,
  onLeave,
  onClose,
}) => {
  const [selectedPetId, setSelectedPetId] = React.useState(village.pets[0]?.id || '');
  const [roomCodeInput, setRoomCodeInput] = React.useState('');

  const selectedPet = village.pets.find((p) => p.id === selectedPetId) || village.pets[0];
  const stats = selectedPet ? computePetStats(selectedPet, village.buildings) : null;
  const localPlayer = room?.players.find((p) => p.playerId === localPlayerId);

  return (
    <div className="pointer-events-auto w-96 rounded-2xl bg-[#161311]/90 p-5 backdrop-blur-md border border-white/12 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-teal-400" />
          <h2 className="font-display text-base font-semibold text-stone-100">PVP Race</h2>
        </div>
        <button
          onClick={() => {
            if (room) onLeave();
            onClose();
          }}
          aria-label="Close"
          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!room ? (
        <>
          <div className="mt-4">
            <div className="text-[11px] font-medium text-stone-400 mb-1.5">Racer</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {village.pets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPetId(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    p.id === selectedPet?.id
                      ? 'bg-teal-700 text-white'
                      : 'bg-white/6 text-stone-300 hover:bg-white/12'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {stats && (
              <div className="mt-2 flex items-center gap-3 text-xs font-mono-num text-stone-300">
                <span>SPD {stats.speed}</span>
                <span>·</span>
                <span>STA {stats.stamina}</span>
                <span>·</span>
                <span>BST +{stats.boost}</span>
              </div>
            )}
          </div>

          {errorMsg && <div className="mt-3 text-xs text-rose-400">{errorMsg}</div>}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => selectedPet && onQuickMatch(selectedPet)}
              disabled={!selectedPet}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-600 text-white whitespace-nowrap cursor-pointer"
            >
              Quick Match
            </button>
            <button
              onClick={() => selectedPet && onCreateRoom(selectedPet)}
              disabled={!selectedPet}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white whitespace-nowrap cursor-pointer"
            >
              Create Room
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedPet && roomCodeInput.trim()) {
                onJoinRoom(roomCodeInput.trim(), selectedPet);
              }
            }}
            className="mt-3 pt-3 border-t border-white/10 flex gap-2"
          >
            <input
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="Room code..."
              maxLength={6}
              className="flex-1 min-w-0 rounded-lg bg-white/8 border border-white/12 px-3 py-2 text-xs font-mono-num uppercase text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={!roomCodeInput.trim() || !selectedPet}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-40 text-stone-100 whitespace-nowrap cursor-pointer"
            >
              Join
            </button>
          </form>
        </>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/6">
            <span className="text-xs text-stone-400">Room</span>
            <span className="font-mono-num text-sm font-semibold tracking-widest text-amber-300">
              {room.roomCode}
            </span>
          </div>

          <div className="mt-3 space-y-1.5">
            {room.players.map((p) => (
              <div
                key={p.playerId}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-medium text-stone-100">
                    {p.name} · {p.petName}
                  </span>
                </div>
                <span className={`font-semibold ${p.ready ? 'text-teal-400' : 'text-stone-400'}`}>
                  {p.ready ? 'Ready' : 'Waiting'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {room.players.filter((p) => !p.isBot).length >= 2 ? (
              <button
                onClick={() => onToggleReady(!localPlayer?.ready)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold text-white cursor-pointer ${
                  localPlayer?.ready ? 'bg-stone-700 hover:bg-stone-600' : 'bg-teal-700 hover:bg-teal-600'
                }`}
              >
                {localPlayer?.ready ? 'Unready' : 'Ready'}
              </button>
            ) : (
              <button
                onClick={onStartSolo}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-600 text-white cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Race</span>
              </button>
            )}
            <button
              onClick={onLeave}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-stone-200 cursor-pointer"
            >
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface RaceHudProps {
  room: RaceRoomSnapshot;
  localPlayerId: string | null;
  rewards: { coins: number; trophies: number; rank: number } | null;
  onInput: (action: RaceInputAction) => void;
  onExitRace: () => void;
}

export const RaceHudOverlay: React.FC<RaceHudProps> = ({
  room,
  localPlayerId,
  rewards,
  onInput,
  onExitRace,
}) => {
  const local = room.players.find((p) => p.playerId === localPlayerId);
  const progressPct = local ? Math.min(100, Math.round((local.z / room.trackLength) * 100)) : 0;
  const staminaPct = local ? Math.round((local.stamina / Math.max(1, local.maxStamina)) * 100) : 0;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
      {/* Top Progress Strip */}
      <div className="flex items-center justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-[#161311]/78 px-4 py-2.5 backdrop-blur-md border border-white/10">
          <div className="text-xs font-mono-num text-stone-200">
            <span className="text-stone-400">DIST </span>
            <span className="font-semibold text-amber-300">{progressPct}%</span>
          </div>
          <div className="w-40 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-teal-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-xs font-mono-num text-stone-300">
            {(room.elapsedMs / 1000).toFixed(1)}s
          </div>
        </div>

        <button
          onClick={onExitRace}
          className="pointer-events-auto px-3.5 py-2 rounded-xl bg-[#161311]/78 hover:bg-white/15 backdrop-blur-md border border-white/10 text-xs font-semibold text-stone-200 cursor-pointer"
        >
          Back to Village
        </button>
      </div>

      {/* Countdown or Finish Banner */}
      {room.status === 'countdown' && (
        <div className="self-center rounded-2xl bg-[#161311]/82 px-10 py-5 backdrop-blur-md border border-white/12 text-center">
          <div className="font-display text-5xl font-bold font-mono-num text-amber-300">
            {room.countdownSec}
          </div>
        </div>
      )}

      {room.status === 'finished' && (
        <div className="pointer-events-auto self-center w-80 rounded-2xl bg-[#161311]/90 p-5 backdrop-blur-md border border-white/15 shadow-2xl">
          <h2 className="font-display text-lg font-semibold text-stone-100 text-center">Results</h2>
          <div className="mt-3 space-y-1.5">
            {[...room.players]
              .sort((a, b) => (a.finishedRank ?? 99) - (b.finishedRank ?? 99))
              .map((p) => (
                <div
                  key={p.playerId}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                    p.playerId === localPlayerId ? 'bg-teal-700/45 border border-teal-400/30' : 'bg-white/6'
                  }`}
                >
                  <span className="font-semibold text-stone-100">
                    #{p.finishedRank} {p.name} · {p.petName}
                  </span>
                  <span className="font-mono-num text-stone-300">
                    {((p.finishTimeMs ?? room.elapsedMs) / 1000).toFixed(1)}s
                  </span>
                </div>
              ))}
          </div>

          {rewards && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs font-mono-num text-amber-300">
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />+{rewards.coins}
              </span>
              {rewards.trophies > 0 && (
                <span className="flex items-center gap-1 text-teal-300">
                  <Award className="w-3.5 h-3.5" />+{rewards.trophies}
                </span>
              )}
            </div>
          )}

          <button
            onClick={onExitRace}
            className="mt-4 w-full py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-xs font-semibold text-white cursor-pointer"
          >
            Return to Village
          </button>
        </div>
      )}

      {/* Bottom Controls & Stamina */}
      <div className="flex items-end justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => onInput('laneLeft')}
            className="p-3 rounded-xl bg-[#161311]/78 hover:bg-white/15 backdrop-blur-md border border-white/10 text-stone-100 cursor-pointer"
            aria-label="Lane Left"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => onInput('laneRight')}
            className="p-3 rounded-xl bg-[#161311]/78 hover:bg-white/15 backdrop-blur-md border border-white/10 text-stone-100 cursor-pointer"
            aria-label="Lane Right"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-[#161311]/78 px-4 py-2.5 backdrop-blur-md border border-white/10">
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-[11px] font-mono-num text-stone-300">
              <span>STA</span>
              <span>{staminaPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${staminaPct}%` }} />
            </div>
          </div>
          <button
            onClick={() => onInput('jump')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-stone-100 cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Jump</span>
          </button>
          <button
            onClick={() => onInput('boost')}
            className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Boost</span>
          </button>
        </div>
      </div>
    </div>
  );
};
