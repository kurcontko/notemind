import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryInputProps {
  onSubmit: (content: string, files?: File[]) => Promise<void>;
}

export const NoteInput = ({ onSubmit }: MemoryInputProps) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sparklesEnabled, setSparklesEnabled] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-resize textarea up to 300px
   */
  const adjustTextareaHeight = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;

    textarea.style.height = 'auto';
    // Fix max height at 300px
    const scrollHeight = Math.min(textarea.scrollHeight, 300);
    textarea.style.height = `${scrollHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [content]);

  /**
   * Drag & drop handlers
   */
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
      setContent(prev => (prev ? `${prev}\n${url}` : url));
    }
  }, []);

  /**
   * File upload handler
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  /**
   * Submit handler
   */
  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, files);
      setContent('');
      setFiles([]);
    } catch (error) {
      console.error('Error creating note:', error);
      // Add error notification here if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Sparkles button handler
   */
  const handleSparklesClick = () => {
    setSparklesEnabled(prev => !prev);
  };

  /**
   * Keyboard submission (Enter = submit, Shift+Enter = new line)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-4">
      <div
        className={cn(
          'flex flex-col w-full border border-gray-300 dark:border-gray-700 rounded-md',
          isDragging && 'bg-blue-50 dark:bg-blue-900/20'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File Preview (above the input) */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2">
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

        {/* Textarea (occupies full width, no border) */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a note, drop files, or paste links..."
          className={cn(
            'resize-none border-0 bg-transparent focus-visible:ring-0 w-full shadow-none',
            'min-h-[24px] transition-all duration-200 overflow-hidden px-3 pt-3',
            'focus:shadow-none'
          )}
          style={{ height: '24px' }}
        />

        <div className="mt-2 flex items-center justify-between w-full px-2">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSparklesClick}
              className={cn(
                "transition-colors -ml-1",
                sparklesEnabled 
                  ? "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" 
                  : "text-gray-400 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-500"
              )}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && files.length === 0)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Plus className="h-4 w-4" />
          </Button>
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