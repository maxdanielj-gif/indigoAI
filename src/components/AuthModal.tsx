import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  X, Mail, Lock, Eye, EyeOff, Loader2, UserPlus, LogIn, Shield, AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (userId: string, email: string) => void;
}

type AuthMode = 'login' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Some Supabase configs auto-confirm, others require email verification
          if (data.session) {
            onAuthenticated(data.user.id, email.trim());
          } else {
            setSuccess('Account created! Check your email to confirm, then sign in.');
            setMode('login');
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          onAuthenticated(data.user.id, email.trim());
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-400 text-[10px]">Cloud sync with E2E encryption</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-600/10 border border-red-600/20 rounded-lg">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 bg-emerald-600/10 border border-emerald-600/20 rounded-lg">
              <Shield size={14} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-300">{success}</p>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/60 text-white text-sm rounded-xl pl-9 pr-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/60 text-white text-sm rounded-xl pl-9 pr-10 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none"
                placeholder="Min 6 characters"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl pl-9 pr-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mode === 'login' ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="px-5 pb-5">
          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/20">
            <div className="flex items-start gap-2">
              <Shield size={12} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Your data is encrypted on your device before uploading. We never see your messages, memories, or personal data. You'll set an encryption passphrase after signing in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
