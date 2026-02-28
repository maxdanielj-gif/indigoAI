import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Mic, Paperclip, Volume2, RotateCcw, Edit2, X, FileText, CheckCheck, Loader2, Camera, Trash2, ExternalLink, Plus, MessageSquare, History, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// Utility function to convert base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

import { useApp } from '../context/AppContext';
import { showNativeNotification } from '../services/firebaseService';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const ChatScreen: React.FC = () => {
  const { 
    aiProfile, userProfile, chatHistory, addChatMessage, updateChatMessage, 
    deleteChatMessage, setChatHistory, clearHistory, knowledgeBase, 
    addToKnowledgeBase, addToGallery, apiKey, memories, journal, 
    addJournalEntry, addMemory, showTimestamps, timeZone,
    sessions, activeSessionId, createNewSession, switchSession, deleteSession, renameSession
  } = useApp();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<{ type: 'image' | 'text' | 'pdf'; content: string; name: string }[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isSessionsSidebarOpen, setIsSessionsSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());
  const [isLiveApiActive, setIsLiveApiActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ... (Proactive Messages Logic - unchanged)

  // Browser Integration Handlers (moved to SettingsScreen)
  const handleCamera = () => {
      cameraInputRef.current?.click();
  };

  // ... (Rest of existing functions: getAiClient, scrollToBottom, etc.)

  // Proactive Messages Logic moved to AppContext.tsx for centralized handling and FCM support
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachments(prev => [...prev, {
            type: 'image',
            content: event.target!.result as string,
            name: file.name
          }]);
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
        }
        return fullText;
    } catch (error) {
        console.error("Error extracting PDF text:", error);
        return "Error extracting text from PDF.";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      
      if (file.type === 'application/pdf') {
        // Extract text for context, but keep base64 for attachment display/sending if needed
        const textContent = await extractTextFromPDF(file);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setAttachments(prev => [...prev, {
                    type: 'pdf',
                    content: event.target!.result as string, // Base64
                    name: file.name
                }]);
                
                // Add to knowledge base automatically if it's a document
                addToKnowledgeBase({
                    name: file.name,
                    content: textContent
                });
                setIsUploading(false);
            }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const content = event.target!.result as string;
            setAttachments(prev => [...prev, {
              type: 'text',
              content: content,
              name: file.name
            }]);
            
            // Add to knowledge base
            addToKnowledgeBase({
                name: file.name,
                content: content
            });
            setIsUploading(false);
          }
        };
        reader.readAsText(file);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Speech to Text
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
            alert("Microphone access denied. Please enable permissions.");
        }
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + ' ' + transcript);
      };
      recognition.start();
    } else {
      alert('Speech recognition not supported in this browser.');
    }
  };

  const connectLiveApi = async () => {
    if (!apiKey) {
      alert('Please provide an API key in settings to use Live API.');
      setIsLiveApiActive(false);
      return;
    }

    const aiClient = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
    let mediaRecorder: MediaRecorder | null = null;
    let audioContext: AudioContext | null = null;
    let audioQueue: Blob[] = [];
    let isPlaying = false;

    const playAudio = async () => {
      if (audioQueue.length === 0 || isPlaying) return;

      isPlaying = true;
      const blob = audioQueue.shift();
      if (blob) {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.playbackRate = aiProfile.voiceSpeed || 1.0;
        audio.onended = () => {
          isPlaying = false;
          URL.revokeObjectURL(audioUrl);
          playAudio();
        };
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          isPlaying = false;
          URL.revokeObjectURL(audioUrl);
          playAudio();
        };
        audio.play().catch(e => console.error('Error playing audio:', e));
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);

      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Convert Blob to base64 for sending
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            sessionPromise.then(session => {
              session.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'audio/webm;codecs=opus' }
              });
            });
          };
          reader.readAsDataURL(event.data);
        }
      };
      mediaRecorder.start(100); // Capture audio every 100ms

      const sessionPromise = aiClient.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            console.log('Live API session opened');
            addChatMessage({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              role: 'model',
              content: "Live conversation started! What's on your mind?",
              timestamp: Date.now(),
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioBlob = await (await fetch(`data:audio/mpeg;base64,${base64Audio}`)).blob();
              audioQueue.push(audioBlob);
              playAudio();
            }
            if (message.serverContent?.interrupted) {
              console.log('Model interrupted, clearing audio queue.');
              audioQueue = [];
              if (isPlaying) {
                // Stop current audio playback if any
                // This is tricky with HTMLAudioElement, usually requires a global ref or AudioContext stop
              }
            }
            if (message.serverContent?.outputTranscription?.text) {
              console.log('Model transcription:', message.serverContent.outputTranscription.text);
              // Optionally display model's transcription
            }
          },
          onerror: (error) => {
            console.error('Live API error:', error);
            addChatMessage({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              role: 'model',
              content: `Live conversation error: ${error.message}`, 
              timestamp: Date.now(),
            });
            setIsLiveApiActive(false);
          },
          onclose: () => {
            console.log('Live API session closed');
            addChatMessage({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              role: 'model',
              content: "Live conversation ended.",
              timestamp: Date.now(),
            });
            setIsLiveApiActive(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: aiProfile.voiceURI || 'Zephyr' },
            },
          },
          systemInstruction: `You are ${aiProfile.name}. Personality: ${aiProfile.personality}. Respond concisely.`, // Simplified system instruction for live
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      });

      return () => {
        console.log('Cleaning up Live API resources');
        mediaRecorder?.stop();
        stream.getTracks().forEach(track => track.stop());
        audioContext?.close();
        sessionPromise.then(session => session.close());
      };

    } catch (error) {
      console.error('Failed to start Live API:', error);
      alert(`Failed to start live conversation: ${error.message}. Please ensure microphone access is granted.`);
      setIsLiveApiActive(false);
    }
  };

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    const setupLiveApi = async () => {
      if (isLiveApiActive) {
        cleanupFn = await connectLiveApi();
      } else if (cleanupFn) {
        cleanupFn();
      }
    };

    setupLiveApi();

    return () => { 
      if (cleanupFn) cleanupFn(); 
    };
  }, [isLiveApiActive, apiKey, aiProfile.name, aiProfile.personality, aiProfile.voiceURI, aiProfile.voiceSpeed]);

  // Text to Speech
  const speakMessage = async (text: string, messageId: string) => {
    // Check if selected voice is a Gemini voice
    const geminiVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const isGeminiVoice = aiProfile.voiceURI && geminiVoices.includes(aiProfile.voiceURI);

    if (isGeminiVoice) {
        try {
            const aiClient = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
            // Using gemini-2.5-flash-preview-tts for high quality speech
            const response = await aiClient.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: ["AUDIO"], // Using string literal as Modality enum might not be exported correctly or needs import
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { 
                                voiceName: aiProfile.voiceURI 
                            },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                try {
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const arrayBuffer = base64ToArrayBuffer(base64Audio);
                    
                    // Check for "RIFF" header (WAV)
                    const header = new Uint8Array(arrayBuffer.slice(0, 4));
                    const isWav = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;

                    let audioBuffer: AudioBuffer;
                    if (isWav) {
                        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    } else {
                        // Assume raw PCM 16-bit 24kHz mono (standard for Gemini TTS)
                        const pcmData = new Int16Array(arrayBuffer);
                        const float32Data = new Float32Array(pcmData.length);
                        for (let i = 0; i < pcmData.length; i++) {
                            float32Data[i] = pcmData[i] / 32768.0;
                        }
                        audioBuffer = audioContext.createBuffer(1, float32Data.length, 24000);
                        audioBuffer.getChannelData(0).set(float32Data);
                    }

                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.playbackRate.value = aiProfile.voiceSpeed || 1.0;
                    source.connect(audioContext.destination);
                    
                    // On mobile, we might need to resume the context
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                    }
                    
                    source.start(0);
                    source.onended = () => {
                        setReadMessages(prev => new Set(prev).add(messageId));
                    };
                } catch (audioError) {
                    console.error("Audio playback error:", audioError);
                    speakWithBrowser(text, messageId);
                }
            }
        } catch (error) {
            console.error("Gemini TTS Error:", error);
            // Fallback to browser TTS if Gemini fails
            speakWithBrowser(text, messageId);
        }
    } else {
        speakWithBrowser(text, messageId);
    }
  };

  const speakWithBrowser = (text: string, messageId: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    if (aiProfile.voiceURI) {
        const selectedVoice = voices.find(v => v.voiceURI === aiProfile.voiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
    } else {
        // Fallback to English
        utterance.voice = voices.find(v => v.lang.includes('en')) || null;
    }
    
    utterance.pitch = aiProfile.voicePitch || 1.0;
    utterance.rate = aiProfile.voiceSpeed || 1.0;

    window.speechSynthesis.speak(utterance);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    // Auto-save images to gallery
    attachments.forEach(att => {
        if (att.type === 'image') {
            addToGallery({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                type: 'uploaded',
                url: att.content,
                timestamp: Date.now()
            });
        }
    });

    const userMsgId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const userMessage = {
      id: userMsgId,
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
      attachments: [...attachments],
    };

    addChatMessage(userMessage);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    await generateResponse(chatHistory, userMessage);
  };

  const generateResponse = async (history: typeof chatHistory, currentMessage: typeof chatHistory[0]) => {
    try {
      // Construct System Instruction
      let lengthInstruction = `Your response should be around ${aiProfile.responseLength} paragraphs long.`;
      if (aiProfile.customParagraphCount) {
        lengthInstruction = `Your response MUST be exactly ${aiProfile.customParagraphCount} paragraphs long.`;
      } else if (aiProfile.customWordCount) {
        lengthInstruction = `Your response MUST be approximately ${aiProfile.customWordCount} words long.`;
      }

      const now = new Date();
      const timeContext = aiProfile.timeAwareness 
        ? `\nCurrent Time Awareness:
           The current date and time is ${now.toLocaleDateString()} ${now.toLocaleTimeString()}.
           Please use this information if relevant to the conversation (e.g., greetings, time-sensitive topics).`
        : '';

      const systemInstruction = `
        You are ${aiProfile.name}.
        Personality: ${aiProfile.personality}
        Backstory: ${aiProfile.backstory}
        Appearance: ${aiProfile.appearance}
        ${timeContext}
        
        Response Length Constraint: ${lengthInstruction}
        Response Detail: ${aiProfile.responseDetail}
        Response Tone: ${aiProfile.responseTone}
        
        User Profile Context:
        Name: ${userProfile.name}
        Bio/Info: ${userProfile.info}
        Preferences: ${userProfile.preferences}
        Appearance: ${userProfile.appearance}
        User Reference Image: ${userProfile.referenceImage ? "User has provided a reference image. Consider this image when generating visual responses or understanding user's appearance." : "No user reference image provided."}
        
        Core Memories (Important facts to remember):
        ${memories?.map(m => `- [Strength: ${m.strength}/10] ${m.content}`).join('\n') || 'No core memories yet.'}
        
        Instructions:
        1. Contextual Chat: Use *asterisks* for actions/immersion (e.g., *smiles warmly*).
        ${aiProfile.aiCanGenerateImages ? '2. Visual Generation: You can spontaneously send images to the user. To do this, output the tag [GENERATE_IMAGE: detailed description of the image] on a new line. Use this for selfies, scene visualizations, or when requested.' : ''}
        3. Remember past interactions and user preferences.
        
        Knowledge Base Context:
        ${knowledgeBase?.map(k => `File: ${k.name}\nContent: ${k.content.substring(0, 1000)}...`).join('\n\n') || ''}
      `;

      const aiClient = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
      
      // Get location for Maps grounding if possible
      let location = null;
      try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
          };
      } catch (e) {
          console.warn("Could not get location for Maps grounding", e);
      }

      const chat = aiClient.chats.create({
        model: "gemini-2.5-flash", // Use 2.5 flash for Maps support
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }, { googleMaps: {} }],
          toolConfig: location ? {
              retrievalConfig: {
                  latLng: location
              }
          } : undefined,
          temperature: aiProfile.temperature || 0.7,
          topK: aiProfile.topK || 40,
          topP: aiProfile.topP || 0.95,
        }, 
        history: history.slice(-20).map(msg => { // Limit history to last 20 messages to avoid token limits
            const parts: any[] = [{ text: msg.content }];
            msg.attachments?.forEach(att => {
                if (att.type === 'image') {
                    // Extract base64 data
                    const base64Data = att.content.split(',')[1];
                    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
                } else if (att.type === 'pdf') {
                    const base64Data = att.content.split(',')[1];
                    parts.push({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
                } else if (att.type === 'text') {
                    parts.push({ text: `\n[Attached File: ${att.name}]\n${att.content}` });
                }
            });
            return {
                role: msg.role,
                parts,
            };
        }),
      });

      // Prepare current message parts with Contextual Mode awareness
      let contentToSend = currentMessage.content;
      const hasAction = /\*.*?\*/.test(contentToSend);
      const hasOOC = /\(.*?\)/.test(contentToSend);
      

      if (hasAction) {
          contentToSend += "\n\n[SYSTEM NOTE: User included roleplay actions in asterisks. React to these actions vividly within your character's behavior.]";
      }

      const currentParts: any[] = [{ text: contentToSend }];

      // Add user's reference image to the current parts if available
      if (userProfile.referenceImage) {
        try {
          const matches = userProfile.referenceImage.match(/^data:(.+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            currentParts.push({ inlineData: { mimeType, data: base64Data } });
          }
        } catch (e) {
          console.error("Error parsing user reference image for AI context", e);
        }
      }

      currentMessage.attachments?.forEach(att => {
          if (att.type === 'image') {
              const base64Data = att.content.split(',')[1];
              currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
          } else if (att.type === 'pdf') {
              const base64Data = att.content.split(',')[1];
              currentParts.push({ inlineData: { mimeType: 'application/pdf', data: base64Data } });
          } else if (att.type === 'text') {
              currentParts.push({ text: `\n[Attached File: ${att.name}]\n${att.content}` });
          }
      });
      
      const result = await chat.sendMessage({ message: currentParts });
      let responseText = result.text;
      
      // Extract grounding URLs
      const groundingUrls: { title: string; url: string }[] = [];
      const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
          chunks.forEach((chunk: any) => {
              if (chunk.web) {
                  groundingUrls.push({ title: chunk.web.title, url: chunk.web.uri });
              }
              if (chunk.maps) {
                  groundingUrls.push({ title: chunk.maps.title || "Google Maps", url: chunk.maps.uri });
              }
          });
      }
      
      // Check for Image Generation Tag
      const imageTagRegex = /\[GENERATE_IMAGE:\s*(.*?)\]/;
      const match = responseText.match(imageTagRegex);
      
      if (match && aiProfile.aiCanGenerateImages) {
          const imageDescription = match[1];
          // Remove tag from text display
          responseText = responseText.replace(match[0], '').trim();
          
          // Generate Image
          try {
             if (!apiKey || !(await (window as any).aistudio.hasSelectedApiKey())) {
                 alert('Please select an API key for image generation in settings. You may need a paid Google Cloud project. See billing documentation: ai.google.dev/gemini-api/docs/billing');
                 await (window as any).aistudio.openSelectKey();
                 setIsLoading(false);
                 return;
             }
             const imageAiClient = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
             
             // Construct full prompt with AI appearance (matching ImageGeneratorScreen logic)
             const fullPrompt = `Generate an image of ${imageDescription}. The character in the image MUST resemble this description: ${aiProfile.appearance}`;

             const parts: any[] = [{ text: fullPrompt }];

             // Add reference image if available
             if (aiProfile.referenceImage) {
               try {
                   const matches = aiProfile.referenceImage.match(/^data:(.+);base64,(.+)$/);
                   if (matches && matches.length === 3) {
                       const mimeType = matches[1];
                       const base64Data = matches[2];
                       parts.push({ inlineData: { mimeType, data: base64Data } });
                   }
               } catch (e) {
                   console.error("Error parsing reference image", e);
               }
             }

             const imageGenerationResponse = await imageAiClient.models.generateContent({
                 model: 'gemini-2.5-flash-image', // Use default image generation model
                 contents: { parts },
                 config: {
                     imageConfig: {
                         aspectRatio: '1:1'
                     },
                 },
             });

             let imageUrl = '';
             if (imageGenerationResponse.candidates?.[0]?.content?.parts) {
                 for (const part of imageGenerationResponse.candidates[0].content.parts) {
                     if (part.inlineData) {
                         imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                         break;
                     } else if (part.text) {
                         console.warn("Image generation model returned text:", part.text);
                     }
                 }
             }
             
             if (!imageUrl) {
                 throw new Error('No image data received from Gemini API.');
             }
             
             // Add image message as a separate message, with content being the description
             const imageMsgId = (Date.now() + 2).toString();
             addChatMessage({
                 id: imageMsgId,
                 role: 'model',
                 content: `*Generated image: ${imageDescription}*`,
                 timestamp: Date.now(),
                 attachments: imageUrl ? [{
                     type: 'image',
                     content: imageUrl,
                     name: 'generated_image.jpg'
                 }] : []
             });
             
             addToGallery({
                 id: imageMsgId,
                 type: 'generated',
                 url: imageUrl,
                 prompt: imageDescription,
                 timestamp: Date.now()
             });
             
          } catch (e) {
              console.error("Image generation failed", e);
              addChatMessage({
                  id: (Date.now() + 3).toString(),
                  role: 'model',
                  content: `Image generation failed: ${e.message || 'Unknown error'}`,
                  timestamp: Date.now(),
              });
          }
      }

      const modelMessage = {
        id: (Date.now() + 1).toString() + Math.random().toString(36).substr(2, 9),
        role: 'model' as const,
        content: responseText,
        timestamp: Date.now(),
        read: false, // Mark as unread initially
        groundingUrls: groundingUrls.length > 0 ? groundingUrls : undefined,
      };

      addChatMessage(modelMessage);

      if (aiProfile.autoReadMessages) {
        speakMessage(responseText, modelMessage.id);
      } else {
        // Mark as read if auto-read is off
        setReadMessages(prev => new Set(prev).add(modelMessage.id));
      }

      // Background task: Generate Journal Entry and Memories
      generateReflections(history, currentMessage, modelMessage);

    } catch (error: any) {
      console.error('Error generating response:', error);
      let errorMessage = "I'm sorry, I encountered an error processing your request.";
      
      if (error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error && parsed.error.message) {
            errorMessage = `AI Error: ${parsed.error.message}`;
          }
        } catch (e) {
          if (error.message.includes("API key expired")) {
            errorMessage = "AI Error: The Gemini API key has expired. Please check your settings or contact support.";
          } else {
            errorMessage = `AI Error: ${error.message}`;
          }
        }
      }

      addChatMessage({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        role: 'model',
        content: errorMessage,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateReflections = async (history: typeof chatHistory, userMsg: typeof chatHistory[0], modelMsg: typeof chatHistory[0]) => {
    // Only run this occasionally or check if it's been done for the day
    // For now, we'll run it on every message but check if we need to add a journal entry
    
    const today = new Date().toLocaleDateString();
    
    // Check if journal entry exists for today
    const hasJournalForToday = journal.some(entry => new Date(entry.date).toLocaleDateString() === today);
    
    if (!hasJournalForToday) {
        try {
            const aiClient = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
            const journalPrompt = `
                Based on the recent conversation, write a short, reflective journal entry from the perspective of ${aiProfile.name}.
                Date: ${today}
                User: ${userProfile.name}
                
                Conversation Snippet:
                User: ${userMsg.content}
                AI: ${modelMsg.content}
                
                Write in the first person. Keep it under 100 words.
            `;
            
            const result = await aiClient.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [{ parts: [{ text: journalPrompt }] }],
            });
            
            const journalContent = result.text;
            if (journalContent) {
                addJournalEntry({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    content: journalContent,
                    isAutoGenerated: true
                });
            }
        } catch (e) {
            console.error("Failed to auto-generate journal", e);
        }
    }

    // Generate Core Memories
    // We only want to add significant memories. 
    // Let's ask the AI if there's anything worth remembering.
    try {
        const aiClient = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
        const memoryPrompt = `
            Analyze the following interaction and extract any *new* and *significant* facts about the user (${userProfile.name}) or their preferences that should be stored in long-term memory.
            
            Interaction:
            User: ${userMsg.content}
            AI: ${modelMsg.content}
            
            Existing Memories:
            ${memories.map(m => m.content).join('; ')}
            
            If there is a new, important fact, output it as a single concise sentence. 
            If there is nothing new or significant to remember, output "NOTHING".
            Do not output facts that are already in Existing Memories.
        `;
        
        const result = await aiClient.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: memoryPrompt }] }],
        });
        
        const memoryContent = result.text.trim();
        if (memoryContent && memoryContent !== "NOTHING" && !memoryContent.includes("NOTHING")) {
            addMemory({
                id: Date.now().toString(),
                content: memoryContent,
                strength: 5, // Default strength
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                isImportant: false,
            });
        }
    } catch (e) {
        console.error("Failed to auto-generate memory", e);
    }
  };

  const handleRegenerate = async (messageId?: string) => {
    if (chatHistory.length === 0 || isLoading) return;
    
    let newHistory = [...chatHistory];
    let targetUserMsg;
    let historyForGen;

    if (messageId) {
        // Find the index of the model message to regenerate
        const index = newHistory.findIndex(m => m.id === messageId);
        if (index === -1) return;
        
        // Check if previous is user
        if (index > 0 && newHistory[index-1].role === 'user') {
             targetUserMsg = newHistory[index-1];
             // Truncate history to include the user message, but remove the model message and everything after
             // The new state should include the user message
             const historyToKeep = newHistory.slice(0, index);
             setChatHistory(historyToKeep);
             
             // History for generation should NOT include the target user message (it's passed as current)
             historyForGen = newHistory.slice(0, index - 1);
        } else {
            return;
        }
    } else {
        // Default behavior: regenerate last
        if (newHistory[newHistory.length - 1].role === 'model') {
            newHistory.pop();
        }
        targetUserMsg = newHistory[newHistory.length - 1];
        historyForGen = newHistory.slice(0, -1);
        setChatHistory(newHistory);
    }

    if (!targetUserMsg || targetUserMsg.role !== 'user') return;

    setIsLoading(true);
    await generateResponse(historyForGen, targetUserMsg);
  };

  const handleEdit = async (id: string, newContent: string) => {
    // Find the message index
    const index = chatHistory.findIndex(m => m.id === id);
    if (index === -1) return;

    const message = chatHistory[index];
    
    // If content hasn't changed, just cancel edit
    if (message.content === newContent) {
        setEditingMessageId(null);
        return;
    }

    if (message.role === 'user') {
        if (window.confirm("Editing this message will restart the conversation from this point. Continue?")) {
            // Create new history up to this message
            const newHistory = chatHistory.slice(0, index + 1);
            
            // Update the content of the edited message
            newHistory[index] = { ...message, content: newContent };
            
            // Update state
            setChatHistory(newHistory);
            setEditingMessageId(null);

            setIsLoading(true);
            // We pass the history *before* this message, and the message itself as current
            const historyForGen = newHistory.slice(0, index);
            await generateResponse(historyForGen, newHistory[index]);
        }
    } else {
        // Just update the model message content without restarting
        updateChatMessage(id, newContent);
        setEditingMessageId(null);
    }
  };

  const handleDeleteMessage = (id: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      deleteChatMessage(id);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the chat history for this session?")) {
        clearHistory();
    }
  };

  const handleRenameSession = (id: string) => {
    if (newSessionTitle.trim()) {
        renameSession(id, newSessionTitle.trim());
        setEditingSessionId(null);
        setNewSessionTitle('');
    }
  };

  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 relative">
      {/* Sessions Sidebar */}
      <div className={`
        absolute inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out
        ${isSessionsSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 ${isSessionsSidebarOpen ? 'lg:w-64' : 'lg:w-0'}
      `}>
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Chat History</h3>
                <button 
                    onClick={() => createNewSession()}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                    title="New Chat"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.map((session) => (
                    <div 
                        key={session.id}
                        className={`
                            group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                            ${activeSessionId === session.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}
                        `}
                        onClick={() => switchSession(session.id)}
                    >
                        <div className="flex items-center space-x-3 overflow-hidden flex-1">
                            <MessageSquare className="w-4 h-4 flex-shrink-0" />
                            {editingSessionId === session.id ? (
                                <input 
                                    autoFocus
                                    className="bg-transparent border-b border-indigo-500 outline-none w-full text-sm"
                                    value={newSessionTitle}
                                    onChange={(e) => setNewSessionTitle(e.target.value)}
                                    onBlur={() => handleRenameSession(session.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSession(session.id)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="text-sm truncate">{session.title}</span>
                            )}
                        </div>
                        
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSessionId(session.id);
                                    setNewSessionTitle(session.title);
                                }}
                                className="p-1 hover:text-indigo-400"
                            >
                                <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("Delete this conversation?")) deleteSession(session.id);
                                }}
                                className="p-1 hover:text-red-400"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-4 border-t border-gray-800 text-xs text-gray-500 flex items-center justify-center">
                <History className="w-3 h-3 mr-2" />
                {sessions.length} Conversations
            </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50">
            <div className="flex items-center space-x-3">
                <button 
                    onClick={() => setIsSessionsSidebarOpen(!isSessionsSidebarOpen)}
                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors lg:block"
                    title="Toggle History"
                >
                    {isSessionsSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                {aiProfile.referenceImage && (
                    <img src={aiProfile.referenceImage} alt="AI" className="w-8 h-8 rounded-full object-cover" />
                )}
                <div>
                    <h2 className="font-bold text-indigo-900">{aiProfile.name}</h2>
                    <p className="text-[10px] text-indigo-500 uppercase tracking-tighter">
                        {sessions.find(s => s.id === activeSessionId)?.title || 'Chat'}
                    </p>
                </div>
                <button
                    onClick={handleCamera}
                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
                    title="Take Photo"
                >
                    <Camera className="w-4 h-4" />
                </button>
            </div>
            <div className="flex space-x-2 items-center">
                <button
                  onClick={() => setIsLiveApiActive(prev => !prev)}
                  className={`p-2 rounded-full ${isLiveApiActive ? 'bg-red-500 text-white hover:bg-red-600' : 'text-indigo-600 hover:bg-indigo-100'}`}
                  title={isLiveApiActive ? 'Deactivate Live Conversation' : 'Activate Live Conversation'}
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                onClick={handleClear}
                className="text-xs text-red-500 hover:text-red-700 px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                >
                Clear
                </button>
            </div>
        </div>
        
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
        {chatHistory?.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                className={`p-4 rounded-2xl shadow-sm relative group ${
                    msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                }`}
                >
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-3 space-y-2">
                        {msg.attachments.map((att, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden">
                                {att.type === 'image' ? (
                                    <img src={att.content} alt="Attachment" className="max-w-full h-auto rounded" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="bg-black/10 p-2 rounded text-xs flex items-center">
                                        <FileText className="w-4 h-4 mr-1" />
                                        {att.name} {att.type === 'pdf' ? '(PDF)' : ''}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Content */}
                {editingMessageId === msg.id ? (
                    <div className="w-full min-w-[200px]">
                        <textarea 
                            id={`edit-message-${msg.id}`}
                            className="w-full p-2 text-gray-800 rounded bg-white border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            defaultValue={msg.content}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleEdit(msg.id, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                    setEditingMessageId(null);
                                }
                            }}
                            autoFocus
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                            <button 
                                onClick={() => setEditingMessageId(null)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    const el = document.getElementById(`edit-message-${msg.id}`) as HTMLTextAreaElement;
                                    if (el) handleEdit(msg.id, el.value);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.content.split(/(\*.*?\*|\(.*?\))/g).map((part, i) => {
                            if (part.startsWith('*') && part.endsWith('*')) {
                                return <span key={i} className="italic text-indigo-400">{part}</span>;
                            } else if (part.startsWith('(') && part.endsWith(')')) {
                                return <span key={i} className="text-xs text-gray-400">{part}</span>;
                            }
                            return <span key={i}>{part}</span>;
                        })}
                    </div>
                )}

                {/* Grounding URLs */}
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                        {msg.groundingUrls.map((link, idx) => (
                            <a 
                                key={idx} 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors flex items-center"
                            >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                {link.title || "Source"}
                            </a>
                        ))}
                    </div>
                )}

                {/* Message Actions */}
                <div className={`flex items-center justify-end mt-2 pt-2 border-t space-x-1 ${msg.role === 'user' ? 'border-indigo-500/30 text-indigo-100' : 'border-gray-100 text-gray-400'}`}>
                    <button onClick={() => speakMessage(msg.content, msg.id)} className={`p-1.5 rounded hover:bg-black/10 transition-colors`} title="Read Aloud">
                        <Volume2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingMessageId(msg.id)} className={`p-1.5 rounded hover:bg-black/10 transition-colors`} title="Edit Message">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {msg.role === 'model' && (
                        <button onClick={() => handleRegenerate(msg.id)} className={`p-1.5 rounded hover:bg-black/10 transition-colors`} title="Regenerate Response">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => handleDeleteMessage(msg.id)} className={`p-1.5 rounded hover:bg-black/10 transition-colors hover:text-red-500`} title="Delete Message">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                </div>
                {showTimestamps && (
                    <span className="text-xs text-gray-400 mt-1 px-1 flex items-center space-x-1">
                        <span>
                            {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone })} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}
                        </span>
                        {msg.role === 'model' && readMessages.has(msg.id) && <span title="Read"><CheckCheck className="w-3 h-3 text-indigo-500" /></span>}
                    </span>
                )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex items-center space-x-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        {attachments.length > 0 && (
            <div className="flex space-x-2 mb-3 overflow-x-auto pb-2">
                {attachments.map((att, idx) => (
                    <div key={idx} className="relative flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center group">
                        {att.type === 'image' ? (
                            <img src={att.content} alt="preview" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="flex flex-col items-center justify-center">
                                <FileText className="w-6 h-6 text-gray-400" />
                                <span className="text-[10px] text-gray-500 truncate max-w-[50px]">{att.type === 'pdf' ? 'PDF' : 'TXT'}</span>
                            </div>
                        )}
                        <button 
                            onClick={() => removeAttachment(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        )}
        
        {/* Contextual Mode Indicators */}
        {(input.includes('*') || input.includes('(')) && (
            <div className="flex space-x-2 mb-2 px-1">
                {/\*.*?\*/.test(input) && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium flex items-center animate-in fade-in slide-in-from-bottom-1">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1"></span>
                        Action Mode
                    </span>
                )}
                {/\(.*?\)/.test(input) && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium flex items-center animate-in fade-in slide-in-from-bottom-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></span>
                        OOC Mode
                    </span>
                )}
            </div>
        )}
        
        <div className="flex items-end space-x-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
          <div className="flex space-x-1 pb-2">
            <input 
                type="file" 
                ref={imageInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageSelect} 
            />
            <input 
                type="file" 
                ref={cameraInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={handleImageSelect} 
            />
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".txt,.pdf,.md,.csv,.json" 
                onChange={handleFileSelect} 
            />
            <button 
                onClick={() => imageInputRef.current?.click()} 
                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-200"
                title="Upload Image"
            >
                <ImageIcon className="w-5 h-5" />
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-200"
                title="Upload File"
            >
                <Paperclip className="w-5 h-5" />
            </button>
            <button 
                onClick={toggleListening} 
                className={`p-2 transition-colors rounded-full hover:bg-gray-200 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-indigo-600'}`}
                title="Voice Input"
            >
                <Mic className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 max-h-32 overflow-y-auto relative min-h-[44px]">
              <div className="relative min-h-full">
                  {/* Renderer - drives height */}
                  <div className="p-2 whitespace-pre-wrap break-words text-gray-800 font-sans text-sm leading-relaxed border border-transparent min-h-[40px]">
                     {!input && <span className="text-gray-400">Message indigo...</span>}
                     {input.split(/(\*.*?\*|\(.*?\))/g).map((part, i) => {
                         if (part.startsWith('*') && part.endsWith('*')) {
                             return <span key={i} className="italic text-indigo-600">{part}</span>;
                         } else if (part.startsWith('(') && part.endsWith(')')) {
                             return <span key={i} className="font-bold text-gray-600">{part}</span>;
                         }
                         return <span key={i}>{part}</span>;
                     })}
                     {input.endsWith('\n') && <br />}
                  </div>
                  
                  {/* Input - matches size */}
                  <textarea
                     ref={textareaRef}
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSend();
                         }
                     }}
                     className="absolute inset-0 w-full h-full p-2 bg-transparent text-transparent caret-gray-800 resize-none overflow-hidden focus:outline-none font-sans text-sm leading-relaxed"
                     style={{ color: 'transparent' }}
                     disabled={isUploading}
                     spellCheck={false}
                  />
              </div>
          </div>
          
          <button
            onClick={handleSend}
            disabled={isLoading || isUploading || (!input.trim() && attachments.length === 0)}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-1"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
            AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  </div>
  );
};

export default ChatScreen;
