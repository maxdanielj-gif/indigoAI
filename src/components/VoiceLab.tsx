import React, { useState } from 'react';
import { Mic, Upload, Play, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { AIProfile } from '../types';

interface VoiceLabProps {
  voiceProvider: 'gemini' | 'elevenlabs';
  setVoiceProvider: (provider: 'gemini' | 'elevenlabs') => void;
  voiceTab: 'gemini' | 'clone' | 'library';
  setVoiceTab: (tab: 'gemini' | 'clone' | 'library') => void;
  elevenLabsVoiceId: string | null;
  setElevenLabsVoiceId: (id: string | null) => void;
  elevenLabsModelId: string;
  setElevenLabsModelId: (id: string) => void;
  customVoiceSample: string | null;
  setCustomVoiceSample: (sample: string | null) => void;
  voiceDescription: string;
  setVoiceDescription: (desc: string) => void;
  isAnalyzingVoice: boolean;
  isCloningVoice: boolean;
  isLoadingLibraryVoices: boolean;
  elevenLabsLibraryVoices: any[];
  handleVoiceSampleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnalyzeVoice: () => void;
  handleCloneVoiceElevenLabs: () => void;
  fetchElevenLabsVoices: () => void;
  voiceSpeed: number;
}

const VoiceLab: React.FC<VoiceLabProps> = ({
  voiceProvider, setVoiceProvider, voiceTab, setVoiceTab,
  elevenLabsVoiceId, setElevenLabsVoiceId, elevenLabsModelId, setElevenLabsModelId,
  customVoiceSample, setCustomVoiceSample, voiceDescription, setVoiceDescription,
  isAnalyzingVoice, isCloningVoice, isLoadingLibraryVoices, elevenLabsLibraryVoices,
  handleVoiceSampleUpload, handleAnalyzeVoice, handleCloneVoiceElevenLabs,
  fetchElevenLabsVoices, voiceSpeed
}) => {
  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-indigo-600 flex items-center">
          <Mic className="w-5 h-5 mr-2" />
          Voice Lab (Custom Voice Models)
        </h3>
        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">Beta</span>
      </div>
      
      <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
        <p className="text-sm text-gray-600 mb-4">
          Upload a short audio sample (max 2MB) of the voice you want your persona to have. You can either use Gemini to find a close match or use ElevenLabs for true voice cloning.
        </p>
        
        <div className="flex space-x-2 mb-4">
          <button 
            onClick={() => {
              setVoiceProvider('gemini');
              setVoiceTab('gemini');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${voiceTab === 'gemini' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
          >
            Gemini (Match)
          </button>
          <button 
            onClick={() => {
              setVoiceProvider('elevenlabs');
              setVoiceTab('clone');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${voiceTab === 'clone' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
          >
            ElevenLabs (Clone)
          </button>
          <button 
            onClick={() => {
              setVoiceProvider('elevenlabs');
              setVoiceTab('library');
              if (elevenLabsLibraryVoices.length === 0) fetchElevenLabsVoices();
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${voiceTab === 'library' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
          >
            ElevenLabs (Library)
          </button>
        </div>

        {voiceTab === 'gemini' && (
          <div className="mb-4 p-2 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-700">
            <strong>Gemini Matching:</strong> Matches your sample against prebuilt voices (Puck, Charon, Kore, Fenrir, Zephyr) and tunes parameters.
          </div>
        )}
        
        {voiceTab === 'clone' && (
          <div className="mb-4 p-2 bg-emerald-50 border border-emerald-100 rounded text-[10px] text-emerald-700">
            <strong>ElevenLabs Cloning:</strong> Creates a true digital clone of the voice. Requires an ElevenLabs API Key in settings.
            {elevenLabsVoiceId && <div className="mt-1 font-mono">Voice ID: {elevenLabsVoiceId}</div>}
            <div className="mt-2">
              <label className="block font-bold mb-1">Model:</label>
              <select 
                value={elevenLabsModelId || 'eleven_multilingual_v2'} 
                onChange={(e) => setElevenLabsModelId(e.target.value)}
                className="w-full p-1 bg-white border border-emerald-200 rounded text-[10px]"
              >
                <option value="eleven_multilingual_v2">Multilingual v2 (Best Quality)</option>
                <option value="eleven_flash_v2_5">Flash v2.5 (Fastest)</option>
                <option value="eleven_monolingual_v1">Monolingual v1 (Legacy)</option>
              </select>
            </div>
          </div>
        )}

        {voiceTab === 'library' && (
          <div className="mb-4 p-2 bg-indigo-50 border border-indigo-100 rounded text-[10px] text-indigo-700">
            <strong>ElevenLabs Library:</strong> Choose from a wide range of professional pre-made voices.
            {elevenLabsVoiceId && <div className="mt-1 font-mono text-indigo-900">Selected Voice ID: {elevenLabsVoiceId}</div>}
            <div className="mt-2">
              <label className="block font-bold mb-1">Model:</label>
              <select 
                value={elevenLabsModelId || 'eleven_multilingual_v2'} 
                onChange={(e) => setElevenLabsModelId(e.target.value)}
                className="w-full p-1 bg-white border border-indigo-200 rounded text-[10px]"
              >
                <option value="eleven_multilingual_v2">Multilingual v2 (Best Quality)</option>
                <option value="eleven_flash_v2_5">Flash v2.5 (Fastest)</option>
                <option value="eleven_monolingual_v1">Monolingual v1 (Legacy)</option>
              </select>
            </div>
          </div>
        )}
        
        {voiceTab !== 'library' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Voice Sample</label>
              <div className="flex items-center space-x-3">
                <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100/50 transition-colors">
                  <div className="flex flex-col items-center">
                    <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                    <span className="text-xs text-indigo-600 font-medium">
                      {customVoiceSample ? 'Replace Sample' : 'Upload Sample'}
                    </span>
                  </div>
                  <input type="file" accept="audio/*" onChange={handleVoiceSampleUpload} className="hidden" />
                </label>
                
                {customVoiceSample && (
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => {
                        const audio = new Audio(customVoiceSample);
                        audio.play();
                      }}
                      className="p-2 bg-white text-indigo-600 rounded-full shadow-sm hover:bg-indigo-50 border border-indigo-100"
                      title="Play Sample"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCustomVoiceSample(null)}
                      className="p-2 bg-white text-red-500 rounded-full shadow-sm hover:bg-red-50 border border-red-100"
                      title="Remove Sample"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {voiceTab === 'gemini' ? (
                <button 
                  onClick={handleAnalyzeVoice}
                  disabled={!customVoiceSample || isAnalyzingVoice}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                >
                  {isAnalyzingVoice ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Find Match
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handleCloneVoiceElevenLabs}
                  disabled={!customVoiceSample || isCloningVoice}
                  className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                >
                  {isCloningVoice ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cloning...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Clone Voice
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Voice Profile Description</label>
              <textarea 
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                placeholder="AI will generate this description after analysis..."
                className="w-full h-[100px] p-3 text-sm border border-indigo-100 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Available Voices</label>
              <button 
                onClick={fetchElevenLabsVoices}
                className="text-[10px] text-indigo-600 hover:underline flex items-center"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Refresh List
              </button>
            </div>
            
            <div className="max-h-[250px] overflow-y-auto border border-indigo-100 rounded-lg bg-white divide-y divide-indigo-50">
              {isLoadingLibraryVoices ? (
                <div className="p-8 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-xs">Loading ElevenLabs voices...</span>
                </div>
              ) : elevenLabsLibraryVoices.length > 0 ? (
                elevenLabsLibraryVoices.map((v) => (
                  <div 
                    key={v.voice_id}
                    className={`p-3 flex items-center justify-between hover:bg-indigo-50/50 cursor-pointer transition-colors ${elevenLabsVoiceId === v.voice_id ? 'bg-indigo-50' : ''}`}
                    onClick={() => setElevenLabsVoiceId(v.voice_id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className="text-sm font-bold text-gray-900 truncate">{v.name}</span>
                        {v.labels?.accent && (
                          <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded uppercase">{v.labels.accent}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {v.labels?.gender} • {v.labels?.age} • {v.labels?.use_case}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {v.preview_url && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const audio = new Audio(v.preview_url);
                            audio.play();
                          }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-full"
                          title="Preview Voice"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${elevenLabsVoiceId === v.voice_id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                        {elevenLabsVoiceId === v.voice_id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No voices found. Make sure your API key is valid.
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Voice Profile Description</label>
              <textarea 
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                placeholder="Describe the selected voice (optional)..."
                className="w-full h-[80px] p-3 text-sm border border-indigo-100 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceLab;
