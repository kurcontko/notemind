import React from 'react';
import { Button } from '@/components/ui/button';
import { NoteInput } from './NoteInput';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"

interface CollapsibleNoteInputProps {
  onSubmit: (content: string, files?: File[]) => Promise<void>;
  onSuccess?: () => void;
  isNoteSelected: boolean;
}

const CollapsibleNoteInput = ({
  onSubmit,
  onSuccess,
  isNoteSelected
}: CollapsibleNoteInputProps) => {
  const [isExpanded, setIsExpanded] = React.useState(!isNoteSelected);

  // Collapse input when a note is selected
  React.useEffect(() => {
    if (isNoteSelected) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isNoteSelected]);

  const handleSuccess = () => {
    setIsExpanded(false);
    onSuccess?.();
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {/* Collapsed Button with Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => setIsExpanded(true)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New Note</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 w-full max-w-3xl p-4 animate-in slide-in-from-bottom duration-200">
      <div className="relative w-full bg-background dark:bg-gray-900 rounded-xl shadow-lg">
        {/* Close Button with Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Close</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <NoteInput
          onSubmit={onSubmit}
          onSuccess={handleSuccess}
          isExpanded={isExpanded}
        />
      </div>
    </div>
  );
};

export default CollapsibleNoteInput;