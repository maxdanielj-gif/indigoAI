import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useApp } from '../context/AppContext';
import { Upload, X } from 'lucide-react';

const ImageGeneratorScreen: React.FC = () => {
  const { aiProfile, addToGallery, apiKey } = useApp();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [poseReferenceImage, setPoseReferenceImage] = useState<string | null>(null);
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
      const fullPrompt = `
        Generate an image of ${prompt}
        
        IMPORTANT: The character in the image MUST resemble the following description and reference image (if provided).
        
        Character Appearance Description:
        ${aiProfile.appearance}
      `;

      const parts: any[] = [{ text: fullPrompt }];

      // Add reference image if available
      if (aiProfile.referenceImage) {
        try {
            // Extract mimeType from data URL (e.g., "data:image/png;base64,...")
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
            } else {
                 console.warn("Invalid reference image format");
            }
        } catch (e) {
            console.error("Error parsing reference image", e);
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

      // Use gemini-2.5-flash-image for image generation
      // Note: For image editing/variation based on reference, we pass the image in contents.
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts,
        },
        config: {
          // No system instruction for image model
          // Add imageConfig for aspect ratio
          // @ts-ignore - The types might not be fully updated for this specific field yet in all environments
          imageConfig: {
            aspectRatio: aspectRatio,
          }
        },
      });

      let imageUrl = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            imageUrl = `data:image/png;base64,${base64EncodeString}`;
            break;
          }
        }
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
        console.warn('No image generated');
        alert("Failed to generate image. The model might have refused the request.");
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert("Error generating image. Please try again.");
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

            <div className="bg-indigo-50 p-4 rounded-md text-sm text-indigo-800">
                <p className="font-semibold mb-1">Context Applied:</p>
                <p className="opacity-80 line-clamp-3">{aiProfile.appearance || "No appearance defined in AI Persona."}</p>
                {aiProfile.referenceImage && (
                    <div className="mt-2 flex items-center text-xs">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Reference Image Active
                    </div>
                )}
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
