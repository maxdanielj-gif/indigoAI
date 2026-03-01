import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useApp } from '../context/AppContext';
import { Upload, X, Image as ImageIcon, Video as VideoIcon, Download } from 'lucide-react';
import { generateImage, generateVideo } from '../services/huggingface';

const ImageGeneratorScreen: React.FC = () => {
  const { aiProfile, addToGallery, apiKey } = useApp();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [genType, setGenType] = useState<'image' | 'video'>('image');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
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
      const fullPrompt = `A high quality ${genType} of ${prompt}. Appearance: ${aiProfile.appearance}. Style: Photorealistic, cinematic lighting.`;

      if (genType === 'image') {
        if (aiProfile.hfApiKey) {
          // Use Hugging Face FLUX
          const blob = await generateImage({
            prompt: fullPrompt,
            token: aiProfile.hfApiKey
          });
          const reader = new FileReader();
          reader.onloadend = () => {
            const imageUrl = reader.result as string;
            setGeneratedImage(imageUrl);
            setGeneratedVideo(null);
            addToGallery({
              id: Date.now().toString(),
              type: 'generated',
              url: imageUrl,
              prompt: prompt,
              timestamp: Date.now()
            });
          };
          reader.readAsDataURL(blob);
        } else {
          // Fallback to Gemini
          const aiClient = getAiClient();
          const parts: any[] = [{ text: fullPrompt }];
          if (aiProfile.referenceImage) {
            const matches = aiProfile.referenceImage.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
            }
          }
          const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { imageConfig: { aspectRatio } } as any,
          });
          let imageUrl = null;
          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
              }
            }
          }
          if (imageUrl) {
            setGeneratedImage(imageUrl);
            setGeneratedVideo(null);
            addToGallery({
              id: Date.now().toString(),
              type: 'generated',
              url: imageUrl,
              prompt: prompt,
              timestamp: Date.now()
            });
          }
        }
      } else {
        // Video Generation
        if (!aiProfile.hfApiKey) {
          alert("Hugging Face API Token is required for video generation.");
          setIsLoading(false);
          return;
        }
        const blob = await generateVideo({
          prompt: fullPrompt,
          token: aiProfile.hfApiKey
        });
        const videoUrl = URL.createObjectURL(blob);
        setGeneratedVideo(videoUrl);
        setGeneratedImage(null);
        // Note: Gallery currently only supports images, so we don't add video to gallery yet
      }
    } catch (error: any) {
      console.error(`Error generating ${genType}:`, error);
      alert(`Error generating ${genType}: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-indigo-600">Image Generator</h2>
      
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setGenType('image')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 transition-all ${genType === 'image' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
        >
          <ImageIcon className="w-5 h-5" />
          Image
        </button>
        <button 
          onClick={() => setGenType('video')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 transition-all ${genType === 'video' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
        >
          <VideoIcon className="w-5 h-5" />
          Video
        </button>
      </div>

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
                        <Download className="w-4 h-4" />
                    </a>
                </div>
            ) : generatedVideo ? (
                <div className="relative w-full h-full group">
                    <video src={generatedVideo} controls className="w-full h-full rounded-lg" />
                    <a 
                        href={generatedVideo} 
                        download={`generated-${Date.now()}.mp4`}
                        className="absolute bottom-4 right-4 bg-white text-gray-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Download className="w-4 h-4" />
                    </a>
                </div>
            ) : (
                <div className="text-center text-gray-400 p-4">
                    <p>Generated {genType} will appear here</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageGeneratorScreen;
