import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { requestNotificationPermission, showNativeNotification } from '../services/firebaseService';
import { Download, Upload, Trash2, Bell, FileText, File, Key, HelpCircle, Save, Database, MapPin, Copy, Smartphone, Cloud, RefreshCw, LogOut, Clock } from 'lucide-react';

const SettingsScreen: React.FC = () => {
  const { 
    importData, knowledgeBase, addToKnowledgeBase, apiKey, setApiKey, 
    setShowTutorial, autoSaveChat, setAutoSaveChat, autoSaveChatInterval, 
    setAutoSaveChatInterval, autoJsonBackup, setAutoJsonBackup, 
    autoJsonBackupInterval, setAutoJsonBackupInterval, resetApp, chatHistory, 
    isGoogleDriveConnected, setIsGoogleDriveConnected, autoDriveBackup, 
    setAutoDriveBackup, proactiveMessageFrequency, setProactiveMessageFrequency,
    aiProfile, userProfile, notificationsEnabled, setNotificationsEnabled,
    addChatMessage, fcmToken, setFcmToken, exportData, addToast,
    showTimestamps, setShowTimestamps, timeZone, setTimeZone
  } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kbInputRef = useRef<HTMLInputElement>(null);
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);

  const handleGoogleDriveConnect = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (e) {
      console.error("Failed to get Google OAuth URL", e);
    }
  };

  const handleGoogleDriveDisconnect = async () => {
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setIsGoogleDriveConnected(false);
      setDriveFiles([]);
    } catch (e) {
      console.error("Failed to logout from Google Drive", e);
    }
  };

  const fetchDriveFiles = async () => {
    setIsFetchingDrive(true);
    try {
      const res = await fetch('/api/drive/files');
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      }
    } catch (e) {
      console.error("Failed to fetch drive files", e);
    } finally {
      setIsFetchingDrive(false);
    }
  };

  const importFromDrive = async (fileId: string) => {
    try {
      const res = await fetch(`/api/drive/file/${fileId}`);
      if (res.ok) {
        const { name, content } = await res.json();
        addToKnowledgeBase({ name, content });
        addToast({ title: "Import Successful", message: `Imported ${name} from Google Drive!`, type: "success" });
      }
    } catch (e) {
      console.error("Failed to import file from drive", e);
    }
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'google') {
        setIsGoogleDriveConnected(true);
        fetchDriveFiles();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  React.useEffect(() => {
    if (isGoogleDriveConnected) {
      fetchDriveFiles();
    }
  }, [isGoogleDriveConnected]);

  // Browser Integration Handlers (moved from ChatScreen)
  const handleLocation = () => {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
            addToast({ title: "Location", message: `Current location: ${position.coords.latitude}, ${position.coords.longitude}`, type: "info" });
        }, (error) => {
            addToast({ title: "Location Error", message: error.message, type: "error" });
        });
    } else {
        addToast({ title: "Not Supported", message: "Geolocation is not supported by this browser.", type: "warning" });
    }
  };

  const handleClipboardCopy = () => {
    // This will copy the entire app's exported data to clipboard for easy sharing/backup
    exportData().then(data => {
      navigator.clipboard.writeText(data).then(() => {
        addToast({ title: "Copied", message: "All app data copied to clipboard!", type: "success" });
      });
    });
  };

  const handleNotificationTest = () => {
    const title = "Browser Integration";
    const body = "Notifications are working!";
    
    addToast({ title, message: body, type: "info" });
    showNativeNotification(title, { body });
  };

  const handleDownloadChat = () => {
    // This will download the *entire* chat history from AppContext
    const text = chatHistory.map(m => `${new Date(m.timestamp).toLocaleString()} - ${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `full_chat_history_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleStorageCheck = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage, quota } = await navigator.storage.estimate();
        const usageMB = (usage ? usage / 1024 / 1024 : 0).toFixed(2);
        const quotaMB = (quota ? quota / 1024 / 1024 : 0).toFixed(2);
        addToast({ title: "Storage Usage", message: `${usageMB} MB of ${quotaMB} MB used.`, type: "info" });
    } else {
        addToast({ title: "Not Supported", message: "Storage estimation not supported.", type: "warning" });
    }
  };

  const handleSaveApiKey = () => {
      setApiKey(localApiKey.trim() || null);
      addToast({ title: "Saved", message: "API Key saved successfully!", type: "success" });
  };

  const handleEnablePushNotifications = async () => {
    const result = await requestNotificationPermission();
    if (result.success && result.token) {
      setFcmToken(result.token);
      addToast({
        title: "Push Notifications",
        message: result.message,
        type: "success"
      });
    } else {
      addToast({
        title: "Push Notifications",
        message: result.message,
        type: "error"
      });
    }
  };

  const handleNotificationToggle = async () => {
    if (typeof Notification === 'undefined') {
      addToast({ title: "Not Supported", message: "Notifications are not supported in this browser.", type: "warning" });
      return;
    }

    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);

    if (nextState) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          addToast({ 
            title: "Permission Required", 
            message: `Notification permission is currently "${permission}". You may need to enable notifications in your browser settings for desktop alerts.`, 
            type: "warning" 
          });
        } else {
          addToast({ title: "Enabled", message: "Notifications enabled!", type: "success" });
        }
      } catch (e) {
        console.error("Error requesting notification permission:", e);
        addToast({
          title: "Permission Blocked",
          message: "Could not request notification permission. It might be blocked by your browser or environment. In-app notifications will still work.",
          type: "warning"
        });
      }
    } else {
      addToast({
        title: "Notifications",
        message: "Notifications are disabled in-app settings.",
        type: "warning"
      });
    }
  };

  const [isTestingProactive, setIsTestingProactive] = useState(false);

  const handleTestProactiveMessage = async () => {
    const hasNotificationSupport = typeof Notification !== 'undefined';
    
    if (hasNotificationSupport && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    setIsTestingProactive(true);
    addToast({ title: "Proactive Message", message: "Generating message and sending push...", type: "info" });

    try {
      const res = await fetch('/api/proactive-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory: chatHistory.slice(-5),
          aiProfile,
          userProfile,
          apiKey: apiKey || undefined,
          fcmToken: fcmToken || undefined,
        }),
      });

        if (res.ok) {
          // The message is handled by the FCM listener (onForegroundMessage) 
          // in AppContext.tsx, so we don't need to manually add it here.
          // This avoids the "double message" issue.
          console.log("Proactive message generated and sent via FCM.");
        } else {
        const err = await res.json();
        console.error("Failed to generate test proactive message:", err);
        const displayError = err.source ? `${err.error} (Source: ${err.source})` : (err.error || 'Unknown error');
        addToast({
          title: "AI Error",
          message: displayError,
          type: 'error'
        });
      }
    } catch (e: any) {
      console.error("Error sending test proactive message:", e);
      addToast({
        title: "Error",
        message: `Error sending test proactive message: ${e.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsTestingProactive(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `indigo-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Export failed:", error);
      addToast({ title: "Export Failed", message: "Failed to export data.", type: "error" });
    }
  };

  const handleTestNotification = async () => {
    if (!fcmToken) {
      addToast({ title: "No Token", message: "Please enable push notifications first to get a token.", type: "warning" });
      return;
    }

    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: fcmToken,
          title: "Indigo Test",
          body: "This is a test push notification!"
        }),
      });

      if (res.ok) {
        addToast({ title: "Test Sent", message: "Test notification request sent to server.", type: "success" });
      } else {
        const error = await res.json();
        const errorMessage = error.detail ? `${error.error} (${error.detail})` : (error.error || "Failed to send test notification.");
        addToast({ title: "Test Failed", message: errorMessage, type: "error" });
      }
    } catch (e) {
      console.error("Error sending test notification:", e);
      addToast({ title: "Error", message: "An error occurred while testing notifications.", type: "error" });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          importData(event.target.result as string);
          addToast({ title: "Import Successful", message: "Data imported successfully!", type: "success" });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleKBUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        if (file.type === 'application/pdf') {
            reader.onloadend = () => {
                // For PDF, we just store the name and a placeholder content for now, 
                // as we can't extract text easily in browser without heavy libs.
                // In a real app, we'd send this to a backend or use pdf.js
                // For this demo, we'll mark it so the user knows it's added.
                addToKnowledgeBase({ 
                    name: file.name, 
                    content: `[PDF File: ${file.name}] (Content not extracted in browser preview)` 
                });
                addToast({ title: "Knowledge Base", message: `Added ${file.name} to Knowledge Base.`, type: "success" });
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.rtf')) {
            reader.onloadend = () => {
                const content = reader.result as string;
                addToKnowledgeBase({ name: file.name, content });
                addToast({ title: "Knowledge Base", message: `Added ${file.name} to Knowledge Base.`, type: "success" });
            };
            reader.readAsText(file);
        } else {
            addToast({ title: "Not Supported", message: `File type not supported: ${file.name}`, type: "warning" });
        }
    }
  };

  const handleManualDriveBackup = async () => {
    addToast({ title: "Google Drive Backup", message: "Initiating manual backup to Google Drive...", type: "info" });
    try {
      const data = await exportData();
      const filename = `indigo-ai-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: data }),
      });

      if (res.ok) {
        addToast({ title: "Backup Successful", message: "App data successfully backed up to Google Drive!", type: "success" });
      } else {
        const error = await res.json();
        addToast({ title: "Backup Failed", message: `Failed to backup to Google Drive: ${error.error || 'Unknown error'}`, type: "error" });
      }
    } catch (e: any) {
      console.error("Manual Google Drive backup failed:", e);
      addToast({ title: "Backup Failed", message: `Failed to backup to Google Drive: ${e.message || 'Unknown error'}`, type: "error" });
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-indigo-600">Settings</h2>
      
      <div className="space-y-8">
        {/* API Key Management */}
        <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">API Configuration</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key (Optional)</label>
                    <div className="flex space-x-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Key className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={localApiKey}
                                onChange={(e) => setLocalApiKey(e.target.value)}
                                className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter your Gemini API Key"
                            />
                        </div>
                        <button
                            onClick={handleSaveApiKey}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            Save Key
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Leave empty to use the default system key. Providing your own key allows for higher rate limits and custom usage.
                    </p>
                </div>
            </div>
        </section>

        {/* Knowledge Base Management */}
        <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Knowledge Base</h3>
            <div className="mb-4">
                <button
                    onClick={() => kbInputRef.current?.click()}
                    className="flex items-center justify-center w-full p-4 border-2 border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-indigo-600"
                >
                    <Upload className="w-5 h-5 mr-2" />
                    <span className="font-medium">Upload Documents to Knowledge Base</span>
                </button>
                <input 
                    type="file" 
                    ref={kbInputRef} 
                    onChange={handleKBUpload} 
                    accept=".txt,.md,.pdf,.rtf,.json,.csv,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.h,.hpp,.go,.rb,.php,.swift,.kt,.sql,.yml,.yaml,.toml,.ini,.log"
                    multiple
                    className="hidden" 
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Supported formats: .txt, .md, .rtf, .pdf (metadata only), .json, .csv, .xml, .html, .css, .js, .ts, .tsx, .jsx, .py, .java, .c, .cpp, .h, .hpp, .go, .rb, .php, .swift, .kt, .sql, .yml, .yaml, .toml, .ini, .log
                </p>
            </div>
            
            {knowledgeBase.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Indexed Files ({knowledgeBase.length})</h4>
                    <ul className="space-y-2">
                        {knowledgeBase.map((file, idx) => (
                            <li key={idx} className="flex items-center text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                                <FileText className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="truncate flex-1">{file.name}</span>
                                <span className="text-xs text-gray-400 ml-2">
                                    {file.content.length > 100 ? `${Math.round(file.content.length / 1024)} KB` : `${file.content.length} B`}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>

        {/* Cloud Integration */}
        <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Cloud Integration</h3>
            {!isGoogleDriveConnected ? (
                <div className="space-y-4">
                    <button
                        onClick={handleGoogleDriveConnect}
                        className="flex items-center justify-center w-full p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Cloud className="w-5 h-5 mr-2 text-blue-600" />
                        <span className="text-gray-700 font-medium">Connect Google Drive</span>
                    </button>
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">1. Authorized JavaScript Origin:</p>
                            <code className="text-[10px] break-all text-indigo-600 bg-white p-1 rounded border border-gray-100 block">
                                {window.location.origin}
                            </code>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">2. Authorized Redirect URI:</p>
                            <code className="text-[10px] break-all text-indigo-600 bg-white p-1 rounded border border-gray-100 block">
                                {window.location.origin}/auth/google/callback
                            </code>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                            In Google Cloud Console, add <span className="font-mono font-bold">#1</span> to "Authorized JavaScript origins" and <span className="font-mono font-bold">#2</span> to "Authorized redirect URIs".
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center">
                            <Cloud className="w-5 h-5 text-blue-600 mr-3" />
                            <div>
                                <span className="text-blue-800 font-medium block">Google Drive Connected</span>
                                <span className="text-xs text-blue-600">You can now import documents directly.</span>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button 
                                onClick={fetchDriveFiles}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                title="Refresh Files"
                            >
                                <RefreshCw className={`w-4 h-4 ${isFetchingDrive ? 'animate-spin' : ''}`} />
                            </button>
                            <button 
                                onClick={handleManualDriveBackup}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                title="Backup Now"
                            >
                                <Cloud className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={handleGoogleDriveDisconnect}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                title="Disconnect"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {driveFiles.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Drive Files</h4>
                            <div className="space-y-2">
                                {driveFiles.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 text-sm">
                                        <div className="flex items-center truncate flex-1 mr-2">
                                            <File className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="truncate">{file.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => importFromDrive(file.id)}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                        >
                                            Import
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>

        {/* Data Management */}
        <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Data Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={handleExport}
                    className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <Download className="w-5 h-5 mr-2 text-indigo-600" />
                    <span className="text-gray-700">Export Data (JSON)</span>
                </button>
                
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <Upload className="w-5 h-5 mr-2 text-indigo-600" />
                    <span className="text-gray-700">Import Data (JSON)</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImport} 
                    accept=".json" 
                    className="hidden" 
                />
            </div>
            <p className="text-xs text-gray-500 mt-2">
                Export your chat history, profiles, and gallery to a JSON file for backup or transfer.
            </p>
        </section>

        {/* App Preferences */}
        <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Preferences</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Save className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                            <span className="text-gray-700 block">Auto-Save Chat History</span>
                            <span className="text-xs text-gray-500">Automatically save chat history. Set to 0 to disable interval saving.</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="number"
                            min="0"
                            value={autoSaveChatInterval}
                            onChange={(e) => setAutoSaveChatInterval(Number(e.target.value))}
                            className="w-20 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm text-center focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="text-sm text-gray-600">seconds</span>
                        <button 
                            onClick={() => setAutoSaveChat(!autoSaveChat)}
                            className={`${autoSaveChat ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                        >
                            <span className={`${autoSaveChat ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Database className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                            <span className="text-gray-700 block">Auto-Backup to JSON</span>
                            <span className="text-xs text-gray-500">Backup full state to a JSON file. Set to 0 to disable interval backups.</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="number"
                            min="0"
                            value={autoJsonBackupInterval}
                            onChange={(e) => setAutoJsonBackupInterval(Number(e.target.value))}
                            className="w-20 border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm text-center focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                        <button 
                            onClick={() => setAutoJsonBackup(!autoJsonBackup)}
                            className={`${autoJsonBackup ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                        >
                            <span className={`${autoJsonBackup ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                        </button>
                    </div>
                </div>


                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Cloud className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                            <span className="text-gray-700 block">Auto-Backup to Google Drive</span>
                            <span className="text-xs text-gray-500">Automatically backup full state to Google Drive. Requires connection.</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setAutoDriveBackup(!autoDriveBackup)}
                            disabled={!isGoogleDriveConnected}
                            className={`${autoDriveBackup && isGoogleDriveConnected ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isGoogleDriveConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span className={`${autoDriveBackup && isGoogleDriveConnected ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                        </button>
                    </div>
                </div>




                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Bell className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                            <span className="text-gray-700 block">Test Proactive Message</span>
                            <span className="text-xs text-gray-500">Trigger a proactive message immediately.</span>
                        </div>
                    </div>
                    <button
                        onClick={handleTestProactiveMessage}
                        disabled={isTestingProactive}
                        className={`${isTestingProactive ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center`}
                    >
                        {isTestingProactive && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                        {isTestingProactive ? 'Generating...' : 'Test Now'}
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Bell className="w-5 h-5 text-gray-500 mr-3" />
                        <span className="text-gray-700">Notifications</span>
                    </div>
                    <button
                        onClick={handleNotificationToggle}
                        className={`${notificationsEnabled ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                    >
                        <span className={`${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Clock className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                            <span className="text-gray-700 block">Show Message Timestamps</span>
                            <span className="text-xs text-gray-500">Display date and time on each message.</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowTimestamps(!showTimestamps)}
                        className={`${showTimestamps ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                    >
                        <span className={`${showTimestamps ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}></span>
                    </button>
                </div>

                <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                        <Clock className="w-5 h-5 text-gray-500 mr-3" />
                        <div>
                            <span className="text-gray-700 block">Time Zone</span>
                            <span className="text-xs text-gray-500">Set your local time zone for all timestamps.</span>
                        </div>
                    </div>
                    <select
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        {Intl.supportedValuesOf('timeZone').map((tz) => (
                            <option key={tz} value={tz}>
                                {tz}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </section>

        {/* Browser Integrations */}
        <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Browser Integrations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <button onClick={handleLocation} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 transition-all group">
                    <MapPin className="w-6 h-6 mb-2 text-gray-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-medium text-gray-700">Location</span>
                </button>
                <button onClick={handleClipboardCopy} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 transition-all group">
                    <Copy className="w-6 h-6 mb-2 text-gray-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-medium text-gray-700">Copy Data</span>
                </button>
                <button onClick={handleNotificationTest} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 transition-all group">
                    <Bell className="w-6 h-6 mb-2 text-gray-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-medium text-gray-700">Local Test</span>
                </button>
                <button onClick={handleDownloadChat} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 transition-all group">
                    <Download className="w-6 h-6 mb-2 text-gray-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-medium text-gray-700">Save Chat</span>
                </button>
                <button onClick={handleStorageCheck} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 transition-all group">
                    <Database className="w-6 h-6 mb-2 text-gray-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-medium text-gray-700">Site Data</span>
                </button>
                <button onClick={handleEnablePushNotifications} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 transition-all group">
                    <Smartphone className="w-6 h-6 mb-2 text-gray-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-medium text-gray-700">Enable Push</span>
                </button>
                <button onClick={handleTestNotification} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 transition-all group">
                    <Bell className="w-6 h-6 mb-2 text-gray-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-medium text-gray-700">Server Push</span>
                </button>
            </div>
            {fcmToken && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Your FCM Token:</h4>
                    <div className="flex items-center space-x-2">
                        <code className="flex-1 text-xs break-all bg-white p-2 rounded border border-gray-100">
                            {fcmToken}
                        </code>
                        <button
                            onClick={() => navigator.clipboard.writeText(fcmToken)}
                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
                            title="Copy FCM Token"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Use this token to send test push notifications from your server.
                    </p>
                </div>
            )}
            <p className="text-xs text-gray-500 mt-3 italic">
                These tools allow the AI to interact with your browser's native capabilities.
            </p>
        </section>

        {/* Help & Tutorial */}
        <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Help & Support</h3>
            <button
                onClick={() => setShowTutorial(true)}
                className="flex items-center justify-center w-full p-4 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-indigo-700 font-medium"
            >
                <HelpCircle className="w-5 h-5 mr-2" />
                Start Interactive Tutorial
            </button>
        </section>

        {/* Danger Zone */}
        <section>
            <h3 className="text-lg font-semibold text-red-600 mb-4 border-b border-red-100 pb-2">Danger Zone</h3>
            <div>
                <button
                    onClick={async () => {
                        if (window.confirm("Are you sure? This will wipe all local data and reset the app.")) {
                            try {
                                await resetApp();
                            } catch (e) {
                                console.error("Reset failed", e);
                                addToast({ title: "Reset Failed", message: "Failed to reset data. Please try again.", type: "error" });
                            }
                        }
                    }}
                    className="flex items-center text-red-600 hover:text-red-800 font-medium"
                >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Reset All Data
                </button>
                <p className="text-xs text-gray-500 mt-1">
                    This action cannot be undone. It will clear all local storage and database.
                </p>
            </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsScreen;
