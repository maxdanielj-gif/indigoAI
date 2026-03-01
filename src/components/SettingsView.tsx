import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { getEnglishVoices } from '@/lib/tts';
import {
  Menu, Download, Upload, Trash2, AlertTriangle, Volume2, Key, Image as ImageIcon,
  MessageSquare, Bell, MapPin, Clock, FileJson, RotateCcw, Loader2,
  ChevronDown, ChevronUp, Eye, EyeOff, Cloud,
  RefreshCw, ArrowUpFromLine, ArrowDownToLine, Shield, LogOut, LogIn,
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';


const SettingsView: React.FC = () => {
  const {
    settings, updateSettings, exportData, importData, resetAllData, clearChat,
    toggleSidebar, aiProfile,
    authUser, isAuthenticated, signOut, setShowAuthModal,
    syncState, updateSyncState, syncStatus, syncProgress,
    triggerSync, triggerForcePush, triggerForcePull, deleteAllCloudData,
  } = useAppContext();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmCloudDelete, setConfirmCloudDelete] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('sync');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadVoices = () => setVoices(getEnglishVoices());
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try { const text = await file.text(); await importData(text); alert('Data imported successfully!'); }
    catch { alert('Failed to import data.'); }
    setImporting(false);
    e.target.value = '';
  };

  const handleReset = async () => {
    if (confirmReset) { await resetAllData(); setConfirmReset(false); alert('All data has been reset.'); window.location.reload(); }
    else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 5000); }
  };

  const handleNotifications = async () => {
    if (!settings.notificationsEnabled) {
      const perm = await Notification.requestPermission();
      updateSettings({ notificationsEnabled: perm === 'granted' });
    } else updateSettings({ notificationsEnabled: false });
  };

  const handleLocation = () => {
    if (!settings.locationEnabled) {
      navigator.geolocation?.getCurrentPosition(() => updateSettings({ locationEnabled: true }), () => alert('Location permission denied'));
    } else updateSettings({ locationEnabled: false });
  };

  const handleCloudDelete = async () => {
    if (confirmCloudDelete) { await deleteAllCloudData(); setConfirmCloudDelete(false); alert('Cloud data deleted.'); }
    else { setConfirmCloudDelete(true); setTimeout(() => setConfirmCloudDelete(false), 5000); }
  };

  const syncReady = isAuthenticated && syncState.enabled && !!syncState.encryptionPassphrase;

  const SyncStatusBadge = () => {
    if (syncStatus === 'syncing') return <span className="flex items-center gap-1 text-[10px] text-indigo-300"><Loader2 size={10} className="animate-spin" />Syncing</span>;
    if (syncStatus === 'success') return <span className="flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 size={10} />Synced</span>;
    if (syncStatus === 'error') return <span className="flex items-center gap-1 text-[10px] text-red-300"><XCircle size={10} />Error</span>;
    return null;
  };

  const Section: React.FC<{ id: string; title: string; icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode }> = ({ id, title, icon, badge, children }) => {
    const isOpen = expandedSection === id;
    return (
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/30 overflow-hidden">
        <button onClick={() => setExpandedSection(isOpen ? null : id)} className="w-full flex items-center gap-3 p-4 text-left">
          <span className="text-indigo-400">{icon}</span>
          <span className="text-sm font-medium text-white flex-1">{title}</span>
          {badge}
          {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </button>
        {isOpen && <div className="px-4 pb-4 space-y-4 border-t border-slate-700/20 pt-3">{children}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800/50 shrink-0">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"><Menu size={22} /></button>
        <h1 className="text-white font-semibold flex-1">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── Cloud Sync ─────────────────────────────────────────── */}
        <Section id="sync" title="Cloud Sync" icon={<Cloud size={18} />} badge={<SyncStatusBadge />}>
          {/* Account */}
          {!isAuthenticated ? (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-950/40 rounded-lg border border-indigo-800/30">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Create a free account to sync your companion data across devices. All data is encrypted end-to-end — we never see your messages.
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <LogIn size={16} />
                Sign In / Create Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account info */}
              <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                  {authUser!.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{authUser!.email}</p>
                  <p className="text-[10px] text-slate-500">
                    {syncState.lastSyncAt ? `Last sync: ${new Date(syncState.lastSyncAt).toLocaleString()}` : 'Never synced'}
                  </p>
                </div>
                <button onClick={signOut} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400" title="Sign out">
                  <LogOut size={14} />
                </button>
              </div>

              {/* Enable sync toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-300 block">Enable Cloud Sync</span>
                  <span className="text-[10px] text-slate-500">Backup data to the cloud</span>
                </div>
                <button
                  onClick={() => updateSyncState({ enabled: !syncState.enabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${syncState.enabled ? 'bg-indigo-600' : 'bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${syncState.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {syncState.enabled && (
                <>
                  {/* Encryption passphrase */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                      <Shield size={12} className="text-indigo-400" />
                      Encryption Passphrase
                    </label>
                    <div className="relative">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={syncState.encryptionPassphrase}
                        onChange={(e) => updateSyncState({ encryptionPassphrase: e.target.value })}
                        className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 pr-10 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                        placeholder="Enter a strong passphrase..."
                      />
                      <button onClick={() => setShowPassphrase(!showPassphrase)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showPassphrase ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-400/80 mt-1 flex items-start gap-1">
                      <AlertCircle size={10} className="mt-0.5 shrink-0" />
                      Remember this passphrase! It cannot be recovered. You need it on every device.
                    </p>
                  </div>

                  {/* Auto-sync toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-300 block">Auto-sync</span>
                      <span className="text-[10px] text-slate-500">Sync every 5 minutes</span>
                    </div>
                    <button
                      onClick={() => updateSyncState({ autoSync: !syncState.autoSync })}
                      className={`w-11 h-6 rounded-full transition-colors relative ${syncState.autoSync ? 'bg-indigo-600' : 'bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${syncState.autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Sync progress */}
                  {syncProgress && (
                    <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      syncStatus === 'error' ? 'bg-red-600/10 border border-red-600/20 text-red-300' :
                      syncStatus === 'success' ? 'bg-emerald-600/10 border border-emerald-600/20 text-emerald-300' :
                      'bg-indigo-600/10 border border-indigo-600/20 text-indigo-300'
                    }`}>
                      {syncStatus === 'syncing' && <Loader2 size={12} className="animate-spin shrink-0" />}
                      {syncStatus === 'success' && <CheckCircle2 size={12} className="shrink-0" />}
                      {syncStatus === 'error' && <XCircle size={12} className="shrink-0" />}
                      <span className="truncate">{syncProgress}</span>
                    </div>
                  )}

                  {/* Sync buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={triggerSync}
                      disabled={!syncReady || syncStatus === 'syncing'}
                      className="flex flex-col items-center gap-1.5 py-3 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-40 text-indigo-300 text-[10px] rounded-lg font-medium transition-colors"
                    >
                      {syncStatus === 'syncing' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Sync Now
                    </button>
                    <button
                      onClick={triggerForcePush}
                      disabled={!syncReady || syncStatus === 'syncing'}
                      className="flex flex-col items-center gap-1.5 py-3 bg-violet-600/20 hover:bg-violet-600/30 disabled:opacity-40 text-violet-300 text-[10px] rounded-lg font-medium transition-colors"
                    >
                      <ArrowUpFromLine size={16} />
                      Force Push
                    </button>
                    <button
                      onClick={triggerForcePull}
                      disabled={!syncReady || syncStatus === 'syncing'}
                      className="flex flex-col items-center gap-1.5 py-3 bg-cyan-600/20 hover:bg-cyan-600/30 disabled:opacity-40 text-cyan-300 text-[10px] rounded-lg font-medium transition-colors"
                    >
                      <ArrowDownToLine size={16} />
                      Force Pull
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    <strong>Sync Now:</strong> Smart merge (newer wins). <strong>Force Push:</strong> Overwrite cloud with local data. <strong>Force Pull:</strong> Overwrite local with cloud data.
                  </p>

                  {/* Delete cloud data */}
                  <button
                    onClick={handleCloudDelete}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      confirmCloudDelete ? 'bg-red-600 text-white animate-pulse' : 'bg-red-600/10 hover:bg-red-600/20 text-red-400'
                    }`}
                  >
                    <Trash2 size={12} />
                    {confirmCloudDelete ? 'Tap Again to Delete Cloud Data' : 'Delete Cloud Data'}
                  </button>
                </>
              )}
            </div>
          )}
        </Section>

        {/* ── API Configuration ──────────────────────────────────── */}
        <Section id="api" title="API Configuration" icon={<Key size={18} />}>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">LLM API URL</label>
            <input value={settings.llmApiUrl} onChange={(e) => updateSettings({ llmApiUrl: e.target.value })}
              className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-600 focus:border-indigo-500 focus:outline-none"
              placeholder="https://openrouter.ai/api/v1/chat/completions" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">LLM API Key</label>
            <div className="relative">
              <input type={showApiKey ? 'text' : 'password'} value={settings.llmApiKey} onChange={(e) => updateSettings({ llmApiKey: e.target.value })}
                className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 pr-10 border border-slate-600 focus:border-indigo-500 focus:outline-none" placeholder="sk-..." />
              <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">LLM Model</label>
            <input value={settings.llmModel} onChange={(e) => updateSettings({ llmModel: e.target.value })}
              className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-600 focus:border-indigo-500 focus:outline-none" placeholder="anthropic/claude-3.5-sonnet" />
          </div>
          <div className="border-t border-slate-700/20 pt-3">
            <label className="text-xs text-slate-400 mb-1 block">Image API URL</label>
            <input value={settings.imageApiUrl} onChange={(e) => updateSettings({ imageApiUrl: e.target.value })}
              className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-600 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Image API Key</label>
            <div className="relative">
              <input type={showImageKey ? 'text' : 'password'} value={settings.imageApiKey} onChange={(e) => updateSettings({ imageApiKey: e.target.value })}
                className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 pr-10 border border-slate-600 focus:border-indigo-500 focus:outline-none" placeholder="sk-..." />
              <button onClick={() => setShowImageKey(!showImageKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showImageKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Image Model</label>
            <input value={settings.imageModel} onChange={(e) => updateSettings({ imageModel: e.target.value })}
              className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-600 focus:border-indigo-500 focus:outline-none" placeholder="dall-e-3" />
          </div>
        </Section>

        {/* ── Response Settings ───────────────────────────────────── */}
        <Section id="response" title="Response Settings" icon={<MessageSquare size={18} />}>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Response Length: {settings.responseLength} paragraph(s)</label>
            <input type="range" min={1} max={5} value={settings.responseLength} onChange={(e) => updateSettings({ responseLength: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
            <div className="flex justify-between text-[10px] text-slate-500"><span>Brief</span><span>Detailed</span></div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Response Style</label>
            <select value={settings.responseStyle} onChange={(e) => updateSettings({ responseStyle: e.target.value })}
              className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none">
              <option value="balanced">Balanced</option>
              <option value="creative">Creative & Expressive</option>
              <option value="concise">Concise & Direct</option>
              <option value="detailed">Detailed & Descriptive</option>
              <option value="casual">Casual & Relaxed</option>
              <option value="formal">Formal & Polished</option>
            </select>
          </div>
        </Section>

        {/* ── Image Style ────────────────────────────────────────── */}
        <Section id="image" title="Image Generation" icon={<ImageIcon size={18} />}>
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Image Style</label>
            <div className="flex gap-2">
              {(['photograph', 'anime', 'no_style'] as const).map(style => (
                <button key={style} onClick={() => updateSettings({ imageStyle: style })}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${settings.imageStyle === style ? 'bg-indigo-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}>
                  {style === 'no_style' ? 'No Style' : style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── TTS ────────────────────────────────────────────────── */}
        <Section id="tts" title="Text-to-Speech" icon={<Volume2 size={18} />}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Enable TTS</span>
            <button onClick={() => updateSettings({ tts: { ...settings.tts, enabled: !settings.tts.enabled } })}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.tts.enabled ? 'bg-indigo-600' : 'bg-slate-600'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.tts.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {settings.tts.enabled && (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Voice</label>
                <select value={settings.tts.voice} onChange={(e) => updateSettings({ tts: { ...settings.tts, voice: e.target.value } })}
                  className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none">
                  <option value="">Auto-select</option>
                  {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Speed: {settings.tts.rate.toFixed(1)}x</label>
                <input type="range" min={0.5} max={2} step={0.1} value={settings.tts.rate} onChange={(e) => updateSettings({ tts: { ...settings.tts, rate: parseFloat(e.target.value) } })} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Pitch: {settings.tts.pitch.toFixed(1)}</label>
                <input type="range" min={0.5} max={2} step={0.1} value={settings.tts.pitch} onChange={(e) => updateSettings({ tts: { ...settings.tts, pitch: parseFloat(e.target.value) } })} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Volume: {Math.round(settings.tts.volume * 100)}%</label>
                <input type="range" min={0} max={1} step={0.1} value={settings.tts.volume} onChange={(e) => updateSettings({ tts: { ...settings.tts, volume: parseFloat(e.target.value) } })} className="w-full accent-indigo-500" />
              </div>
            </>
          )}
        </Section>

        {/* ── Proactive Messages ──────────────────────────────────── */}
        <Section id="proactive" title="Proactive Messages" icon={<Bell size={18} />}>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Check-in Frequency</label>
            <select value={settings.proactiveFrequency} onChange={(e) => updateSettings({ proactiveFrequency: e.target.value as any })}
              className="w-full bg-slate-700/50 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-600 focus:outline-none">
              <option value="very_frequently">Very Frequently (~15 min)</option>
              <option value="frequently">Frequently (~30 min)</option>
              <option value="occasionally">Occasionally (~1 hour)</option>
              <option value="rarely">Rarely (~3 hours)</option>
              <option value="off">Off</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Browser Notifications</span>
            <button onClick={handleNotifications} className={`w-11 h-6 rounded-full transition-colors relative ${settings.notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-600'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </Section>

        {/* ── Auto-save ──────────────────────────────────────────── */}
        <Section id="autosave" title="Auto-save & Backup" icon={<Clock size={18} />}>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Auto-save Interval: {settings.autoSaveInterval} min</label>
            <input type="range" min={1} max={30} value={settings.autoSaveInterval} onChange={(e) => updateSettings({ autoSaveInterval: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Auto-backup Interval: {settings.autoBackupInterval} min</label>
            <input type="range" min={15} max={240} step={15} value={settings.autoBackupInterval} onChange={(e) => updateSettings({ autoBackupInterval: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
          </div>
        </Section>

        {/* ── Location ───────────────────────────────────────────── */}
        <Section id="location" title="Location Awareness" icon={<MapPin size={18} />}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300 block">Share Location</span>
              <span className="text-[10px] text-slate-500">Helps {aiProfile.name} make location-aware suggestions</span>
            </div>
            <button onClick={handleLocation} className={`w-11 h-6 rounded-full transition-colors relative ${settings.locationEnabled ? 'bg-indigo-600' : 'bg-slate-600'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.locationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </Section>

        {/* ── Data Management ────────────────────────────────────── */}
        <Section id="data" title="Data Management" icon={<FileJson size={18} />}>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportData} className="flex items-center justify-center gap-2 py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs rounded-lg font-medium transition-colors">
              <Download size={14} /> Export All
            </button>
            <button onClick={() => importRef.current?.click()} disabled={importing}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs rounded-lg font-medium transition-colors disabled:opacity-50">
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import
            </button>
          </div>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button onClick={clearChat} className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 text-xs rounded-lg font-medium transition-colors">
            <RotateCcw size={14} /> Clear Chat History
          </button>
          <button onClick={handleReset}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-medium transition-all ${confirmReset ? 'bg-red-600 text-white animate-pulse' : 'bg-red-600/10 hover:bg-red-600/20 text-red-400'}`}>
            <AlertTriangle size={14} /> {confirmReset ? 'Tap Again to Confirm Reset' : 'Reset All Data'}
          </button>
          {confirmReset && <p className="text-[10px] text-red-400 text-center">This will delete ALL data. This cannot be undone.</p>}
        </Section>
      </div>
    </div>
  );
};

export default SettingsView;
