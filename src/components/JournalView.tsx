import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  Menu, Plus, Edit3, Trash2, BookOpen, Sparkles, Check, X, Loader2,
  ChevronDown, ChevronUp, Calendar
} from 'lucide-react';

const MOODS = ['reflective', 'happy', 'thoughtful', 'excited', 'melancholy', 'grateful', 'curious', 'peaceful'];

const moodColors: Record<string, string> = {
  reflective: 'bg-indigo-600/20 text-indigo-300',
  happy: 'bg-yellow-600/20 text-yellow-300',
  thoughtful: 'bg-violet-600/20 text-violet-300',
  excited: 'bg-orange-600/20 text-orange-300',
  melancholy: 'bg-blue-600/20 text-blue-300',
  grateful: 'bg-emerald-600/20 text-emerald-300',
  curious: 'bg-cyan-600/20 text-cyan-300',
  peaceful: 'bg-teal-600/20 text-teal-300',
};

const JournalView: React.FC = () => {
  const { journal, addJournalEntry, editJournalEntry, deleteJournalEntry, generateJournal, toggleSidebar, isLoading, aiProfile } = useAppContext();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', mood: 'reflective' });

  const handleAdd = () => {
    if (!form.content.trim()) return;
    addJournalEntry(form.title || `Journal Entry — ${new Date().toLocaleDateString()}`, form.content, form.mood);
    setForm({ title: '', content: '', mood: 'reflective' });
    setShowAdd(false);
  };

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setForm({ title: e.title, content: e.content, mood: e.mood });
  };

  const saveEdit = () => {
    if (editingId) {
      editJournalEntry(editingId, form);
      setEditingId(null);
      setForm({ title: '', content: '', mood: 'reflective' });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: '', content: '', mood: 'reflective' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this journal entry?')) {
      deleteJournalEntry(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800/50 shrink-0">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
          <Menu size={22} />
        </button>
        <h1 className="text-white font-semibold flex-1">{aiProfile.name}'s Journal</h1>
        <button
          onClick={generateJournal}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 disabled:text-slate-600"
          title="AI Generate Entry"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        </button>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ title: '', content: '', mood: 'reflective' }); }}
          className="p-2 rounded-lg hover:bg-slate-800 text-indigo-400 hover:text-indigo-300"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAdd || editingId) && (
        <div className="mx-4 mt-3 p-4 bg-slate-800/60 rounded-xl border border-slate-700/30 space-y-3 shrink-0">
          <input
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Entry title..."
            className="w-full bg-slate-700/50 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 focus:outline-none"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Write your journal entry..."
            className="w-full bg-slate-700/50 text-white text-sm rounded-lg p-3 border border-slate-600 focus:border-indigo-500 focus:outline-none resize-none"
            rows={6}
          />
          <div className="flex gap-1.5 flex-wrap">
            {MOODS.map(mood => (
              <button
                key={mood}
                onClick={() => setForm(f => ({ ...f, mood }))}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  form.mood === mood ? moodColors[mood] || 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-500'
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingId ? saveEdit : handleAdd}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors"
            >
              {editingId ? 'Save Changes' : 'Add Entry'}
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

      {/* Journal List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {journal.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BookOpen size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-400 text-sm">No journal entries yet</p>
            <p className="text-slate-500 text-xs mt-1">Let {aiProfile.name} write about their thoughts and reflections</p>
            <button
              onClick={generateJournal}
              disabled={isLoading}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg flex items-center gap-2"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Generate First Entry
            </button>
          </div>
        ) : (
          journal.map(entry => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="bg-slate-800/60 rounded-xl border border-slate-700/30 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${moodColors[entry.mood] || 'bg-slate-600/20 text-slate-300'}`}>
                        {entry.mood}
                      </span>
                      {entry.autoGenerated && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-600/20 text-violet-300">
                          AI Generated
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-white truncate">{entry.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar size={10} className="text-slate-500" />
                      <span className="text-[10px] text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</span>
                      {entry.updatedAt !== entry.createdAt && (
                        <span className="text-[10px] text-slate-600">(edited)</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700/20">
                    <div className="mt-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/20">
                      <button
                        onClick={() => startEdit(entry)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs rounded-lg transition-colors"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JournalView;
