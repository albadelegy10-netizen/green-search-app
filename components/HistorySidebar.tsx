import React from 'react';
import { HistoryItem } from '../types';
import { PlusIcon, MessageSquareIcon, TrashIcon, XIcon, ClockIcon, BrainIcon } from './Icons';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  isLoading?: boolean;
  onSelect: (item: HistoryItem) => void;
  onNewChat: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  isLoading = false,
  onSelect, 
  onNewChat,
  onDelete 
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <div className={`
        fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out border-r border-gray-100 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-green-600" />
            History
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button 
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-green-500/20 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <PlusIcon className="w-5 h-5" />
            Start New Chat
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3 mt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100/50">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-100 rounded w-3/4 animate-pulse" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/3 animate-pulse" />
                    </div>
                    </div>
                ))}
            </div>
          ) : history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
              <MessageSquareIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No search history yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-2 px-2">Recent</div>
              {history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="group relative flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 cursor-pointer transition-colors border border-transparent hover:border-green-100"
                >
                  {/* Icon based on Type */}
                  {item.type === 'quiz' ? (
                     <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                        <BrainIcon className="w-4 h-4" />
                     </div>
                  ) : (
                     <MessageSquareIcon className="w-5 h-5 text-gray-400 group-hover:text-green-600 flex-shrink-0 ml-1.5" />
                  )}

                  <div className="flex-1 min-w-0 ml-1">
                    {item.type === 'quiz' ? (
                        <>
                            <p className="text-sm font-medium text-gray-700 group-hover:text-green-900 truncate">
                                {item.topic}
                            </p>
                            <p className="text-xs text-gray-400 truncate flex items-center gap-2">
                                <span>Score: {item.score}/{item.totalQuestions}</span>
                                <span>•</span>
                                <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-gray-700 group-hover:text-green-900 truncate">
                                {item.query}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                                {new Date(item.timestamp).toLocaleDateString()}
                            </p>
                        </>
                    )}
                  </div>
                  
                  <button 
                    onClick={(e) => onDelete(item.id, e)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};