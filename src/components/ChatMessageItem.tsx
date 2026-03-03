import React, { memo } from 'react';
import { FileText, ExternalLink, Star, Volume2, Edit2, RotateCcw, Trash2, CheckCheck } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatMessageItemProps {
  msg: ChatMessage;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  handleEdit: (id: string, content: string) => void;
  rateChatMessage: (id: string, rating: number) => void;
  speakMessage: (content: string, id: string) => void;
  handleRegenerate: (id: string) => void;
  handleDeleteMessage: (id: string) => void;
  showTimestamps: boolean;
  timeZone: string;
  readMessages: Set<string>;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  msg,
  editingMessageId,
  setEditingMessageId,
  handleEdit,
  rateChatMessage,
  speakMessage,
  handleRegenerate,
  handleDeleteMessage,
  showTimestamps,
  timeZone,
  readMessages
}) => {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
        <div
          className={`p-4 rounded-2xl shadow-sm relative group ${
            msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
          }`}
        >
          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {msg.attachments.map((att, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden">
                  {att.type === 'image' ? (
                    <img
                      src={att.content}
                      alt="Attachment"
                      className="max-w-full h-auto rounded"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
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

          {/* Rating UI for AI Messages */}
          {msg.role === 'model' && (
            <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => rateChatMessage(msg.id, star)}
                    className={`p-1 transition-colors ${
                      typeof msg.rating === 'number' && msg.rating >= star
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 hover:text-yellow-200'
                    }`}
                    title={`${star} Stars`}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                ))}
              </div>
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
        {/* Timestamp */}
        {showTimestamps && (
          <div className="mt-1 px-1">
            <span className="text-xs text-gray-400 mt-1 px-1 flex items-center space-x-1">
              <span>
                {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone })} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone })}
              </span>
              {msg.role === 'model' && readMessages.has(msg.id) && <span title="Read"><CheckCheck className="w-3 h-3 text-indigo-500" /></span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ChatMessageItem);
