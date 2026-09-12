import React, { useState, useEffect, useRef } from 'react';
import { X, Swords, Shield, Zap, AlertTriangle, CheckCircle, Radio } from 'lucide-react';
import { MatchmakingService, QueueTicket } from '../../services/matchmakingService';
import { UserProfile } from '../../types/user';
import { ArmyRoster } from '../../types/army';
import { vfxDispatcher } from '../../services/audioVfxService';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  roster: ArmyRoster;
  onMatchFound: (ticket: QueueTicket) => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  onClose,
  user,
  roster,
  onMatchFound
}) => {
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [matchFound, setMatchFound] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (timerRef.current) clearInterval(timerRef.current);
      setTicket(null);
      setSearchTime(0);
      setMatchFound(false);
      setCountdown(3);
      setErrorMsg(null);
      return;
    }

    let isMounted = true;

    // Join matchmaking queue
    MatchmakingService.joinQueue(user, roster).then(({ ticket: createdTicket, error }) => {
      if (!isMounted) return;
      if (error || !createdTicket) {
        setErrorMsg(error?.message || 'Failed to enter matchmaking queue');
        return;
      }

      setTicket(createdTicket);

      // If immediately matched
      if (createdTicket.status === 'matched') {
        triggerMatchFound(createdTicket);
        return;
      }

      // Start search elapsed timer
      timerRef.current = setInterval(() => {
        setSearchTime(s => s + 1);
      }, 1000);

      // Listen for pairing update
      const unsub = MatchmakingService.subscribeToTicket(createdTicket.id, (updated) => {
        if (!isMounted) return;
        triggerMatchFound(updated);
      });
      unsubscribeRef.current = unsub;
    });

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) unsubscribeRef.current();
      if (timerRef.current) clearInterval(timerRef.current);
      MatchmakingService.leaveQueue(user.id);
    };
  }, [isOpen, user.id, roster.id]);

  const triggerMatchFound = (matchedTicket: QueueTicket) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMatchFound(true);
    vfxDispatcher.triggerAbility({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, '⚔️', 'MATCH FOUND!', 'gain_cp');

    let count = 3;
    const countInterval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countInterval);
        onMatchFound(matchedTicket);
        onClose();
      }
    }, 1000);
  };

  const handleLeaveQueue = () => {
    if (ticket) MatchmakingService.leaveQueue(user.id);
    onClose();
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg bg-[#0e111a] border-2 border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden relative">
        
        {/* Animated Radar Sweep Background */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <div className="absolute -inset-[50%] bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.15)_0%,transparent_70%)] animate-pulse" />
        </div>

        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-[#141724]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shadow-lg border border-rose-500/40">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-serif tracking-wide">
                Convergence 1v1 Matchmaking
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {matchFound ? 'Opponent Found — Preparing Battlefield' : 'Scanning orbital satellite relays for challengers'}
              </p>
            </div>
          </div>
          {!matchFound && (
            <button
              onClick={handleLeaveQueue}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-6">
          {errorMsg ? (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : !matchFound ? (
            <>
              {/* Radar Scanner Visual Animation */}
              <div className="relative w-44 h-44 rounded-full border border-rose-500/30 bg-zinc-950/80 flex items-center justify-center shadow-[inset_0_0_30px_rgba(225,29,72,0.2)]">
                {/* Concentric rings */}
                <div className="absolute w-32 h-32 rounded-full border border-rose-500/20" />
                <div className="absolute w-20 h-20 rounded-full border border-rose-500/25" />
                <div className="absolute w-8 h-8 rounded-full border border-rose-500/30" />
                
                {/* Crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-rose-500/20" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-[1px] bg-rose-500/20" />
                </div>

                {/* Rotating Sweep Beam */}
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(225,29,72,0.45)_90deg,transparent_90deg)] animate-[spin_3s_linear_infinite]" />

                {/* Center Blip */}
                <div className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.9)] animate-ping" />
              </div>

              {/* Status and Elapsed Time */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-center space-x-2 text-rose-400 font-mono text-sm font-bold animate-pulse">
                  <Radio className="w-4 h-4 animate-spin" />
                  <span>SEARCHING FOR OPPONENT...</span>
                </div>
                <div className="text-3xl font-black font-mono text-white tracking-widest">
                  {formatTime(searchTime)}
                </div>
                <p className="text-xs text-zinc-400 font-mono">1v1 First-Available Queue (Global Server)</p>
              </div>

              {/* Queued Army Summary */}
              <div className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-left">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-base">
                    ⚔️
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white font-serif">{roster.name}</h5>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {roster.units.length} units • {roster.totalPoints} / {roster.maxPoints} pts
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-mono font-bold uppercase">
                  Ready
                </span>
              </div>

              {/* Leave Queue Button */}
              <button
                type="button"
                onClick={handleLeaveQueue}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-xs font-bold font-mono text-zinc-300 hover:text-white rounded-xl transition cursor-pointer"
              >
                Cancel &amp; Leave Queue
              </button>
            </>
          ) : (
            /* Match Found State */
            <div className="space-y-5 py-4 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(251,191,36,0.6)] animate-bounce">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-amber-950 border border-amber-500 text-amber-300 font-mono font-bold text-xs uppercase tracking-widest animate-pulse">
                  Challenger Intercepted
                </span>
                <h2 className="text-2xl font-black text-white font-serif tracking-wider">
                  MATCH FOUND!
                </h2>
                <p className="text-xs text-zinc-300 font-mono max-w-sm mx-auto">
                  Synchronizing tactical terrain &amp; placing armies onto the continuous battle canvas.
                </p>
              </div>

              <div className="text-center">
                <span className="text-xs text-zinc-400 font-mono uppercase block">Deploying in</span>
                <span className="text-4xl font-black font-mono text-amber-400">{countdown}s</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
