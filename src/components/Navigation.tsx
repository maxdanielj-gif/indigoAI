import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { ViewType } from '@/lib/types';
import {
  MessageCircle, Image, Settings, Brain, BookOpen, Bot, User, X,
  Cloud, CloudOff, Loader2, CheckCircle2, XCircle, Sparkles
} from 'lucide-react';

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: 'chat', label: 'Chat', icon: <MessageCircle size={20} /> },
  { view: 'gallery', label: 'Gallery', icon: <Image size={20} /> },
  { view: 'generate', label: 'Generate', icon: <Sparkles size={20} /> },
  { view: 'memory', label: 'Memory', icon: <Brain size={20} /> },
  { view: 'journal', label: 'Journal', icon: <BookOpen size={20} /> },
  { view: 'ai-profile', label: 'AI Profile', icon: <Bot size={20} /> },
  { view: 'user-profile', label: 'My Profile', icon: <User size={20} /> },
  { view: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

const Navigation: React.FC = () => {
  const {
    sidebarOpen, toggleSidebar, currentView, setCurrentView, aiProfile,
    isAuthenticated, syncState, syncStatus, authUser,
  } = useAppContext();

  const handleNav = (view: ViewType) => {
    setCurrentView(view);
    toggleSidebar();
  };

  const SyncIndicator = () => {
    if (!isAuthenticated || !syncState.enabled) {
      return (
        <div className="flex items-center gap-1.5 text-slate-500">
          <CloudOff size={12} />
          <span className="text-[10px]">Local only</span>
        </div>
      );
    }
    if (syncStatus === 'syncing') {
      return (
        <div className="flex items-center gap-1.5 text-indigo-400">
          <Loader2 size={12} className="animate-spin" />
          <span className="text-[10px]">Syncing...</span>
        </div>
      );
    }
    if (syncStatus === 'success') {
      return (
        <div className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 size={12} />
          <span className="text-[10px]">Synced</span>
        </div>
      );
    }
    if (syncStatus === 'error') {
      return (
        <div className="flex items-center gap-1.5 text-red-400">
          <XCircle size={12} />
          <span className="text-[10px]">Sync error</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-indigo-400">
        <Cloud size={12} />
        <span className="text-[10px]">Cloud enabled</span>
      </div>
    );
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 z-50 transform transition-transform duration-300 ease-out shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            {aiProfile.referenceImage ? (
              <img src={aiProfile.referenceImage} alt={aiProfile.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                {aiProfile.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-white font-semibold text-sm">{aiProfile.name}</h2>
              <p className="text-indigo-400 text-xs">{aiProfile.relationshipType}</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNav(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                currentView === item.view
                  ? 'bg-indigo-600/20 text-indigo-300 shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span className={currentView === item.view ? 'text-indigo-400' : ''}>{item.icon}</span>
              {item.label}
              {currentView === item.view && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer with sync status */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between">
            <SyncIndicator />
            {isAuthenticated && (
              <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{authUser?.email}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 text-center">
            Indigo AI Companion v1.1
          </p>
        </div>
      </div>
    </>
  );
};

export default Navigation;
