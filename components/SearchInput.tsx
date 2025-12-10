import React, { useState, FormEvent, useRef } from 'react';
import { SearchIcon, SparklesIcon, ArrowRightIcon, MicIcon, PaperclipIcon, ImageIcon, PdfIcon, XCircleIcon } from './Icons';
import { Attachment } from '../types';

interface SearchInputProps {
  onSearch: (query: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  initialValue?: string;
  className?: string;
  compact?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
  onSearch, 
  isLoading, 
  initialValue = '', 
  className = '',
  compact = false
}) => {
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((value.trim() || attachments.length > 0) && !isLoading && !isProcessingFiles) {
      onSearch(value.trim(), attachments);
    }
  };

  const processFiles = async (files: File[]) => {
    setIsProcessingFiles(true);
    const newAttachments: Attachment[] = [];

    try {
        for (const file of files) {
            // Check limits (current + new)
            if (attachments.length + newAttachments.length >= 3) {
                alert("Maximum 3 attachments allowed.");
                break;
            }
            
            // Validate type
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                alert("Only images and PDF files are supported.");
                continue;
            }

            try {
                const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                // Strip prefix data:image/png;base64,
                const base64Content = base64Data.split(',')[1];
                
                newAttachments.push({
                    file,
                    mimeType: file.type,
                    base64: base64Content,
                    previewUrl: base64Data
                });
            } catch (err) {
                console.error("Error reading file", err);
            }
        }
        
        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    } finally {
        setIsProcessingFiles(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        await processFiles(Array.from(e.target.files));
        // Reset inputs to allow selecting the same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            const file = items[i].getAsFile();
            if (file) files.push(file);
        }
    }

    if (files.length > 0) {
        e.preventDefault();
        await processFiles(files);
    }
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleVoiceInput = () => {
      if (isListening) {
          setIsListening(false);
          return;
      }

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          recognition.onstart = () => setIsListening(true);
          
          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              setValue(prev => (prev ? prev + ' ' + transcript : transcript));
              setIsListening(false);
          };

          recognition.onerror = (event: any) => {
              console.error("Voice error", event.error);
              setIsListening(false);
          };

          recognition.onend = () => {
              setIsListening(false);
          };

          recognition.start();
      } else {
          alert("Voice input is not supported in this browser.");
      }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`relative w-full transition-all duration-300 ${className}`}
    >
      {/* Attachments Preview */}
      {(attachments.length > 0 || isProcessingFiles) && (
          <div className="flex gap-2 mb-3 overflow-x-auto py-1 px-1">
              {attachments.map((att, idx) => (
                  <div key={idx} className="relative group flex-shrink-0 animate-fade-in">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                          {att.mimeType.startsWith('image/') ? (
                              <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                              <PdfIcon className="w-8 h-8 text-red-500" />
                          )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="absolute -top-2 -right-2 bg-white rounded-full text-red-500 shadow-md hover:scale-110 transition-transform"
                      >
                          <XCircleIcon className="w-5 h-5" />
                      </button>
                  </div>
              ))}
              
              {/* File Loading Indicator */}
              {isProcessingFiles && (
                  <div className="relative flex-shrink-0 animate-pulse">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                  </div>
              )}
          </div>
      )}

      <div 
        className={`
          flex items-center w-full bg-white border-2
          transition-all duration-300 ease-out transform
          ${isFocused 
            ? 'border-green-500 shadow-xl ring-4 ring-green-100 scale-[1.01]' 
            : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
          }
          ${compact ? 'rounded-full h-12' : 'rounded-2xl h-14 sm:h-16'}
        `}
      >
        <div className={`flex items-center justify-center ${compact ? 'w-10 pl-3' : 'w-14 pl-4'}`}>
           {isLoading ? (
             <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
           ) : (
             <SearchIcon className={`w-5 h-5 transition-colors ${isFocused ? 'text-green-600' : 'text-gray-400'}`} />
           )}
        </div>
        
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPaste={handlePaste}
          placeholder={attachments.length > 0 ? "Add context about these files..." : "Ask anything..."}
          className="flex-1 h-full px-2 text-gray-800 placeholder-gray-400 bg-transparent outline-none text-base sm:text-lg min-w-0"
          disabled={isLoading || isProcessingFiles}
        />

        {/* Action Buttons Right */}
        <div className="pr-2 sm:pr-3 flex items-center gap-1 sm:gap-2">
            
            {/* File Inputs (Hidden) */}
            <input 
                type="file" 
                ref={imageInputRef} 
                className="hidden" 
                accept="image/*"
                multiple
                onChange={handleFileSelect}
            />
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
            />
            
            {/* Image Button */}
            <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isProcessingFiles}
                className="p-2 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="Upload Image"
            >
                <ImageIcon className="w-5 h-5" />
            </button>

            {/* Document/PDF Button */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFiles}
                className="p-2 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="Attach PDF Document"
            >
                <PaperclipIcon className="w-5 h-5" />
            </button>

            {/* Voice Input */}
            <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={isProcessingFiles}
                className={`p-2 rounded-full transition-colors disabled:opacity-50 ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                title="Voice Input"
            >
                <MicIcon className="w-5 h-5" />
            </button>

            {/* Submit */}
            {(value || attachments.length > 0) && (
                <button
                    type="submit"
                    disabled={isLoading || isProcessingFiles}
                    className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-1"
                >
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>
    </form>
  );
};