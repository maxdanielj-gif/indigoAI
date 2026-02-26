import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, Edit, Save, XCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MemoryScreen: React.FC = () => {
  const { memories, updateMemory, deleteMemory, addToast } = useApp();
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');

  const handleEditClick = (memoryId: string, content: string) => {
    setEditingMemoryId(memoryId);
    setEditedContent(content);
  };

  const handleSaveEdit = (memoryId: string) => {
    if (editedContent.trim() === '') {
      addToast({ title: "Error", message: "Memory content cannot be empty.", type: "error" });
      return;
    }
    updateMemory(memoryId, { content: editedContent.trim() });
    setEditingMemoryId(null);
    setEditedContent('');
    addToast({ title: "Memory Updated", message: "Memory updated successfully.", type: "success" });
  };

  const handleCancelEdit = () => {
    setEditingMemoryId(null);
    setEditedContent('');
  };

  const handleDeleteMemory = (memoryId: string) => {
    if (window.confirm("Are you sure you want to delete this memory? This action cannot be undone.")) {
      deleteMemory(memoryId);
      addToast({ title: "Memory Deleted", message: "Memory deleted successfully.", type: "success" });
    }
  };

  const sortedMemories = [...memories].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-indigo-600">AI Memory Management</h2>

      {memories.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">No memories stored yet.</p>
          <p className="text-sm mt-2">The AI will start forming memories as you interact with it.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedMemories.map((memory) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-gray-500">
                  Strength: {memory.strength}/10 | Last Accessed: {new Date(memory.lastAccessed).toLocaleString()}
                </p>
                <div className="flex space-x-2">
                  {editingMemoryId === memory.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(memory.id)}
                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Save Memory"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Cancel Edit"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEditClick(memory.id, memory.content)}
                      className="p-1 rounded-md text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Edit Memory"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMemory(memory.id)}
                    className="p-1 rounded-md text-red-600 hover:bg-red-100 transition-colors"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {editingMemoryId === memory.id ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{memory.content}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoryScreen;
