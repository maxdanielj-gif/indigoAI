import React, { useState, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  Menu, Download, Trash2, Hash, X, CheckSquare, Square, Image as ImageIcon,
  Copy, ArrowLeft, Upload, Loader2, Package
} from 'lucide-react';

type GalleryTab = 'generated' | 'uploaded' | 'all';

const GalleryView: React.FC = () => {
  const { images, deleteImages, updateImageHashtags, toggleSidebar, addImage } = useAppContext();
  const [activeTab, setActiveTab] = useState<GalleryTab>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [editingHashtags, setEditingHashtags] = useState<string | null>(null);
  const [hashtagInput, setHashtagInput] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);

  const filteredImages = images.filter(img => {
    if (activeTab === 'all') return true;
    return img.type === activeTab;
  }).sort((a, b) => b.timestamp - a.timestamp);

  const viewedImage = viewingImage ? images.find(i => i.id === viewingImage) : null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredImages.map(i => i.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} image(s)?`)) {
      await deleteImages(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const handleBatchDownload = async () => {
    // Download individually since we can't use JSZip without adding dependency
    const selected = images.filter(i => selectedIds.has(i.id));
    for (const img of selected) {
      downloadImage(img.dataUrl, `indigo_${img.type}_${img.id.slice(0, 8)}.png`);
      await new Promise(r => setTimeout(r, 300)); // stagger downloads
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      addImage(dataUrl, 'uploaded', undefined, [], 'Gallery upload');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveHashtags = (id: string) => {
    const tags = hashtagInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    updateImageHashtags(id, tags);
    setEditingHashtags(null);
    setHashtagInput('');
  };

  // Full image view
  if (viewedImage) {
    return (
      <div className="flex flex-col h-full bg-slate-950">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800/50 shrink-0">
          <button onClick={() => setViewingImage(null)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <span className="text-white font-medium text-sm flex-1 truncate">Image Details</span>
          <button
            onClick={() => downloadImage(viewedImage.dataUrl, `indigo_${viewedImage.id.slice(0, 8)}.png`)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => { deleteImages([viewedImage.id]); setViewingImage(null); }}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <img src={viewedImage.dataUrl} alt="" className="w-full rounded-xl shadow-lg" />
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                viewedImage.type === 'generated' ? 'bg-indigo-600/20 text-indigo-300' : 'bg-emerald-600/20 text-emerald-300'
              }`}>
                {viewedImage.type}
              </span>
              <span className="text-xs text-slate-500">{new Date(viewedImage.timestamp).toLocaleString()}</span>
            </div>
            {viewedImage.prompt && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 font-medium">Prompt</span>
                  <button onClick={() => copyPrompt(viewedImage.prompt!)} className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-indigo-400">
                    <Copy size={12} />
                  </button>
                </div>
                <p className="text-sm text-slate-300">{viewedImage.prompt}</p>
              </div>
            )}
            {viewedImage.chatContext && (
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/30">
                <span className="text-xs text-slate-400 font-medium">Context</span>
                <p className="text-sm text-slate-300 mt-1">{viewedImage.chatContext}</p>
              </div>
            )}
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium">Hashtags</span>
                <button
                  onClick={() => {
                    setEditingHashtags(viewedImage.id);
                    setHashtagInput(viewedImage.hashtags.join(', '));
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Edit
                </button>
              </div>
              {editingHashtags === viewedImage.id ? (
                <div className="flex gap-2">
                  <input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="flex-1 bg-slate-700/50 text-white text-xs rounded px-2 py-1 border border-slate-600 focus:outline-none"
                  />
                  <button onClick={() => saveHashtags(viewedImage.id)} className="text-xs text-green-400 hover:text-green-300">Save</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {viewedImage.hashtags.length > 0 ? viewedImage.hashtags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-slate-700/50 text-indigo-300 text-xs rounded-full">#{t}</span>
                  )) : <span className="text-xs text-slate-500">No hashtags</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800/50 shrink-0">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
          <Menu size={22} />
        </button>
        <h1 className="text-white font-semibold flex-1">Gallery</h1>
        <button
          onClick={() => uploadRef.current?.click()}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400"
          title="Upload image"
        >
          <Upload size={18} />
        </button>
        <button
          onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
          className={`p-2 rounded-lg transition-colors ${selectMode ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
        >
          <CheckSquare size={18} />
        </button>
      </div>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-2 shrink-0">
        {(['all', 'generated', 'uploaded'] as GalleryTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({images.filter(i => tab === 'all' || i.type === tab).length})
          </button>
        ))}
      </div>

      {/* Batch actions */}
      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 shrink-0">
          <button onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300">
            {selectedIds.size === filteredImages.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button onClick={handleBatchDownload} className="p-2 rounded-lg bg-slate-800/60 text-indigo-400 hover:text-indigo-300" title="Download selected">
            <Package size={16} />
          </button>
          <button onClick={handleBatchDelete} className="p-2 rounded-lg bg-slate-800/60 text-red-400 hover:text-red-300" title="Delete selected">
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ImageIcon size={48} className="text-slate-700 mb-3" />
            <p className="text-slate-400 text-sm">No images yet</p>
            <p className="text-slate-500 text-xs mt-1">Generate or upload images to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredImages.map(img => (
              <div
                key={img.id}
                className="relative group rounded-xl overflow-hidden bg-slate-800/40 border border-slate-700/30 hover:border-indigo-500/30 transition-all"
                onClick={() => selectMode ? toggleSelect(img.id) : setViewingImage(img.id)}
              >
                <div className="aspect-square">
                  <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Select overlay */}
                {selectMode && (
                  <div className="absolute top-2 left-2">
                    {selectedIds.has(img.id) ? (
                      <CheckSquare size={20} className="text-indigo-400" />
                    ) : (
                      <Square size={20} className="text-slate-400" />
                    )}
                  </div>
                )}

                {/* Hover overlay */}
                {!selectMode && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          img.type === 'generated' ? 'bg-indigo-600/40 text-indigo-200' : 'bg-emerald-600/40 text-emerald-200'
                        }`}>
                          {img.type}
                        </span>
                        <div className="flex gap-1">
                          {img.prompt && (
                            <button
                              onClick={(e) => { e.stopPropagation(); copyPrompt(img.prompt!); }}
                              className="p-1 rounded bg-black/40 text-white/70 hover:text-white"
                              title="Copy prompt"
                            >
                              <Copy size={12} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadImage(img.dataUrl, `indigo_${img.id.slice(0, 8)}.png`); }}
                            className="p-1 rounded bg-black/40 text-white/70 hover:text-white"
                            title="Download"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteImages([img.id]); }}
                            className="p-1 rounded bg-black/40 text-white/70 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryView;
