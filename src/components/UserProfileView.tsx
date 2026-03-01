import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Menu, Save, User } from 'lucide-react';

const UserProfileView: React.FC = () => {
  const { userProfile, updateUserProfile, toggleSidebar } = useAppContext();
  const [form, setForm] = useState({ ...userProfile });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateUserProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800/50 shrink-0">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
          <Menu size={22} />
        </button>
        <h1 className="text-white font-semibold flex-1">My Profile</h1>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            saved ? 'bg-green-600/20 text-green-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <User size={36} className="text-white/80" />
          </div>
          <p className="mt-2 text-sm text-white font-medium">{form.name || 'Your Name'}</p>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Your Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none"
            placeholder="What should your companion call you?"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
            className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none resize-none"
            rows={3}
            placeholder="Tell your companion about yourself..."
          />
          <p className="text-[10px] text-slate-500 mt-1">Key facts your companion should always know about you</p>
        </div>

        {/* Persona */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Persona / Role</label>
          <textarea
            value={form.persona}
            onChange={(e) => setForm(f => ({ ...f, persona: e.target.value }))}
            className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none resize-none"
            rows={3}
            placeholder="How do you want to present yourself? (optional)"
          />
        </div>

        {/* Appearance */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Your Appearance</label>
          <textarea
            value={form.appearance}
            onChange={(e) => setForm(f => ({ ...f, appearance: e.target.value }))}
            className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none resize-none"
            rows={3}
            placeholder="Describe your appearance (optional, helps the AI reference you)"
          />
        </div>

        {/* Preview */}
        <div className="bg-gradient-to-br from-emerald-950/50 to-teal-950/50 rounded-xl p-4 border border-emerald-800/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
              {form.name.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{form.name || 'User'}</h3>
              <p className="text-emerald-400 text-xs">That's you!</p>
            </div>
          </div>
          {form.bio && <p className="text-xs text-slate-300 leading-relaxed">{form.bio}</p>}
          {form.persona && <p className="text-xs text-slate-400 mt-1 italic">{form.persona}</p>}
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
