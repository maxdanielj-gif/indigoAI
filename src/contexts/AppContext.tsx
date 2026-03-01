import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Message, Memory, JournalEntry, GalleryImage, AIProfile, UserProfile, AppSettings,
  ViewType, DEFAULT_AI_PROFILE, DEFAULT_USER_PROFILE, DEFAULT_SETTINGS
} from '@/lib/types';
import * as db from '@/lib/db';
import { sendChatMessage, buildSystemPrompt, generateImage, generateJournalEntry, generateSelfReflection } from '@/lib/ai';
import { speak } from '@/lib/tts';
import { supabase } from '@/lib/supabase';
import {
  performSync, forcePush, forcePull, deleteCloudData,
  loadSyncState, saveSyncState, SyncState, SyncStatus, SyncResult, DEFAULT_SYNC_STATE
} from '@/lib/sync';

// ── Context Type ────────────────────────────────────────────────────

interface AppContextType {
  currentView: ViewType;
  setCurrentView: (v: ViewType) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  messages: Message[];
  sendMessage: (content: string, imageUrl?: string, fileContent?: string, fileName?: string) => Promise<void>;
  editMessage: (id: string, newContent: string) => void;
  deleteMessage: (id: string) => void;
  regenerateLastResponse: () => Promise<void>;
  clearChat: () => void;
  isLoading: boolean;

  memories: Memory[];
  addMemory: (content: string, category: Memory['category'], strength: number, isImportant: boolean) => void;
  editMemory: (id: string, updates: Partial<Memory>) => void;
  deleteMemory: (id: string) => void;
  runSelfReflection: () => Promise<void>;

  journal: JournalEntry[];
  addJournalEntry: (title: string, content: string, mood: string) => void;
  editJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  generateJournal: () => Promise<void>;

  images: GalleryImage[];
  addImage: (dataUrl: string, type: 'generated' | 'uploaded', prompt?: string, hashtags?: string[], chatContext?: string) => Promise<void>;
  deleteImages: (ids: string[]) => Promise<void>;
  updateImageHashtags: (id: string, hashtags: string[]) => Promise<void>;
  loadGalleryImages: () => Promise<void>;

  aiProfile: AIProfile;
  updateAIProfile: (updates: Partial<AIProfile>) => void;
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;

  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  exportData: () => Promise<void>;
  importData: (jsonStr: string) => Promise<void>;
  resetAllData: () => Promise<void>;

  generateCompanionImage: (prompt: string) => Promise<string | null>;
  isGeneratingImage: boolean;
  userLocation: { lat: number; lng: number } | null;

  // Auth & Sync
  authUser: { id: string; email: string } | null;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  syncState: SyncState;
  updateSyncState: (updates: Partial<SyncState>) => void;
  syncStatus: SyncStatus;
  syncProgress: string;
  triggerSync: () => Promise<SyncResult | null>;
  triggerForcePush: () => Promise<SyncResult | null>;
  triggerForcePull: () => Promise<SyncResult | null>;
  deleteAllCloudData: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  handleAuthenticated: (userId: string, email: string) => void;
  reloadAllState: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);
export const useAppContext = () => useContext(AppContext);

// ── Provider ────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [aiProfile, setAIProfile] = useState<AIProfile>(DEFAULT_AI_PROFILE);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Auth & Sync state
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [syncState, setSyncStateLocal] = useState<SyncState>(loadSyncState());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncProgress, setSyncProgress] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const memoriesRef = useRef<Memory[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { memoriesRef.current = memories; }, [memories]);

  const isAuthenticated = !!authUser;

  // ── Load local data on mount ──────────────────────────────────────

  const reloadAllState = async () => {
    setMessages(db.loadMessages());
    setMemories(db.loadMemories());
    setJournal(db.loadJournal());
    setAIProfile(db.loadAIProfile());
    setUserProfile(db.loadUserProfile());
    setSettings(db.loadSettings());
    const imgs = await db.getImages();
    setImages(imgs);
  };

  useEffect(() => { reloadAllState(); }, []);

  // ── Check existing Supabase session on mount ──────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser({ id: session.user.id, email: session.user.email || '' });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser({ id: session.user.id, email: session.user.email || '' });
      } else {
        setAuthUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Auto-save ─────────────────────────────────────────────────────

  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(() => {
      db.saveMessages(messagesRef.current);
      db.saveMemories(memoriesRef.current);
    }, settings.autoSaveInterval * 60 * 1000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [settings.autoSaveInterval]);

  // ── Save on changes ───────────────────────────────────────────────

  useEffect(() => { db.saveMessages(messages); }, [messages]);
  useEffect(() => { db.saveMemories(memories); }, [memories]);
  useEffect(() => { db.saveJournal(journal); }, [journal]);
  useEffect(() => { db.saveAIProfile(aiProfile); }, [aiProfile]);
  useEffect(() => { db.saveUserProfile(userProfile); }, [userProfile]);
  useEffect(() => { db.saveSettings(settings); }, [settings]);

  // ── Auto-sync ─────────────────────────────────────────────────────

  useEffect(() => {
    if (autoSyncRef.current) clearInterval(autoSyncRef.current);
    if (!syncState.autoSync || !syncState.enabled || !authUser || !syncState.encryptionPassphrase) return;

    // Auto-sync every 5 minutes
    autoSyncRef.current = setInterval(() => {
      triggerSync();
    }, 5 * 60 * 1000);

    return () => { if (autoSyncRef.current) clearInterval(autoSyncRef.current); };
  }, [syncState.autoSync, syncState.enabled, authUser?.id, syncState.encryptionPassphrase]);

  // ── Location ──────────────────────────────────────────────────────

  useEffect(() => {
    if (settings.locationEnabled && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
  }, [settings.locationEnabled]);

  // ── Proactive messages ────────────────────────────────────────────

  useEffect(() => {
    if (settings.proactiveFrequency === 'off' || !settings.llmApiKey) return;
    const intervals: Record<string, number> = {
      very_frequently: 15 * 60 * 1000, frequently: 30 * 60 * 1000,
      occasionally: 60 * 60 * 1000, rarely: 180 * 60 * 1000,
    };
    const interval = intervals[settings.proactiveFrequency] || 60 * 60 * 1000;
    const timer = setInterval(async () => {
      const cur = messagesRef.current;
      const last = cur[cur.length - 1];
      if (last && Date.now() - last.timestamp > interval) {
        const sp = buildSystemPrompt(aiProfile, userProfile, memoriesRef.current, settings, userLocation);
        try {
          const response = await sendChatMessage(
            [...cur, { id: 'temp', role: 'system' as const, content: `[System: Time has passed. Send ${userProfile.name} a check-in.]`, timestamp: Date.now() }],
            sp, settings
          );
          setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: response, timestamp: Date.now() }]);
          if (settings.notificationsEnabled && Notification.permission === 'granted') {
            new Notification(aiProfile.name, { body: response.slice(0, 100) });
          }
        } catch {}
      }
    }, interval);
    return () => clearInterval(timer);
  }, [settings.proactiveFrequency, settings.llmApiKey, aiProfile.name]);

  // ── Navigation ────────────────────────────────────────────────────

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const loadGalleryImages = async () => {
    const imgs = await db.getImages();
    setImages(imgs);
  };

  // ── Chat ──────────────────────────────────────────────────────────

  const sendMessageFn = async (content: string, imageUrl?: string, fileContent?: string, fileName?: string) => {
    const userMsg: Message = { id: uuidv4(), role: 'user', content, timestamp: Date.now(), imageUrl, fileContent, fileName };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const sp = buildSystemPrompt(aiProfile, userProfile, memories, settings, userLocation);
      const response = await sendChatMessage(newMessages, sp, settings);

      const imageMatch = response.match(/\[GENERATE_IMAGE:\s*(.*?)\]/);
      let generatedImageUrl: string | undefined;
      if (imageMatch) {
        setIsGeneratingImage(true);
        const imgUrl = await generateImage(imageMatch[1], aiProfile, settings);
        if (imgUrl) { generatedImageUrl = imgUrl; await addImage(imgUrl, 'generated', imageMatch[1], [], content); }
        setIsGeneratingImage(false);
      }

      const assistantMsg: Message = {
        id: uuidv4(), role: 'assistant',
        content: response.replace(/\[GENERATE_IMAGE:.*?\]/g, '').trim(),
        timestamp: Date.now(), imageUrl: generatedImageUrl, imagePrompt: imageMatch?.[1],
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (settings.tts.enabled) speak(assistantMsg.content, settings.tts);
      if (imageUrl) await addImage(imageUrl, 'uploaded', undefined, [], content);
    } catch {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: '*looks concerned* Something went wrong. Please check your settings.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const editMessage = (id: string, newContent: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: newContent, edited: true } : m));
  };
  const deleteMessage = (id: string) => setMessages(prev => prev.filter(m => m.id !== id));

  const regenerateLastResponse = async () => {
    const idx = messages.length - 1 - [...messages].reverse().findIndex(m => m.role === 'assistant');
    if (idx < 0 || idx >= messages.length) return;
    const ctx = messages.slice(0, idx);
    setMessages(ctx);
    setIsLoading(true);
    try {
      const sp = buildSystemPrompt(aiProfile, userProfile, memories, settings, userLocation);
      const r = await sendChatMessage(ctx, sp, settings);
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: r, timestamp: Date.now() }]);
      if (settings.tts.enabled) speak(r, settings.tts);
    } catch {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: 'Failed to regenerate.', timestamp: Date.now() }]);
    } finally { setIsLoading(false); }
  };

  const clearChat = () => { setMessages([]); db.clearChatHistory(); };

  // ── Memories ──────────────────────────────────────────────────────

  const addMemory = (content: string, category: Memory['category'], strength: number, isImportant: boolean) => {
    setMemories(prev => [...prev, { id: uuidv4(), content, category, strength, isImportant, isPruned: false, createdAt: Date.now(), updatedAt: Date.now() }]);
  };
  const editMemory = (id: string, updates: Partial<Memory>) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m));
  };
  const deleteMemory = (id: string) => setMemories(prev => prev.filter(m => m.id !== id));

  const runSelfReflection = async () => {
    setIsLoading(true);
    try {
      const suggestions = await generateSelfReflection(messages, memories, aiProfile, userProfile, settings);
      for (const s of suggestions) addMemory(s.memory, 'general', 5, false);
    } catch {}
    setIsLoading(false);
  };

  // ── Journal ───────────────────────────────────────────────────────

  const addJournalEntry = (title: string, content: string, mood: string) => {
    setJournal(prev => [{ id: uuidv4(), title, content, mood, createdAt: Date.now(), updatedAt: Date.now(), autoGenerated: false }, ...prev]);
  };
  const editJournalEntry = (id: string, updates: Partial<JournalEntry>) => {
    setJournal(prev => prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e));
  };
  const deleteJournalEntry = (id: string) => setJournal(prev => prev.filter(e => e.id !== id));

  const generateJournal = async () => {
    setIsLoading(true);
    try {
      const content = await generateJournalEntry(messages, aiProfile, userProfile, settings);
      setJournal(prev => [{
        id: uuidv4(), title: `${aiProfile.name}'s Journal — ${new Date().toLocaleDateString()}`,
        content, mood: 'reflective', createdAt: Date.now(), updatedAt: Date.now(), autoGenerated: true,
      }, ...prev]);
    } catch {}
    setIsLoading(false);
  };

  // ── Gallery ───────────────────────────────────────────────────────

  const addImage = async (dataUrl: string, type: 'generated' | 'uploaded', prompt?: string, hashtags?: string[], chatContext?: string) => {
    const img: GalleryImage = { id: uuidv4(), dataUrl, prompt, hashtags: hashtags || [], type, timestamp: Date.now(), chatContext };
    await db.saveImage(img);
    setImages(prev => [img, ...prev]);
  };
  const deleteImages = async (ids: string[]) => {
    for (const id of ids) await db.deleteImage(id);
    setImages(prev => prev.filter(img => !ids.includes(img.id)));
  };
  const updateImageHashtags = async (id: string, hashtags: string[]) => {
    const img = images.find(i => i.id === id);
    if (img) { const u = { ...img, hashtags }; await db.saveImage(u); setImages(prev => prev.map(i => i.id === id ? u : i)); }
  };

  // ── Profiles & Settings ───────────────────────────────────────────

  const updateAIProfile = (updates: Partial<AIProfile>) => setAIProfile(prev => ({ ...prev, ...updates }));
  const updateUserProfile = (updates: Partial<UserProfile>) => setUserProfile(prev => ({ ...prev, ...updates }));
  const updateSettings = (updates: Partial<AppSettings>) => setSettings(prev => ({ ...prev, ...updates }));

  // ── Import / Export / Reset ───────────────────────────────────────

  const exportData = async () => {
    const jsonStr = await db.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = db.generateBackupFilename(); a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (jsonStr: string) => {
    await db.importAllData(jsonStr);
    await reloadAllState();
  };

  const resetAllDataFn = async () => {
    await db.resetAllData();
    setMessages([]); setMemories([]); setJournal([]); setImages([]);
    setAIProfile(DEFAULT_AI_PROFILE); setUserProfile(DEFAULT_USER_PROFILE); setSettings(DEFAULT_SETTINGS);
  };

  const generateCompanionImage = async (prompt: string): Promise<string | null> => {
    setIsGeneratingImage(true);
    try {
      const url = await generateImage(prompt, aiProfile, settings);
      if (url) await addImage(url, 'generated', prompt, [], 'Manual generation');
      return url;
    } finally { setIsGeneratingImage(false); }
  };

  // ── Auth ──────────────────────────────────────────────────────────

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    const newState = { ...syncState, enabled: false };
    setSyncStateLocal(newState);
    saveSyncState(newState);
  };

  const handleAuthenticated = (userId: string, email: string) => {
    setAuthUser({ id: userId, email });
    setShowAuthModal(false);
  };

  // ── Sync ──────────────────────────────────────────────────────────

  const updateSyncState = (updates: Partial<SyncState>) => {
    setSyncStateLocal(prev => {
      const next = { ...prev, ...updates };
      saveSyncState(next);
      return next;
    });
  };

  const triggerSync = async (): Promise<SyncResult | null> => {
    if (!authUser || !syncState.encryptionPassphrase) return null;
    setSyncStatus('syncing');
    setSyncProgress('Starting sync...');
    try {
      const result = await performSync(authUser.id, syncState.encryptionPassphrase, (msg) => setSyncProgress(msg));
      setSyncStatus(result.status);
      setSyncProgress(result.message);
      if (result.status === 'success') await reloadAllState();
      setTimeout(() => { setSyncStatus('idle'); setSyncProgress(''); }, 4000);
      return result;
    } catch (err: any) {
      setSyncStatus('error');
      setSyncProgress(err.message || 'Sync failed');
      setTimeout(() => { setSyncStatus('idle'); setSyncProgress(''); }, 5000);
      return null;
    }
  };

  const triggerForcePush = async (): Promise<SyncResult | null> => {
    if (!authUser || !syncState.encryptionPassphrase) return null;
    setSyncStatus('syncing');
    try {
      const result = await forcePush(authUser.id, syncState.encryptionPassphrase, (msg) => setSyncProgress(msg));
      setSyncStatus(result.status);
      setSyncProgress(result.message);
      setTimeout(() => { setSyncStatus('idle'); setSyncProgress(''); }, 4000);
      return result;
    } catch (err: any) {
      setSyncStatus('error'); setSyncProgress(err.message);
      setTimeout(() => { setSyncStatus('idle'); setSyncProgress(''); }, 5000);
      return null;
    }
  };

  const triggerForcePull = async (): Promise<SyncResult | null> => {
    if (!authUser || !syncState.encryptionPassphrase) return null;
    setSyncStatus('syncing');
    try {
      const result = await forcePull(authUser.id, syncState.encryptionPassphrase, (msg) => setSyncProgress(msg));
      setSyncStatus(result.status);
      setSyncProgress(result.message);
      if (result.status === 'success') await reloadAllState();
      setTimeout(() => { setSyncStatus('idle'); setSyncProgress(''); }, 4000);
      return result;
    } catch (err: any) {
      setSyncStatus('error'); setSyncProgress(err.message);
      setTimeout(() => { setSyncStatus('idle'); setSyncProgress(''); }, 5000);
      return null;
    }
  };

  const deleteAllCloudData = async () => {
    if (!authUser) return;
    await deleteCloudData(authUser.id);
    updateSyncState({ lastSyncAt: 0 });
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView, sidebarOpen, toggleSidebar,
      messages, sendMessage: sendMessageFn, editMessage, deleteMessage, regenerateLastResponse, clearChat, isLoading,
      memories, addMemory, editMemory, deleteMemory, runSelfReflection,
      journal, addJournalEntry, editJournalEntry, deleteJournalEntry, generateJournal,
      images, addImage, deleteImages, updateImageHashtags, loadGalleryImages,
      aiProfile, updateAIProfile, userProfile, updateUserProfile,
      settings, updateSettings,
      exportData, importData, resetAllData: resetAllDataFn,
      generateCompanionImage, isGeneratingImage, userLocation,
      authUser, isAuthenticated, signOut,
      syncState, updateSyncState, syncStatus, syncProgress,
      triggerSync, triggerForcePush, triggerForcePull, deleteAllCloudData,
      showAuthModal, setShowAuthModal, handleAuthenticated, reloadAllState,
    }}>
      {children}
    </AppContext.Provider>
  );
};
