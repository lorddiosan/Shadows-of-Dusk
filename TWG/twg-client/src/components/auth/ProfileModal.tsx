import React from 'react';
import { X, LogOut, Shield, Crown, User, Sparkles, Key, Check } from 'lucide-react';
import { UserProfile } from '../../types/user';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSignOut: () => void;
  onSwitchAccount: () => void;
  onOpenAdmin?: () => void;
  onOpenFullProfile?: () => void;
  onQuickAdminLogin?: () => void | Promise<void>;
  onQuickPlayerLogin?: () => void | Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut,
  onSwitchAccount,
  onOpenAdmin,
  onOpenFullProfile,
  onQuickAdminLogin,
  onQuickPlayerLogin
}) => {
  if (!isOpen) return null;

  const isAdmin = user.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md bg-[#12141c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-[#171924]">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border ${
              isAdmin ? 'bg-gradient-to-tr from-amber-600 to-rose-600 border-amber-500/50' : 'bg-gradient-to-tr from-sky-600 to-indigo-600 border-sky-500/50'
            }`}>
              {isAdmin ? <Crown className="w-5 h-5 text-white" /> : <Shield className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-serif tracking-wide">Commander Dossier</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Convergence Command Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center space-x-4 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-14 h-14 rounded-xl border-2 border-zinc-700 bg-zinc-900 object-cover shadow"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-white truncate font-serif">{user.displayName}</h4>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-mono font-bold flex items-center space-x-1 shadow">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>ADMIN</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 text-[10px] font-mono font-bold flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-sky-400" />
                    <span>PLAYER</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">@{user.username || 'commander'}</p>
              <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Status and Currencies */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block font-mono">Crystal Shards</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-base">🩸</span>
                <span className="text-sm font-bold font-mono text-[#e07b53]">
                  {user.crystalShards.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block font-mono">Aether Cores</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-base">💎</span>
                <span className="text-sm font-bold font-mono text-[#d49e54]">
                  {user.aetherCores.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Access Rights Badge */}
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-start space-x-2.5 ${
            isAdmin 
              ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md' 
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
          }`}>
            <Key className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <strong className="block text-white">
                  {isAdmin ? 'System Administrator Clearance' : 'Standard Player Clearance'}
                </strong>
                {isAdmin && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600 font-bold uppercase">
                    Admin Active
                  </span>
                )}
              </div>
              <p className="text-[10px] mt-0.5 leading-relaxed">
                {isAdmin 
                  ? 'Full administrative rights granted. War Room Admin Console, unit forging, faction customization, and map editor enabled.' 
                  : 'Access restricted to standard skirmishes and rosters. Switch to Administrator to access the Admin Panel.'}
              </p>

              {/* Quick Admin Action if admin */}
              {isAdmin && onOpenAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="mt-2.5 w-full py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs rounded-lg shadow font-mono flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-200" />
                  <span>Open Admin Console</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Role Elevation Buttons (Instant Demo Switching) */}
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
            <span className="text-[10px] uppercase font-bold font-mono text-zinc-400 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Instant Role Access (Testing)</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (onQuickAdminLogin) await onQuickAdminLogin();
                  onClose();
                }}
                className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/60 text-left transition cursor-pointer group"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs">👑</span>
                  <span className="text-[11px] font-bold text-rose-300 group-hover:text-white font-mono">System Admin</span>
                </div>
                <span className="text-[9px] text-rose-400/80 block font-mono">Unlock Admin Panel</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (onQuickPlayerLogin) await onQuickPlayerLogin();
                  onClose();
                }}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left transition cursor-pointer group"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs">🛡️</span>
                  <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white font-mono">Regular Player</span>
                </div>
                <span className="text-[9px] text-zinc-500 block font-mono">Standard Gated</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Full Profile, Switch Account, Sign Out */}
          <div className="space-y-2 pt-1">
            {onOpenFullProfile && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullProfile();
                }}
                className="w-full py-2 px-3 bg-[#1c140e] hover:bg-[#281b12] border border-[#d49e54]/50 text-xs font-bold font-mono text-[#d49e54] hover:text-white rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Customize Profile &amp; Cosmetics</span>
              </button>
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchAccount();
                }}
                className="flex-1 py-2 px-3 bg-zinc-850 hover:bg-zinc-750 border border-zinc-700 text-xs font-bold font-mono text-zinc-200 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                <span>Switch Account / Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="py-2 px-3 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/80 text-xs font-bold font-mono text-rose-300 rounded-xl transition cursor-pointer flex items-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
