import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Memory } from '@/lib/types';
import {
  Menu, Plus, Edit3, Trash2, Brain, Star, StarOff, Check, X, Loader2,
  Sparkles, Archive
} from 'lucide-react';

const CATEGORIES: { value: Memory['category']; label: string; bgClass: string; textClass: string }[] = [
  { value: 'user', label: 'About User', bgClass: 'bg-indigo-600/20', textClass: 'text-indigo-300' },
  { value: 'ai', label: 'About AI', bgClass: 'bg-violet-600/20', textClass: 'text-violet-300' },
  { value: 'relationship', label: 'Relationship', bgClass: 'bg-pink-600/20', textClass: 'text-pink-300' },
  { value: 'general', label: 'General', bgClass: 'bg-emerald-600/20', textClass: 'text-emerald-300' },
];


const strengthColor = (s: number) => {
  if (s <= 3) return 'bg-red-500';
  if (s <= 5) return 'bg-yellow-500';
  if (s <= 7) return 'bg-emerald-500';
  return 'bg-indigo-500';
};

const MemoryView: React.FC = () => {
  const { memories, addMemory, editMemory, deleteMemory, runSelfReflection, toggleSidebar, isLoading } = useAppContext();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ content: '', category: 'general' as Memory['category'], strength: 5, isImportant: false });
  const [filter, setFilter] = useState<'all' | 'active' | 'pruned'>('active');
  const [catFilter, setCatFilter] = useState<string>('all');

  const filtered = memories.filter(m => {
    if (filter === 'active' && m.isPruned) return false;
    if (filter === 'pruned' && !m.isPruned) return false;
    if (catFilter !== 'all' && m.category !== catFilter) return false;
    return true;
  }).sort((a, b) => {
    if (a.isImportant && !b.isImportant) return -1;
    if (!a.isImportant && b.isImportant) return 1;
    return b.strength - a.strength;
  });

  const handleAdd = () => {
    if (!form.content.trim()) return;
    addMemory(form.content, form.category, form.strength, form.isImportant);
    setForm({ content: '', category: 'general', strength: 5, isImportant: false });
    setShowAdd(false);
  };

  const startEdit = (m: Memory) => {
    setEditingId(m.id);
    setForm({ content: m.content, category: m.category, strength: m.strength, isImportant: m.isImportant });
  };

  const saveEdit = () => {
    if (editingId) {
      editMemory(editingId, form);
      setEditingId(null);
      setForm({ content: '', category: 'general', strength: 5, isImportant: false });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ content: '', category: 'general', strength: 5, isImportant: false });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800/50 shrink-0">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
          <Menu size={22} />
        </button>
        <h1 className="text-white font-semibold flex-1">Core Memories</h1>
        <button
          onClick={runSelfReflection}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 disabled:text-slate-600"
          title="AI Self-Reflection"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        </button>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ content: '', category: 'general', strength: 5, isImportant: false }); }}
          className="p-2 rounded-lg hover:bg-slate-800 text-indigo-400 hover:text-indigo-300"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 pt-3 space-y-2 shrink-0">
        <div className="flex gap-2">
          {(['active', 'pruned', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'active' ? 'Active' : f === 'pruned' ? 'Knowledge Base' : 'All'} ({memories.filter(m => f === 'all' || (f === 'active' ? !m.isPruned : m.isPruned)).length})
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCatFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${catFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-800/40 text-slate-500'}`}
          >
            All
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCatFilter(c.value)}
              className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${catFilter === c.value ? 'bg-slate-700 text-white' : 'bg-slate-800/40 text-slate-500'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAdd || editingId) && (
        <div className="mx-4 mt-3 p-4 bg-slate-800/60 rounded-xl border border-slate-700/30 space-y-3 shrink-0">
          <textarea
            value={form.content}
            onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Enter a memory..."
            className="w-full bg-slate-700/50 text-white text-sm rounded-lg p-3 border border-slate-600 focus:border-indigo-500 focus:outline-none resize-none"
            rows={2}
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setForm(f => ({ ...f, category: c.value }))}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  form.category === c.value ? 'bg-indigo-600 text-white' : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">Strength: {form.strength}/10</span>
              <button
                onClick={() => setForm(f => ({ ...f, isImportant: !f.isImportant }))}
                className={`flex items-center gap-1 text-xs ${form.isImportant ? 'text-yellow-400' : 'text-slate-500'}`}
              >
                {form.isImportant ? <Star size={14} /> : <StarOff size={14} />}
                {form.isImportant ? 'Important' : 'Normal'}
              </button>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={form.strength}
              onChange={(e) => setForm(f => ({ ...f, strength: parseInt(e.target.value) }))}
              className="w-full accent-indigo-500"
            />
            <div className="h-1.5 rounded-full bg-slate-700 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${strengthColor(form.strength)}`}
                style={{ width: `${form.strength * 10}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingId ? saveEdit : handleAdd}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors"
            >
              {editingId ? 'Save Changes' : 'Add Memory'}
            </button>
            <button
              onClick={() => { setShowAdd(false); cancelEdit(); }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-400 text-sm">No memories yet</p>
            <p className="text-slate-500 text-xs mt-1">Add memories to help your companion remember important things</p>
          </div>
        ) : (
          filtered.map(m => {
            const cat = CATEGORIES.find(c => c.value === m.category);
            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition-all ${
                  m.isPruned
                    ? 'bg-slate-800/30 border-slate-700/20 opacity-70'
                    : m.isImportant
                    ? 'bg-slate-800/60 border-yellow-600/30 shadow-sm shadow-yellow-500/5'
                    : 'bg-slate-800/60 border-slate-700/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cat?.bgClass || 'bg-slate-600/20'} ${cat?.textClass || 'text-slate-300'}`}>

                        {cat?.label || m.category}
                      </span>
                      {m.isImportant && <Star size={12} className="text-yellow-400" />}
                      {m.isPruned && <Archive size={12} className="text-slate-500" />}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{m.content}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${strengthColor(m.strength)}`}
                          style={{ width: `${m.strength * 10}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{m.strength}/10</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{new Date(m.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300">
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => editMemory(m.id, { isPruned: !m.isPruned })}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-yellow-400"
                      title={m.isPruned ? 'Restore' : 'Move to Knowledge Base'}
                    >
                      <Archive size={14} />
                    </button>
                    <button onClick={() => deleteMemory(m.id)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MemoryView;
