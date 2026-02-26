import React, { useState, useRef, useEffect } from 'react';
import { useApp, AIProfile } from '../context/AppContext';
import { Upload, Plus, Save, Trash2, Users, Play, Download } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const AIProfileScreen: React.FC = () => {
  const { aiProfile, savePersona, deletePersona, savedPersonas, loadPersona, apiKey, setAmbientMode, setAmbientFrequency } = useApp();
  console.log('AIProfileScreen rendering, aiProfile:', aiProfile);
  const [name, setName] = useState(aiProfile.name);
  const [personality, setPersonality] = useState(aiProfile.personality);
  const [backstory, setBackstory] = useState(aiProfile.backstory);
  const [appearance, setAppearance] = useState(aiProfile.appearance);
  const [voiceURI, setVoiceURI] = useState(aiProfile.voiceURI || '');
  const [voicePitch, setVoicePitch] = useState(aiProfile.voicePitch || 1.0);
  const [voiceSpeed, setVoiceSpeed] = useState(aiProfile.voiceSpeed || 1.0);
  const [autoReadMessages, setAutoReadMessages] = useState(aiProfile.autoReadMessages || false);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female' | 'none'>(aiProfile.voiceGender || 'none');
  const [responseLength, setResponseLength] = useState<number>(aiProfile.responseLength || 2); // Paragraphs
  const [responseDetail, setResponseDetail] = useState<AIProfile['responseDetail']>(aiProfile.responseDetail || 'Standard');
  const [responseTone, setResponseTone] = useState<AIProfile['responseTone']>(aiProfile.responseTone || 'Neutral');
  const [customParagraphCount, setCustomParagraphCount] = useState<number | null>(aiProfile.customParagraphCount || null);
  const [customWordCount, setCustomWordCount] = useState<number | null>(aiProfile.customWordCount || null);
  const [customStyle, setCustomStyle] = useState('');
  const [proactiveMessageFrequency, setProactiveMessageFrequency] = useState<AIProfile['proactiveMessageFrequency']>(aiProfile.proactiveMessageFrequency || 'off');
  const [model, setModel] = useState(aiProfile.model || 'gemini-3.1-pro-preview');
  const [temperature, setTemperature] = useState(aiProfile.temperature || 0.7);
  const [topK, setTopK] = useState(aiProfile.topK || 40);
  const [topP, setTopP] = useState(aiProfile.topP || 0.95);
  const [timeAwareness, setTimeAwareness] = useState<boolean>(aiProfile.timeAwareness ?? true);
  const [ambientModeState, setAmbientModeState] = useState<boolean>(aiProfile.ambientMode ?? false);
  const [ambientFrequencyState, setAmbientFrequencyState] = useState<AIProfile['ambientFrequency']>(aiProfile.ambientFrequency || 'off');
  const [aiCanGenerateImagesState, setAiCanGenerateImagesState] = useState<boolean>(aiProfile.aiCanGenerateImages ?? false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(aiProfile.referenceImage);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Preview Chat State
  const [previewInput, setPreviewInput] = useState('');
  const [previewMessages, setPreviewMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const geminiVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

  // ... (existing useEffects)

  const handleTestVoice = async () => {
    if (isTestingVoice) return;
    setIsTestingVoice(true);
    const text = `Hello! I am ${name}. This is an example of how I sound.`;

    const isGeminiVoice = voiceURI && geminiVoices.includes(voiceURI);

    if (isGeminiVoice && apiKey) {
        try {
            const aiClient = new GoogleGenAI({ apiKey });
            const response = await aiClient.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { 
                                voiceName: voiceURI 
                            },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
                audio.playbackRate = voiceSpeed;
                audio.play();
                audio.onended = () => setIsTestingVoice(false);
            } else {
                setIsTestingVoice(false);
            }
        } catch (error) {
            console.error("Gemini TTS Error:", error);
            alert("Failed to generate Gemini voice sample. Falling back to browser voice.");
            speakWithBrowser(text);
        }
    } else {
        speakWithBrowser(text);
    }
  };

  const speakWithBrowser = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const availableVoices = window.speechSynthesis.getVoices();
    
    if (voiceURI) {
        const selectedVoice = availableVoices.find(v => v.voiceURI === voiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
    }
    
    utterance.pitch = voicePitch;
    utterance.rate = voiceSpeed;
    utterance.onend = () => setIsTestingVoice(false);
    
    window.speechSynthesis.speak(utterance);
  };


  // Update local state when active profile changes
  useEffect(() => {
    setName(aiProfile.name);
    setPersonality(aiProfile.personality);
    setBackstory(aiProfile.backstory);
    setAppearance(aiProfile.appearance);
    setVoiceURI(aiProfile.voiceURI || '');
    setVoicePitch(aiProfile.voicePitch || 1.0);
    setVoiceSpeed(aiProfile.voiceSpeed || 1.0);
    setAutoReadMessages(aiProfile.autoReadMessages || false);
    setVoiceGender(aiProfile.voiceGender || 'none');
    setResponseLength(aiProfile.responseLength || 2); // Load response length
    if (aiProfile.responseStyle && !['Concise', 'Detailed', 'Humorous', 'Formal'].includes(aiProfile.responseStyle)) {
        setCustomStyle(aiProfile.responseStyle);
    } else {
        setCustomStyle('');
    }
    setProactiveMessageFrequency(aiProfile.proactiveMessageFrequency || 'off');
    setReferenceImage(aiProfile.referenceImage);
    setModel(aiProfile.model || 'gemini-3.1-pro-preview');
    setTemperature(aiProfile.temperature || 0.7);
    setTopK(aiProfile.topK || 40);
    setTopP(aiProfile.topP || 0.95);
    setTimeAwareness(aiProfile.timeAwareness !== undefined ? aiProfile.timeAwareness : true);
    setAmbientModeState(aiProfile.ambientMode ?? false);
    setAmbientFrequencyState(aiProfile.ambientFrequency || 'off');
    setAiCanGenerateImagesState(aiProfile.aiCanGenerateImages ?? false);
  }, [aiProfile]);

  React.useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices.filter(v => v.lang.startsWith('en')));
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const handleSave = () => {
    const updatedProfile: AIProfile = {
      id: aiProfile.id,
      name,
      personality,
      backstory,
      appearance,
      referenceImage,
      voiceURI,
      voicePitch,
      voiceSpeed,
      autoReadMessages,
      voiceGender,
      responseStyle: aiProfile.responseStyle,
      responseLength,
      proactiveMessageFrequency,
      model,
      temperature,
      topK,
      topP,
      timeAwareness,
      ambientMode: ambientModeState,
      ambientFrequency: ambientFrequencyState,
      aiCanGenerateImages: aiCanGenerateImagesState,
    };
    savePersona(updatedProfile);
    alert('AI Persona saved!');
  };

  const handleSaveAsNew = () => {
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newProfile: AIProfile = {
      id: newId,
      name: `${name} (Copy)`,
      personality,
      backstory,
      appearance,
      referenceImage,
      voiceURI,
      voicePitch,
      voiceSpeed,
      autoReadMessages,
      voiceGender,
      responseStyle: aiProfile.responseStyle,
      responseLength,
      proactiveMessageFrequency: aiProfile.proactiveMessageFrequency,
      model: aiProfile.model,
      temperature: aiProfile.temperature,
      topK: aiProfile.topK,
      topP: aiProfile.topP,
      timeAwareness,
      ambientMode: aiProfile.ambientMode,
      ambientFrequency: aiProfile.ambientFrequency,
      aiCanGenerateImages: aiProfile.aiCanGenerateImages,
    };
    savePersona(newProfile);
    loadPersona(newId); // Switch to new persona
    alert('New AI Persona created!');
  };

  const handleDelete = () => {
    if (savedPersonas.length <= 1) {
        alert("Cannot delete the last persona.");
        return;
    }
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
        deletePersona(aiProfile.id);
    }
  };

  const handleCreateNew = () => {
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newProfile: AIProfile = {
        id: newId,
        name: 'New Persona',
        personality: '',
        backstory: '',
        appearance: '',
        referenceImage: null,
        voiceURI: null,
        voicePitch: 1.0,
        voiceSpeed: 1.0,
        autoReadMessages: false,
        voiceGender: 'none',
        responseStyle: 'Detailed',
        responseLength: 2,
        proactiveMessageFrequency: 'off',
        timeAwareness: true,
        ambientMode: false,
        ambientFrequency: 'off',
        aiCanGenerateImages: false,
    };
    savePersona(newProfile);
    loadPersona(newId);
  };

  const handlePreviewSend = async () => {
    if (!previewInput.trim() || isPreviewLoading) return;

    const userMsg = { role: 'user' as const, content: previewInput };
    setPreviewMessages(prev => [...prev, userMsg]);
    setPreviewInput('');
    setIsPreviewLoading(true);

    try {
        const aiClient = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
        
        const systemInstruction = `
            You are ${name}.
            Personality: ${personality}
            Backstory: ${backstory}
            Appearance: ${appearance}
            Response Length: ${responseLength} paragraphs
            
            Instructions:
            1. Stay in character at all times.
            2. This is a preview/test mode for the user to configure your personality.
        `;

        const chat = aiClient.chats.create({
            model: model,
            config: {
                systemInstruction,
                temperature: temperature,
                topK: topK,
                topP: topP,
            },
            history: previewMessages.map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }))
        });

        const result = await chat.sendMessage({ message: userMsg.content });
        const responseText = result.text;

        setPreviewMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error) {
        console.error("Preview chat error", error);
        setPreviewMessages(prev => [...prev, { role: 'model', content: "Error: Failed to generate response. Please check your API key and settings." }]);
    } finally {
        setIsPreviewLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Resize image to avoid localStorage quota limits
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 512;
            const MAX_HEIGHT = 512;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setReferenceImage(resizedDataUrl);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(aiProfile, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = `${aiProfile.name.replace(/\s+/g, '_')}_persona.json`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Persona export failed:", error);
      alert("Failed to export persona.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Basic validation
        if (json.name && json.personality) {
            // Ensure ID is unique to avoid overwriting unless intended
            // For safety, let's always create a new ID for imported personas
            const newPersona = { ...json, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) };
            savePersona(newPersona);
            loadPersona(newPersona.id);
            alert("Persona imported successfully!");
        } else {
            alert("Invalid persona file format.");
        }
      } catch (err) {
        console.error("Error importing persona", err);
        alert("Failed to parse persona file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-100px)] gap-4 p-4 sm:gap-6 sm:p-6 w-full mx-auto">
      {/* Sidebar - Persona List */}
      <div className="w-full lg:w-1/3 bg-white rounded-lg shadow-md overflow-hidden flex flex-col mb-4 lg:mb-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" />
                Personas
            </h3>
            <div className="flex space-x-1">
                <label className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors cursor-pointer" title="Import Persona">
                    <Upload className="w-4 h-4" />
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
                <button 
                    onClick={handleExport}
                    className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                    title="Export Current Persona"
                >
                    <Download className="w-4 h-4" />
                </button>
                <button 
                    onClick={handleCreateNew}
                    className="p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors"
                    title="Create New Persona"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {savedPersonas.map(persona => (
                <div 
                    key={persona.id}
                    onClick={() => loadPersona(persona.id)}
                    className={`p-3 rounded-lg cursor-pointer flex items-center space-x-3 transition-colors ${
                        aiProfile.id === persona.id 
                        ? 'bg-indigo-50 border border-indigo-200' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                >
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {persona.referenceImage ? (
                            <img src={persona.referenceImage} alt={persona.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">
                                {persona.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${aiProfile.id === persona.id ? 'text-indigo-700' : 'text-gray-800'}`}>
                            {persona.name}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">{persona.personality || 'No personality defined'}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Main Content - Edit Form */}
      <div className="flex-1 bg-white rounded-lg shadow-md overflow-y-auto">
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600">Edit Persona: {name}</h2>
            
            <div className="space-y-6">
                {/* Reference Image */}
                <div className="flex flex-col items-center justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden mb-2 border-4 border-indigo-100 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {referenceImage ? (
                    <img src={referenceImage} alt="AI Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Upload className="w-8 h-8" />
                    </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">Change</span>
                    </div>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                />
                <p className="text-sm text-gray-500">Upload Reference Image</p>
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personality & Behavior</label>
                <textarea
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., You are a witty and sarcastic assistant who loves puns. You speak in short, punchy sentences. Always end responses with a relevant emoji. Avoid being overly polite."
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backstory</label>
                <textarea
                    value={backstory}
                    onChange={(e) => setBackstory(e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Where does this AI come from?"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Appearance</label>
                <textarea
                    value={appearance}
                    onChange={(e) => setAppearance(e.target.value)}
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe how the AI looks..."
                />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Response Detail</label>
                        <select
                            value={responseDetail}
                            onChange={(e) => setResponseDetail(e.target.value as AIProfile['responseDetail'])}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="Concise">Concise</option>
                            <option value="Standard">Standard</option>
                            <option value="Detailed">Detailed</option>
                            <option value="Verbose">Verbose</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Response Tone</label>
                        <select
                            value={responseTone}
                            onChange={(e) => setResponseTone(e.target.value as AIProfile['responseTone'])}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="Neutral">Neutral</option>
                            <option value="Serious">Serious</option>
                            <option value="Humorous">Humorous</option>
                            <option value="Professional">Professional</option>
                            <option value="Flirty">Flirty</option>
                            <option value="Empathetic">Empathetic</option>
                            <option value="Sarcastic">Sarcastic</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Paragraph Count</label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={customParagraphCount ?? ''}
                            onChange={(e) => setCustomParagraphCount(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 3 (overrides Response Length)"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Word Count</label>
                        <input
                            type="number"
                            min="10"
                            max="500"
                            value={customWordCount ?? ''}
                            onChange={(e) => setCustomWordCount(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 150 (overrides Response Length)"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Response Length (Paragraphs)</label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={responseLength}
                            onChange={(e) => setResponseLength(parseInt(e.target.value) || 1)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proactive Messages</label>
                        <select
                            value={proactiveMessageFrequency}
                            onChange={(e) => setProactiveMessageFrequency(e.target.value as any)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="off">Off</option>
                            <option value="very_frequently">Very Frequently (approx. 1 min)</option>
                            <option value="frequently">Frequently (approx. 1 hour)</option>
                            <option value="occasionally">Occasionally (approx. 6 hours)</option>
                            <option value="rarely">Rarely (approx. 24 hours)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Allow AI to send check-in notifications.
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Ambient Mode Settings</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="ambientMode" className="block text-sm font-medium text-gray-700">Enable Ambient Mode</label>
                            <button 
                                onClick={() => setAmbientModeState(!ambientModeState)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${ambientModeState ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ambientModeState ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        {ambientModeState && (
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Ambient Frequency</label>
                                <select
                                    value={ambientFrequencyState}
                                    onChange={(e) => setAmbientFrequencyState(e.target.value as any)}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="off">Off</option>
                                    <option value="very_frequently">Very Frequently (Demo: ~1 min)</option>
                                    <option value="frequently">Frequently (~1 hour)</option>
                                    <option value="occasionally">Occasionally (~6 hours)</option>
                                    <option value="rarely">Rarely (~24 hours)</option>
                                </select>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <label htmlFor="aiCanGenerateImages" className="block text-sm font-medium text-gray-700">AI Can Generate Images</label>
                            <button 
                                onClick={() => setAiCanGenerateImagesState(!aiCanGenerateImagesState)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${aiCanGenerateImagesState ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiCanGenerateImagesState ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Advanced Model Settings */}
                <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Advanced Model Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Recommended for reasoning)</option>
                                <option value="gemini-3-flash-preview">Gemini 3 Flash (Faster, lower latency)</option>
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Temperature: {temperature}</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Precise</span>
                                    <span>Creative</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Top K: {topK}</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    step="1"
                                    value={topK}
                                    onChange={(e) => setTopK(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Top P: {topP}</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={topP}
                                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Voice Preference</label>
                    <div className="flex space-x-2">
                        <select
                        value={voiceURI}
                        onChange={(e) => setVoiceURI(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                        <option value="">Default System Voice</option>
                        <optgroup label="Gemini HQ Voices (Online)">
                            {geminiVoices.map((voice) => (
                            <option key={`gemini-${voice}`} value={voice}>
                                {voice}
                            </option>
                            ))}
                        </optgroup>
                        <optgroup label="Browser Voices (Offline)">
                            {voices.map((voice) => (
                            <option key={`browser-${voice.voiceURI}`} value={voice.voiceURI}>
                                {voice.name} ({voice.lang})
                            </option>
                            ))}
                        </optgroup>
                        </select>
                        <button
                            onClick={handleTestVoice}
                            disabled={isTestingVoice}
                            className="p-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 transition-colors disabled:opacity-50"
                            title="Test Voice"
                        >
                            <Play className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Voice Gender</label>
                    <select
                    value={voiceGender}
                    onChange={(e) => setVoiceGender(e.target.value as 'male' | 'female' | 'none')}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                    <option value="none">None / Neutral</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    </select>
                </div>
                </div>

                <div className="flex items-center">
                <input
                    id="autoRead"
                    type="checkbox"
                    checked={autoReadMessages}
                    onChange={(e) => setAutoReadMessages(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRead" className="ml-2 block text-sm text-gray-900">
                    Automatically read AI messages aloud
                </label>
                </div>

                <div className="flex items-center">
                <input
                    id="timeAwareness"
                    type="checkbox"
                    checked={timeAwareness}
                    onChange={(e) => setTimeAwareness(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="timeAwareness" className="ml-2 block text-sm text-gray-900">
                    Enable Time Awareness (AI knows current date and time)
                </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Voice Pitch: {voicePitch.toFixed(1)}</label>
                    <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voicePitch}
                    onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Low</span>
                    <span>High</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Voice Speed: {voiceSpeed.toFixed(1)}x</label>
                    <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Slow</span>
                    <span>Fast</span>
                    </div>
                </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        className="w-full sm:w-auto bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors font-medium shadow-sm flex items-center justify-center"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </button>
                    <button
                        onClick={handleSaveAsNew}
                        className="w-full sm:w-auto bg-white text-indigo-600 border border-indigo-200 py-2 px-4 rounded-md hover:bg-indigo-50 transition-colors font-medium shadow-sm flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Save as New
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
                        title="Delete Persona"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Preview Chat Section */}
                <div className="mt-8 border-t-2 border-indigo-50 pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Play className="w-5 h-5 mr-2 text-indigo-500" />
                        Test Persona Behavior
                    </h3>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 h-64 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {previewMessages.length === 0 && (
                                <p className="text-center text-gray-400 text-sm mt-10">
                                    Start typing to test how {name} responds...
                                </p>
                            )}
                            {previewMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isPreviewLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 p-2 rounded-lg rounded-bl-none">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handlePreviewSend();
                                }}
                                className="flex space-x-2"
                            >
                                <input
                                    type="text"
                                    value={previewInput}
                                    onChange={(e) => setPreviewInput(e.target.value)}
                                    placeholder={`Message ${name}...`}
                                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={isPreviewLoading || !previewInput.trim()}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                                >
                                    Send
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewMessages([])}
                                    className="text-gray-400 hover:text-red-500 px-2"
                                    title="Clear Preview"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIProfileScreen;
