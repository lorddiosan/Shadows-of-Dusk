import React from 'react';
import { Award, Lock, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';
import { BATTLEPASS_TIERS } from '../../data/gameContent';
import { UserProfile } from '../../types/user';

interface BattlePassProps {
  user: UserProfile;
  onClaimReward: (tier: number, isPremium: boolean) => void;
  onUpgradeToPremium: () => void;
}

export const BattlePass: React.FC<BattlePassProps> = ({
  user,
  onClaimReward,
  onUpgradeToPremium
}) => {
  const currentTier = Math.min(30, Math.floor(user.xp / 1000) + 1);
  const xpIntoCurrentTier = user.xp % 1000;
  const isPremiumUnlocked = user.unlockedItems.includes('premium_pass_s1');

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-zinc-950 to-indigo-950 border border-purple-900/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>Season 1: Chronicles of the Convergence</span>
            </div>
            <h1 className="text-3xl font-black text-white mt-1">Convergence War Pass</h1>
            <p className="text-xs text-zinc-300 max-w-lg mt-1">
              Level up by completing matches, holding Points of Interest, and achieving tactical card objectives.
            </p>

            {/* Current Level Progress Bar */}
            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-purple-300 font-bold">Tier {currentTier} / 30</span>
                <span className="text-zinc-400">{xpIntoCurrentTier} / 1000 XP</span>
              </div>
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${(xpIntoCurrentTier / 1000) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pass Upgrade Card */}
          <div className="bg-zinc-900/90 border border-purple-800/80 rounded-2xl p-5 text-center min-w-[240px] shadow-xl">
            <span className="text-xs text-purple-400 font-bold uppercase tracking-wider block">Pass Status</span>
            <div className="text-lg font-black text-white mt-1">
              {isPremiumUnlocked ? (
                <span className="text-emerald-400 flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>PREMIUM ACTIVE</span>
                </span>
              ) : (
                <span className="text-zinc-400">FREE CADRE</span>
              )}
            </div>

            {!isPremiumUnlocked && (
              <button
                onClick={onUpgradeToPremium}
                className="mt-3 w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-950/50 flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <span>Unlock Premium (500 💎)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tier Roadmap (30 levels) */}
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
          <Award className="w-5 h-5 text-purple-400" />
          <span>Progression Track (30 Tiers)</span>
        </h2>

        <div className="overflow-x-auto pb-4">
          <div className="flex space-x-4 min-w-[1200px]">
            {BATTLEPASS_TIERS.map(tierObj => {
              const isUnlocked = currentTier >= tierObj.tier;
              const isCurrent = currentTier === tierObj.tier;

              return (
                <div
                  key={tierObj.tier}
                  className={`w-44 rounded-xl border p-3 flex flex-col justify-between shrink-0 transition ${
                    isCurrent
                      ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-950/50'
                      : isUnlocked
                      ? 'bg-zinc-900/90 border-zinc-700'
                      : 'bg-zinc-950/60 border-zinc-800/80 opacity-70'
                  }`}
                >
                  {/* Tier Indicator */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <span className="text-xs font-black font-mono text-zinc-300">
                      TIER {tierObj.tier}
                    </span>
                    {isUnlocked ? (
                      <span className="text-[10px] text-emerald-400 font-bold">REACHED</span>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </div>

                  {/* Free Reward */}
                  <div className="my-2 p-2 bg-zinc-950/90 rounded-lg border border-zinc-800 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">Free</span>
                    <span className="text-2xl block my-1">{tierObj.freeReward.icon}</span>
                    <span className="text-[11px] font-bold text-zinc-200 block truncate">
                      {tierObj.freeReward.name}
                    </span>
                  </div>

                  {/* Premium Reward */}
                  <div className={`p-2 rounded-lg border text-center relative ${
                    isPremiumUnlocked
                      ? 'bg-amber-950/30 border-amber-600/40'
                      : 'bg-zinc-950/90 border-zinc-800/80'
                  }`}>
                    <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block flex items-center justify-center space-x-1">
                      <span>Premium</span>
                    </span>
                    <span className="text-2xl block my-1">{tierObj.premiumReward.icon}</span>
                    <span className="text-[11px] font-bold text-amber-200 block truncate">
                      {tierObj.premiumReward.name}
                    </span>
                  </div>

                  {/* Claim Button */}
                  {(() => {
                    const isClaimed = user.claimedPassTiers?.includes(tierObj.tier);
                    if (isClaimed) {
                      return (
                        <button
                          disabled
                          className="mt-3 w-full py-1.5 rounded-lg text-xs font-bold bg-zinc-850 border border-emerald-800/40 text-emerald-400 flex items-center justify-center space-x-1 cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Claimed</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        disabled={!isUnlocked}
                        onClick={() => onClaimReward(tierObj.tier, isPremiumUnlocked)}
                        className={`mt-3 w-full py-1.5 rounded-lg text-xs font-bold transition ${
                          isUnlocked
                            ? 'bg-purple-700 hover:bg-purple-600 text-white cursor-pointer'
                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        {isUnlocked ? 'Claim' : 'Locked'}
                      </button>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
