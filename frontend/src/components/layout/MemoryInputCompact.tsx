import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryInputProps {
  onSubmit: (content: string, files?: File[]) => Promise<void>;
}

export const MemoryInput = ({ onSubmit }: MemoryInputProps) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div 
        className={cn(
          "mx-auto max-w-4xl rounded-lg border bg-white dark:bg-gray-800",
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
        <div className="flex items-end gap-2 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="self-end"
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

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a note, drop files, or paste links..."
            className="min-h-[20px] max-h-[200px] resize-none border-0 bg-transparent p-2 focus-visible:ring-0"
            rows={1}
          />

          <Button
            size="icon"
            variant="ghost"
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && files.length === 0)}
            className="self-end text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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