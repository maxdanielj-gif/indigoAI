import React, { useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import Navigation from './Navigation';
import ChatView from './ChatView';
import GalleryView from './GalleryView';
import SettingsView from './SettingsView';
import MemoryView from './MemoryView';
import JournalView from './JournalView';
import AIProfileView from './AIProfileView';
import UserProfileView from './UserProfileView';
import AuthModal from './AuthModal';

const AppLayout: React.FC = () => {
  const { currentView, showAuthModal, setShowAuthModal, handleAuthenticated } = useAppContext();

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'chat': return <ChatView />;
      case 'gallery': return <GalleryView />;
      case 'settings': return <SettingsView />;
      case 'memory': return <MemoryView />;
      case 'journal': return <JournalView />;
      case 'ai-profile': return <AIProfileView />;
      case 'user-profile': return <UserProfileView />;
      default: return <ChatView />;
    }
  };

  return (
    <div
      className="w-screen overflow-hidden bg-slate-950 flex flex-col safe-top safe-bottom"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <Navigation />
      <div className="flex-1 overflow-hidden">
        {renderView()}
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
};

export default AppLayout;
