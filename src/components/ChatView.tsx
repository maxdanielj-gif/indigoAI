import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { startListening, stopListening, speak, stop as stopTTS, isSpeaking } from '@/lib/tts';
import {
  Send, Mic, MicOff, Paperclip, ImagePlus, RotateCcw, Edit3, Trash2,
  Check, X, Volume2, VolumeX, Menu, Loader2, Camera
} from 'lucide-react';

const ChatView: React.FC = () => {
  const {
    messages, sendMessage, editMessage, deleteMessage, regenerateLastResponse,
    isLoading, aiProfile, userProfile, settings, toggleSidebar, isGeneratingImage,
    generateCompanionImage,
  } = useAppContext();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() && !showImagePrompt) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoice = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      startListening(
        (text) => setInput(prev => prev + ' ' + text),
        () => setIsListening(false),
        () => setIsListening(false)
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      reader.onload = () => {
        const content = reader.result as string;
        sendMessage(`[Uploaded file: ${file.name}]`, undefined, content, file.name);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      sendMessage('*shares an image*', dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImageGenerate = async () => {
    if (!imagePrompt.trim()) return;
    const prompt = imagePrompt.trim();
    setImagePrompt('');
    setShowImagePrompt(false);
    await sendMessage(`*requests a photo* ${prompt}`);
  };

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditText(content);
  };

  const saveEdit = () => {
    if (editingId) {
      editMessage(editingId, editText);
      setEditingId(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleTTSToggle = (text: string) => {
    if (isSpeaking()) {
      stopTTS();
    } else {
      speak(text, settings.tts);
    }
  };

  const formatContent = (content: string) => {
    // Handle *actions* and basic markdown
    return content.split('\n').map((line, i) => {
      const parts = line.split(/(\*[^*]+\*)/g);
      return (
        <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
          {parts.map((part, j) => {
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return <em key={j} className="text-indigo-300/80 italic">{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800/50 shrink-0">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {aiProfile.referenceImage ? (
            <img src={aiProfile.referenceImage} alt={aiProfile.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/50" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {aiProfile.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm truncate">{aiProfile.name}</h1>
            <p className="text-xs text-indigo-400 truncate">{aiProfile.relationshipType}</p>
          </div>
        </div>
        <button
          onClick={() => setShowImagePrompt(!showImagePrompt)}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
          title="Generate photo"
        >
          <Camera size={20} />
        </button>
      </div>

      {/* Image prompt bar */}
      {showImagePrompt && (
        <div className="px-4 py-3 bg-indigo-950/50 border-b border-indigo-800/30 flex gap-2 shrink-0">
          <input
            type="text"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Describe the photo (e.g., 'at the beach at sunset')"
            className="flex-1 bg-slate-800/60 text-white text-sm rounded-lg px-3 py-2 border border-indigo-700/30 focus:border-indigo-500 focus:outline-none placeholder-slate-500"
            onKeyDown={(e) => e.key === 'Enter' && handleImageGenerate()}
          />
          <button
            onClick={handleImageGenerate}
            disabled={!imagePrompt.trim() || isGeneratingImage}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
          >
            {isGeneratingImage ? <Loader2 size={16} className="animate-spin" /> : 'Generate'}
          </button>
          <button onClick={() => setShowImagePrompt(false)} className="p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              {aiProfile.referenceImage ? (
                <img src={aiProfile.referenceImage} alt={aiProfile.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-3xl text-white font-bold">{aiProfile.name.charAt(0)}</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Meet {aiProfile.name}</h2>
            <p className="text-slate-400 text-sm max-w-xs mb-4">{aiProfile.persona.slice(0, 120)}...</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Hey there!', 'Tell me about yourself', 'Send me a selfie'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-3 py-1.5 bg-slate-800/60 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 text-xs rounded-full border border-slate-700/50 hover:border-indigo-500/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isEditing = editingId === msg.id;

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
                {!isUser && (
                  <div className="flex items-center gap-2 mb-1">
                    {aiProfile.referenceImage ? (
                      <img src={aiProfile.referenceImage} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                        {aiProfile.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs text-slate-500">{aiProfile.name}</span>
                  </div>
                )}

                <div className={`rounded-2xl px-4 py-2.5 ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-slate-800/80 text-slate-200 rounded-bl-md border border-slate-700/30'
                }`}>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-slate-700/50 text-white text-sm rounded-lg p-2 border border-slate-600 focus:border-indigo-500 focus:outline-none resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="p-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30">
                          <Check size={14} />
                        </button>
                        <button onClick={cancelEdit} className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      {formatContent(msg.content)}
                    </div>
                  )}

                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="Shared image"
                      className="mt-2 rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  )}

                  {msg.fileName && (
                    <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-slate-700/30 rounded text-xs text-slate-400">
                      <Paperclip size={12} />
                      {msg.fileName}
                    </div>
                  )}
                </div>

                {/* Message actions */}
                <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-slate-600 mr-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.edited && <span className="text-xs text-slate-600 mr-1">(edited)</span>}
                  <button onClick={() => startEdit(msg.id, msg.content)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300">
                    <Edit3 size={12} />
                  </button>
                  <button onClick={() => deleteMessage(msg.id)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                  {!isUser && settings.tts.enabled && (
                    <button onClick={() => handleTTSToggle(msg.content)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-indigo-400">
                      <Volume2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                  {aiProfile.name.charAt(0)}
                </div>
                <span className="text-xs text-slate-500">{aiProfile.name}</span>
              </div>
              <div className="bg-slate-800/80 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-700/30">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {isGeneratingImage && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-950/50 rounded-full border border-indigo-700/30">
              <Loader2 size={14} className="animate-spin text-indigo-400" />
              <span className="text-xs text-indigo-300">Generating image...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Regenerate button */}
      {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !isLoading && (
        <div className="flex justify-center pb-1 shrink-0">
          <button
            onClick={regenerateLastResponse}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-400 hover:text-indigo-400 bg-slate-800/40 hover:bg-slate-800/80 rounded-full transition-colors"
          >
            <RotateCcw size={12} />
            Regenerate
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-3 pb-3 pt-2 bg-slate-900/50 backdrop-blur border-t border-slate-800/50 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Upload file"
            >
              <Paperclip size={18} />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Upload image"
            >
              <ImagePlus size={18} />
            </button>
          </div>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${aiProfile.name}...`}
              className="w-full bg-slate-800/60 text-white text-sm rounded-2xl px-4 py-3 pr-12 border border-slate-700/50 focus:border-indigo-500/50 focus:outline-none resize-none placeholder-slate-500 max-h-32"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>

          <button
            onClick={handleVoice}
            className={`p-2.5 rounded-xl transition-colors ${
              isListening
                ? 'bg-red-600/20 text-red-400 animate-pulse'
                : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
          >
            <Send size={18} />
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json" className="hidden" onChange={handleFileUpload} />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
    </div>
  );
};

export default ChatView;
