import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, KeyRound, AlertCircle, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { UserProfile } from '../../types/user';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { user, error } = await AuthService.signIn(email, password);
        if (error) {
          setErrorMsg(error.message || 'Invalid login credentials');
        } else if (user) {
          onAuthSuccess(user);
          onClose();
        }
      } else if (mode === 'register') {
        const { user, error } = await AuthService.signUp(email, password, displayName, username);
        if (error) {
          setErrorMsg(error.message || 'Registration failed');
        } else if (user) {
          onAuthSuccess(user);
          onClose();
        }
      } else if (mode === 'reset') {
        const { success, error } = await AuthService.resetPassword(email);
        if (error) {
          setErrorMsg(error.message || 'Failed to send reset link');
        } else if (success) {
          setSuccessMsg('Password reset instructions sent to your email!');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = async () => {
    setLoading(true);
    const user = await AuthService.signInAsDemoAdmin();
    setLoading(false);
    onAuthSuccess(user);
    onClose();
  };

  const handleDemoPlayer = async () => {
    setLoading(true);
    const user = await AuthService.signInAsDemoPlayer();
    setLoading(false);
    onAuthSuccess(user);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { user, error } = await AuthService.signInWithGoogle();
      if (error) {
        setErrorMsg(error.message || 'Google sign-in failed');
      } else if (user) {
        onAuthSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md bg-[#12141c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-[#171924]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shadow-lg border border-rose-500/40">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-serif tracking-wide">
                {mode === 'login' ? 'Commander Sign In' : mode === 'register' ? 'Commission New Commander' : 'Reset Clearance'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {mode === 'login' ? 'Enter credentials to access your war room' : mode === 'register' ? 'Establish your command identity' : 'We will send reset instructions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-800 bg-[#0f1118]">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 text-xs font-bold font-mono transition cursor-pointer text-center ${
              mode === 'login' ? 'text-rose-400 border-b-2 border-rose-500 bg-zinc-900/40' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 text-xs font-bold font-mono transition cursor-pointer text-center ${
              mode === 'register' ? 'text-rose-400 border-b-2 border-rose-500 bg-zinc-900/40' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setMode('reset'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 text-xs font-bold font-mono transition cursor-pointer text-center ${
              mode === 'reset' ? 'text-rose-400 border-b-2 border-rose-500 bg-zinc-900/40' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Reset
          </button>
        </div>

        {/* Google OAuth Provider Button (AUTH-011) */}
        {mode !== 'reset' && (
          <div className="px-5 pt-5 pb-1">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 bg-[#181b24] hover:bg-[#222634] border border-zinc-700/80 hover:border-zinc-500 rounded-xl text-xs font-semibold text-white transition flex items-center justify-center space-x-2.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center mt-4 mb-1 space-x-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">or continue with email</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 pt-3 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1 font-mono">Display Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Warmaster Kael"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1 font-mono">Username (Unique)</label>
                <div className="relative">
                  <span className="text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="e.g. kael_ironclad"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1 font-mono">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="commander@warpath.game"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer font-mono"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="animate-spin">⚙️ Processing...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Authenticate & Enter' : mode === 'register' ? 'Complete Commission' : 'Send Reset Link'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Testing Shortcuts (AUTH-008 & AUTH-009 / AUTH-010 testing) */}
        <div className="p-4 bg-[#0d0f16] border-t border-zinc-850 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase font-mono text-zinc-400 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Instant Test Logins (Role Testing)</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDemoPlayer}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-left transition cursor-pointer group"
            >
              <div className="flex items-center space-x-1.5">
                <span className="text-xs">🛡️</span>
                <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white font-mono">Regular Player</span>
              </div>
              <span className="text-[9px] text-zinc-500 block font-mono">role: player (Admin Gated)</span>
            </button>

            <button
              type="button"
              onClick={handleDemoAdmin}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-700/60 text-left transition cursor-pointer group"
            >
              <div className="flex items-center space-x-1.5">
                <span className="text-xs">👑</span>
                <span className="text-[11px] font-bold text-rose-300 group-hover:text-rose-200 font-mono">System Admin</span>
              </div>
              <span className="text-[9px] text-rose-400/80 block font-mono">role: admin (Full Access)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
