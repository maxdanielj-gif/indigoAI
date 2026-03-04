import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Trash2, Edit2, Calendar, Clock, ChevronRight, Plus, History as HistoryIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

const HistoryScreen: React.FC = () => {
  const { sessions, switchSession, deleteSession, renameSession, createNewSession, activeSessionId } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const navigate = useNavigate();

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    
    const query = searchQuery.toLowerCase();
    return sessions.filter(session => {
      const titleMatch = session.title.toLowerCase().includes(query);
      const messageMatch = session.messages.some(msg => 
        msg.content.toLowerCase().includes(query)
      );
      return titleMatch || messageMatch;
    });
  }, [sessions, searchQuery]);

  const handleSwitch = (id: string) => {
    switchSession(id);
    navigate('/chat');
  };

  const handleRename = (id: string) => {
    if (newTitle.trim()) {
      renameSession(id, newTitle.trim());
      setEditingSessionId(null);
      setNewTitle('');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HistoryIcon className="w-8 h-8 mr-3 text-indigo-600" />
            Conversation History
          </h1>
          <p className="text-gray-500 mt-1">Manage and revisit your past interactions</p>
        </div>
        <button
          onClick={() => {
            createNewSession();
            navigate('/chat');
          }}
          className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Chat
        </button>
      </header>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search conversations or messages..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative bg-white rounded-2xl border transition-all hover:shadow-md ${
                  activeSessionId === session.id ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-100'
                }`}
              >
                <div className="p-5 flex items-start justify-between gap-4">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleSwitch(session.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {editingSessionId === session.id ? (
                        <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            className="flex-1 bg-gray-50 border border-indigo-300 rounded px-2 py-1 text-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                            onBlur={() => handleRename(session.id)}
                          />
                        </div>
                      ) : (
                        <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                          {session.title}
                        </h3>
                      )}
                      {activeSessionId === session.id && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500 line-clamp-1 mb-3">
                      {session.messages.length > 0 
                        ? session.messages[session.messages.length - 1].content 
                        : 'No messages yet'}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {formatDate(session.updatedAt)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {formatTime(session.updatedAt)}
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        {session.messages.length} messages
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSessionId(session.id);
                        setNewTitle(session.title);
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Rename"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this conversation?')) {
                          deleteSession(session.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSwitch(session.id)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Open Chat"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <HistoryIcon className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No conversations found</h3>
              <p className="text-gray-500 mt-1">Try a different search or start a new chat.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HistoryScreen;
