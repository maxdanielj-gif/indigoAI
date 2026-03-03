import React from 'react';
import { Play, Trash2 } from 'lucide-react';

interface PreviewChatProps {
  name: string;
  previewMessages: {role: 'user' | 'model', content: string, attachments?: {type: string, content: string, name: string}[]}[];
  isPreviewLoading: boolean;
  previewInput: string;
  setPreviewInput: (input: string) => void;
  handlePreviewSend: () => void;
  setPreviewMessages: (messages: {role: 'user' | 'model', content: string, attachments?: {type: string, content: string, name: string}[]}[]) => void;
}

const PreviewChat: React.FC<PreviewChatProps> = ({
  name, previewMessages, isPreviewLoading, previewInput,
  setPreviewInput, handlePreviewSend, setPreviewMessages
}) => {
  return (
    <div className="mt-8 border-t-2 border-indigo-50 pt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <Play className="w-5 h-5 mr-2 text-indigo-500" />
        Test Persona Behavior
      </h3>
      <div className="bg-gray-50 rounded-lg border border-gray-200 h-80 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {previewMessages.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-10">
              Start typing to test how {name} responds...
            </p>
          )}
          {previewMessages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
                msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
              }`}>
                {msg.content}
                
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.attachments.map((att, attIdx) => (
                      <div key={attIdx} className="rounded overflow-hidden border border-gray-100">
                        {att.type === 'image' && (
                          <img src={att.content} alt={att.name} className="max-w-full h-auto" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
  );
};

export default PreviewChat;
