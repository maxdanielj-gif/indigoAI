import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Trash2, Copy, Upload } from 'lucide-react';

const GalleryScreen: React.FC = () => {
  const { gallery, deleteImageFromGallery, addToGallery } = useApp();
  const [activeTab, setActiveTab] = useState<'generated' | 'uploaded'>('generated');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          addToGallery({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: 'uploaded',
            url: event.target.result as string,
            timestamp: Date.now()
          });
          setActiveTab('uploaded');
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredGallery = (Array.isArray(gallery) ? gallery : []).filter(item => item.type === activeTab);

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt).then(() => {
      alert("Prompt copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy prompt: ", err);
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this image from the gallery?")) {
      deleteImageFromGallery(id);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md min-h-[80vh]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-indigo-600">Gallery</h2>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium"
            >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUpload} 
                accept="image/*" 
                className="hidden" 
            />
        </div>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('generated')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'generated' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                Generated
            </button>
            <button
                onClick={() => setActiveTab('uploaded')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'uploaded' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                Uploaded
            </button>
        </div>
      </div>

      {filteredGallery.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <p>No {activeTab} images yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGallery.map((item) => (
            <div key={item.id} className="bg-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="aspect-square overflow-hidden rounded-t-lg">
                    <img src={item.url} alt="Gallery Item" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center justify-center space-x-2 p-2 bg-gray-50 border-t border-gray-200">
                    <a 
                        href={item.url} 
                        download={`${activeTab}-${item.id}.png`}
                        className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors shadow-sm" 
                        title="Download"
                    >
                        <Download className="w-4 h-4" />
                    </a>
                    <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-white text-red-500 rounded-full hover:bg-red-100 transition-colors shadow-sm"
                        title="Delete Image"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {item.prompt && (
                        <button
                            onClick={() => handleCopyPrompt(item.prompt!)}
                            className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors shadow-sm"
                            title="Copy Prompt"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {item.prompt && (
                    <div className="p-2 text-gray-700 text-xs truncate">
                        {item.prompt}
                    </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GalleryScreen;
