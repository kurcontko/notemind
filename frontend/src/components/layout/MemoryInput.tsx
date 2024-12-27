import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryInputProps {
  onSubmit: (content: string, files?: File[]) => Promise<void>;
}

export const MemoryInput = ({ onSubmit }: MemoryInputProps) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const maxHeight = isExpanded ? 300 : 100;
    const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${scrollHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, isExpanded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);

    // Check if the dropped item is a URL
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && url.startsWith('http')) {
      setContent(prev => prev + (prev ? '\n' : '') + url);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(content, files);
      setContent('');
      setFiles([]);
      setIsExpanded(false);
    } catch (error) {
      console.error('Error submitting memory:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-4">
      <div 
        className={cn(
          "rounded-lg border bg-white dark:bg-gray-800 shadow-sm",
          isDragging && "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File Preview */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b p-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700"
              >
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-xs">{file.name}</span>
                <button
                  onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2 py-1.5 px-3">
          <Button
            variant="ghost"
            size="icon"
            className="self-end text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            asChild
          >
            <label>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Paperclip className="h-4 w-4" />
            </label>
          </Button>

          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a note, drop files, or paste links..."
              className={cn(
                "resize-none border-0 bg-transparent px-0 py-1 focus-visible:ring-0",
                "min-h-[20px] transition-all duration-200 overflow-hidden",
                isExpanded ? "min-h-[100px]" : "max-h-[500px]"
              )}
              style={{ height: '24px' }} // Initial height
            />
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleExpand}
              className="self-end text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && files.length === 0)}
              className="self-end text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-lg bg-white p-6 text-center dark:bg-gray-800">
            <p className="text-lg font-medium">Drop files or links here</p>
          </div>
        </div>
      )}
    </div>
  );
};