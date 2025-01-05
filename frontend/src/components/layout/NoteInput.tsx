import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Plus, Sparkles, Loader2, XCircle, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NoteInputProps {
  onSubmit: (content: string, files?: File[]) => Promise<void>;
  onSuccess?: () => void;
  isExpanded?: boolean;
}

export const NoteInput = ({ onSubmit, onSuccess, isExpanded = false }: NoteInputProps) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sparklesEnabled, setSparklesEnabled] = useState(true);
  const [progress, setProgress] = useState(0);

  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const progressTimerRef = useRef<number>();

  // Progress bar animation
  useEffect(() => {
    if (isSubmitting) {
      setProgress(0);
      progressTimerRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            if (progressTimerRef.current) {
              window.clearInterval(progressTimerRef.current);
            }
            return 90;
          }
          return prev + 5;
        });
      }, 50);
    } else {
      setProgress(0);
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    }

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, [isSubmitting]);

  const adjustTextareaHeight = useCallback(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    const scrollHeight = Math.min(textarea.scrollHeight, 300);
    textarea.style.height = `${scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

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
    if (!content.trim() && files.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content, files);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add minimum loading time
      setContent('');
      setFiles([]);
      onSuccess?.();
      toast({
        title: "Success",
        description: "Your note has been saved successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: "Error",
        description: "Failed to save your note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSparklesClick = useCallback(() => {
    setSparklesEnabled(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div
      className={cn(
        'w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 relative overflow-hidden transition-all duration-300',
        isExpanded ? 'rounded-t-xl rounded-b-none' : 'rounded-xl', // Apply rounded corners conditionally
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isSubmitting && (
        <Progress
          value={progress}
          className="absolute top-0 left-0 right-0 h-1 rounded-none z-10"
        />
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-gray-200 dark:border-gray-800">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-700/50"
            >
              <File className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              <span className="truncate max-w-[150px]" title={file.name}>
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-0.5"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a note, drag files, or paste links..."
        className={cn(
          'resize-none border-0 bg-transparent focus-visible:ring-0 w-full shadow-none',
          'min-h-[24px] transition-all duration-200 overflow-hidden px-4 pt-4',
          'focus:shadow-none placeholder:text-gray-400 dark:placeholder:text-gray-500',
          files.length > 0 ? 'border-b border-gray-200 dark:border-gray-800' : ''
        )}
        style={{ height: '24px' }}
      />

      <div className="mt-3 flex items-center justify-between w-full px-3 pb-3">
        <div className="flex items-center space-x-4">
          {/* Attach File Button with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  disabled={isSubmitting}
                >
                  <label>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isSubmitting}
                    />
                    <Paperclip className="h-5 w-5" />
                  </label>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>

            {/* Sparkles Button with Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSparklesClick}
                  disabled={isSubmitting}
                  className={cn(
                    "transition-colors",
                    sparklesEnabled
                      ? "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                      : "text-gray-400 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-500"
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sparklesEnabled ? "Disable AI" : "Enable AI"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Submit Button with Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || (!content.trim() && files.length === 0)}
                className={cn(
                  "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                  "transition-all duration-200",
                  isSubmitting && "opacity-50 cursor-not-allowed"
                )}
                variant="ghost"
                size="icon"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save Note</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="rounded-lg bg-white/75 dark:bg-gray-800/75 p-4 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drop here
            </p>
          </div>
        </div>
      )}
    </div>
  );
};