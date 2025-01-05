import React from 'react';
import { Button } from '@/components/ui/button';
import { NoteInput } from './NoteInput';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsExpanded(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 w-full max-w-3xl p-4 animate-in slide-in-from-bottom duration-200">
      <div className="relative w-full bg-background/95 backdrop-blur-sm dark:bg-foreground/95 rounded-lg">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10"
          onClick={() => setIsExpanded(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <NoteInput 
          onSubmit={onSubmit}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
};

export default CollapsibleNoteInput;