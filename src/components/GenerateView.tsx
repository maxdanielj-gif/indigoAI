import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Menu, ImagePlus, Video, Loader2, Download, X } from 'lucide-react';

const GenerateView: React.FC = () => {
  const {
    settings, toggleSidebar, generateHfImage, generateHfVideo,
    isGeneratingImage, isGeneratingVideo,
  } = useAppContext();

  const [imagePrompt, setImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setError(null);
    setGeneratedImage(null);
    const url = await generateHfImage(imagePrompt.trim());
    if (url) {
      setGeneratedImage(url);
    } else {
      setError('Image generation failed. Check your HF API token and try again. The model may be loading (503) — wait a minute and retry.');
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) return;
    setError(null);
    setGeneratedVideo(null);
    const url = await generateHfVideo(videoPrompt.trim());
    if (url) {
      setGeneratedVideo(url);
    } else {
      setError('Video generation failed. Check your HF API token and try again. The model may be loading (503) — wait a minute and retry.');
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `hf-flux-${Date.now()}.png`;
    a.click();
  };

  const handleDownloadVideo = () => {
    if (!generatedVideo) return;
    const a = document.createElement('a');
    a.href = generatedVideo;
    a.download = `hf-cogvideo-${Date.now()}.mp4`;
    a.click();
  };

  const hasHfKey = !!settings.hfApiKey;

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800/50 shrink-0">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
          <Menu size={22} />
        </button>
        <h1 className="text-white font-semibold flex-1">Generate</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!hasHfKey && (
          <div className="p-4 bg-amber-950/40 rounded-xl border border-amber-700/30">
            <p className="text-sm text-amber-300">
              Hugging Face API token required. Go to <strong>Settings &gt; Hugging Face API</strong> and enter your token.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/40 rounded-lg border border-red-700/30 flex items-start gap-2">
            <X size={14} className="text-red-400 mt-0.5 shrink-0 cursor-pointer" onClick={() => setError(null)} />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Image Generation */}
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/30 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ImagePlus size={18} className="text-indigo-400" />
            <h2 className="text-sm font-medium text-white">Text-to-Image (FLUX)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Generate images using Hugging Face FLUX.1-dev model. Describe the image you want to create.
          </p>
          <div className="flex gap-2">
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="flex-1 bg-slate-700/50 text-white text-sm rounded-lg px-3 py-2.5 border border-slate-600 focus:border-indigo-500 focus:outline-none resize-none placeholder-slate-500"
              rows={3}
            />
          </div>
          <button
            onClick={handleGenerateImage}
            disabled={!imagePrompt.trim() || isGeneratingImage || !hasHfKey}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isGeneratingImage ? (
              <><Loader2 size={16} className="animate-spin" /> Generating Image...</>
            ) : (
              <><ImagePlus size={16} /> Generate Image</>
            )}
          </button>

          {generatedImage && (
            <div className="space-y-2">
              <img src={generatedImage} alt="Generated" className="w-full rounded-lg border border-slate-700/30" />
              <button
                onClick={handleDownloadImage}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs rounded-lg transition-colors"
              >
                <Download size={14} /> Download Image
              </button>
            </div>
          )}
        </div>

        {/* Video Generation */}
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/30 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-violet-400" />
            <h2 className="text-sm font-medium text-white">Text-to-Video (CogVideo)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Generate short videos using Hugging Face CogVideoX-2b model. Describe the video you want to create.
          </p>
          <div className="flex gap-2">
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              className="flex-1 bg-slate-700/50 text-white text-sm rounded-lg px-3 py-2.5 border border-slate-600 focus:border-violet-500 focus:outline-none resize-none placeholder-slate-500"
              rows={3}
            />
          </div>
          <button
            onClick={handleGenerateVideo}
            disabled={!videoPrompt.trim() || isGeneratingVideo || !hasHfKey}
            className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isGeneratingVideo ? (
              <><Loader2 size={16} className="animate-spin" /> Generating Video...</>
            ) : (
              <><Video size={16} /> Generate Video</>
            )}
          </button>

          {generatedVideo && (
            <div className="space-y-2">
              <video src={generatedVideo} controls className="w-full rounded-lg border border-slate-700/30" />
              <button
                onClick={handleDownloadVideo}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs rounded-lg transition-colors"
              >
                <Download size={14} /> Download Video
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateView;
