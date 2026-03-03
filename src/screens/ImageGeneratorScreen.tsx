import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useApp } from '../context/AppContext';
import { Upload, X } from 'lucide-react';

const ImageGeneratorScreen: React.FC = () => {
  const { aiProfile, userProfile, addToGallery, apiKey } = useApp();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [poseReferenceImage, setPoseReferenceImage] = useState<string | null>(null);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
  const [useUserReference, setUseUserReference] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPoseReferenceImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Initialize AI client with user key or default env key
  const getAiClient = () => {
      return new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY! });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const aiClient = getAiClient();
      // Construct full prompt with AI appearance
      let fullPrompt = `
        Generate a safe, high-quality, and non-suggestive image of ${prompt}.
        
        IMPORTANT: The character in the image MUST strictly resemble the following description and reference image (if provided). Ensure the image is appropriate and follows all safety guidelines.
        
        Character Appearance Description:
        ${aiProfile.appearance}
      `;

      if (useUserReference && userProfile.appearance) {
          fullPrompt += `\n\nUser Appearance (for context if they are in the scene): ${userProfile.appearance}`;
      }

      const parts: any[] = [{ text: fullPrompt }];

      // Add AI reference image if available
      if (aiProfile.referenceImage) {
        try {
            const matches = aiProfile.referenceImage.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
            }
        } catch (e) {
            console.error("Error parsing AI reference image", e);
        }
      }

      // Add User reference image if enabled and available
      if (useUserReference && userProfile.referenceImage) {
        try {
            const matches = userProfile.referenceImage.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
                parts[0].text += `\n\nNote: A reference image for the user has also been provided. Use it if the user is depicted in the scene.`;
            }
        } catch (e) {
            console.error("Error parsing user reference image", e);
        }
      }

      // Add pose reference image if available
      if (poseReferenceImage) {
        try {
            const matches = poseReferenceImage.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
                
                // Add instruction about pose
                parts[0].text += `\n\nIMPORTANT: Use the provided image as a pose reference.`;
            }
        } catch (e) {
            console.error("Error parsing pose reference image", e);
        }
      }

      // Add selected background reference image if available
      if (selectedBackgroundId && aiProfile.backgroundImages) {
        const bg = aiProfile.backgroundImages.find(b => b.id === selectedBackgroundId);
        if (bg) {
            try {
                const matches = bg.url.match(/^data:(.+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const mimeType = matches[1];
                    const base64Data = matches[2];
                    
                    parts.push({
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    });
                    
                    // Add instruction about background
                    parts[0].text += `\n\nIMPORTANT: Use the provided image of the ${bg.name} as the background reference to maintain consistency.`;
                }
            } catch (e) {
                console.error("Error parsing background reference image", e);
            }
        }
      }

      // Use gemini-3.1-flash-image-preview for high-quality image generation
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts,
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: "1K"
          }
        },
      });

      let imageUrl = null;
      let modelResponseText = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            imageUrl = `data:image/png;base64,${base64EncodeString}`;
          } else if (part.text) {
            modelResponseText += part.text;
          }
        }
      }

      if (!imageUrl) {
        const errorMsg = modelResponseText ? `Gemini returned text instead of an image: ${modelResponseText}` : "No image data returned from Gemini.";
        throw new Error(errorMsg);
      }

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        addToGallery({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: 'generated',
            url: imageUrl,
            prompt: prompt,
            timestamp: Date.now()
        });
      } else {
        const finishReason = response.candidates?.[0]?.finishReason;
        let errorMsg = 'No image data received from Gemini API.';
        if (modelResponseText) {
            errorMsg = `Model response: ${modelResponseText}`;
        } else if (finishReason) {
            errorMsg = `Generation stopped. Reason: ${finishReason}`;
        }
        console.warn('No image generated:', errorMsg);
        alert(`Failed to generate image: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      if (error.message?.includes("Requested entity was not found")) {
          window.dispatchEvent(new CustomEvent('aistudio:reset-key'));
      }
      alert(`Error generating image: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-indigo-600">Image Generator</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe the image you want to generate..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
                <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                    <option value="1:1">1:1 (Square)</option>
                    <option value="3:4">3:4 (Portrait)</option>
                    <option value="4:3">4:3 (Landscape)</option>
                    <option value="9:16">9:16 (Tall Portrait)</option>
                    <option value="16:9">16:9 (Wide Landscape)</option>
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pose Reference (Optional)</label>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageSelect} 
                    className="hidden" 
                    ref={fileInputRef}
                />
                {poseReferenceImage ? (
                    <div className="relative inline-block mt-2">
                        <img src={poseReferenceImage} alt="Pose Reference" className="h-24 w-24 object-cover rounded-md border border-gray-300" />
                        <button 
                            onClick={() => setPoseReferenceImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 hover:border-indigo-300 transition-colors"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Pose Reference
                    </button>
                )}
                <p className="text-xs text-gray-500 mt-1">This image will only be used for the current prompt to guide the pose.</p>
            </div>

            {aiProfile.backgroundImages && aiProfile.backgroundImages.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Reference (Consistent)</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setSelectedBackgroundId(null)}
                            className={`p-2 border rounded-md text-[10px] font-medium transition-all ${!selectedBackgroundId ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                        >
                            None
                        </button>
                        {aiProfile.backgroundImages.map((bg) => (
                            <button
                                key={bg.id}
                                onClick={() => setSelectedBackgroundId(bg.id)}
                                className={`p-1 border rounded-md transition-all relative group ${selectedBackgroundId === bg.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-300'}`}
                            >
                                <div className="aspect-video rounded overflow-hidden bg-gray-100 mb-1">
                                    <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                                </div>
                                <span className={`block text-[10px] font-medium truncate ${selectedBackgroundId === bg.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                                    {bg.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">Use User Reference</span>
                    <span className="text-[10px] text-gray-500">Include your appearance in the generation</span>
                </div>
                <button 
                    onClick={() => setUseUserReference(!useUserReference)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useUserReference ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useUserReference ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            <div className="bg-indigo-50 p-4 rounded-md text-sm text-indigo-800">
                <p className="font-semibold mb-1">Context Applied:</p>
                <div className="space-y-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">AI Persona</p>
                        <p className="opacity-80 line-clamp-2">{aiProfile.appearance || "No appearance defined."}</p>
                    </div>
                    {useUserReference && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">User Profile</p>
                            <p className="opacity-80 line-clamp-2">{userProfile.appearance || "No appearance defined."}</p>
                        </div>
                    )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {aiProfile.referenceImage && (
                        <div className="flex items-center text-[10px] bg-white/50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                            AI Ref Image
                        </div>
                    )}
                    {useUserReference && userProfile.referenceImage && (
                        <div className="flex items-center text-[10px] bg-white/50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                            User Ref Image
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium shadow-sm flex items-center justify-center"
            >
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Generating...
                    </>
                ) : 'Generate Image'}
            </button>
        </div>

        <div className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 min-h-[300px]">
            {generatedImage ? (
                <div className="relative w-full h-full group">
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-contain rounded-lg" />
                    <a 
                        href={generatedImage} 
                        download={`generated-${Date.now()}.png`}
                        className="absolute bottom-4 right-4 bg-white text-gray-800 px-3 py-1 rounded shadow-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        Download
                    </a>
                </div>
            ) : (
                <div className="text-center text-gray-400 p-4">
                    <p>Generated image will appear here</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageGeneratorScreen;
