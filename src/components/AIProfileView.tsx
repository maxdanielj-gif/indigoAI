import React, { useState, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Menu, Upload, X, Save, Bot } from 'lucide-react';

const RELATIONSHIP_TYPES = [
  'Best Friend', 'Romantic Partner', 'Mentor', 'Spouse', 'Companion',
  'Confidant', 'Study Buddy', 'Creative Partner', 'Life Coach', 'Sibling',
];

const AIProfileView: React.FC = () => {
  const { aiProfile, updateAIProfile, toggleSidebar } = useAppContext();
  const [form, setForm] = useState({ ...aiProfile });
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, referenceImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    updateAIProfile(form);
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
        <h1 className="text-white font-semibold flex-1">AI Profile</h1>
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
          <div className="relative">
            {form.referenceImage ? (
              <div className="relative">
                <img
                  src={form.referenceImage}
                  alt={form.name}
                  className="w-28 h-28 rounded-full object-cover ring-4 ring-indigo-500/30 shadow-lg shadow-indigo-500/10"
                />
                <button
                  onClick={() => setForm(f => ({ ...f, referenceImage: '' }))}
                  className="absolute -top-1 -right-1 p-1 bg-red-600 rounded-full text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center cursor-pointer hover:from-indigo-400 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/10"
              >
                <Upload size={24} className="text-white/80 mb-1" />
                <span className="text-white/60 text-[10px]">Upload Photo</span>
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
          >
            {form.referenceImage ? 'Change Photo' : 'Add Reference Image'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Companion Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none"
            placeholder="Enter name..."
          />
        </div>

        {/* Relationship Type */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Relationship Type</label>
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setForm(f => ({ ...f, relationshipType: type }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  form.relationshipType === type
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Personality Traits */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Personality Traits</label>
          <input
            value={form.personalityTraits}
            onChange={(e) => setForm(f => ({ ...f, personalityTraits: e.target.value }))}
            className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none"
            placeholder="e.g., witty, empathetic, sarcastic, creative"
          />
          <p className="text-[10px] text-slate-500 mt-1">Comma-separated traits that define personality</p>
        </div>

        {/* Persona */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Persona / Backstory</label>
          <textarea
            value={form.persona}
            onChange={(e) => setForm(f => ({ ...f, persona: e.target.value }))}
            className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none resize-none"
            rows={4}
            placeholder="Describe your companion's personality, background, and how they interact..."
          />
        </div>

        {/* Physical Appearance */}
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">Physical Appearance</label>
          <textarea
            value={form.appearance}
            onChange={(e) => setForm(f => ({ ...f, appearance: e.target.value }))}
            className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-4 py-3 border border-slate-700/50 focus:border-indigo-500 focus:outline-none resize-none"
            rows={3}
            placeholder="Describe physical features for image generation..."
          />
          <p className="text-[10px] text-slate-500 mt-1">Used for generating photos of your companion</p>
        </div>

        {/* Preview Card */}
        <div className="bg-gradient-to-br from-indigo-950/50 to-violet-950/50 rounded-xl p-4 border border-indigo-800/30">
          <div className="flex items-center gap-3 mb-3">
            {form.referenceImage ? (
              <img src={form.referenceImage} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/50" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">
                {form.name.charAt(0) || '?'}
              </div>
            )}
            <div>
              <h3 className="text-white font-semibold text-sm">{form.name || 'Unnamed'}</h3>
              <p className="text-indigo-400 text-xs">{form.relationshipType}</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{form.persona.slice(0, 150)}{form.persona.length > 150 ? '...' : ''}</p>
          {form.personalityTraits && (
            <div className="flex flex-wrap gap-1 mt-2">
              {form.personalityTraits.split(',').map(t => t.trim()).filter(Boolean).map(trait => (
                <span key={trait} className="px-2 py-0.5 bg-indigo-600/20 text-indigo-300 text-[10px] rounded-full">{trait}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIProfileView;
