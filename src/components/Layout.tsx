import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, User, Brain, Image as ImageIcon, Book, Settings, Camera, Menu, X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ToastContainer from './ToastContainer';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/ai-profile', icon: Brain, label: 'AI Persona' },
    { path: '/user-profile', icon: User, label: 'User Profile' },
    { path: '/memory', icon: Book, label: 'Memory' },
    { path: '/gallery', icon: ImageIcon, label: 'Gallery' },
    { path: '/image-generator', icon: Camera, label: 'Generate Image' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      <ToastContainer />
      {/* Header with Hamburger */}
      <header className="bg-indigo-600 text-white p-4 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center space-x-3">
          <button onClick={toggleMenu} className="p-2 rounded-md hover:bg-indigo-700 focus:outline-none">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-xl font-bold tracking-wide lowercase">indigo AI</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Navigation Drawer (Hamburger Menu) */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="absolute inset-0 bg-black z-10"
              />
              
              {/* Drawer */}
              <motion.nav
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute top-0 left-0 bottom-0 w-64 bg-white shadow-xl z-20 flex flex-col border-r border-gray-200"
              >
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-indigo-600 lowercase">indigo AI</h2>
                  <p className="text-sm text-gray-500 mt-1">Your personal companion</p>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center px-6 py-3 transition-colors ${
                        location.pathname === item.path
                          ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 mr-3 ${location.pathname === item.path ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-100 text-xs text-center text-gray-400">
                  v1.0.0
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6 w-full">
          <div className="w-full mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
