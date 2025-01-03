import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotes } from '@/hooks/useNotes';
import { formatDistanceToNow } from 'date-fns';
import { PanelLeft, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearch } from '@/hooks/useSearch';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNoteId: string | null;
  onNoteSelect: (id: string) => void;
}

export const Sidebar = ({ isOpen, onClose, selectedNoteId, onNoteSelect }: SidebarProps) => {
  const { notes, isLoading } = useNotes();
  const { query, results, isLoading: isSearchLoading, handleSearch } = useSearch();

  return (
    <div
      className={cn(
        "fixed lg:sticky top-0 left-0 z-50 flex h-screen w-72 flex-col bg-gray-50 transition-transform duration-300 dark:bg-gray-900/50",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        {/* Search Input */}
        <input
          type="search"
          placeholder="Search notes..."
          className="mr-2 rounded"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300">Notes</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Note List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {notes?.map((note) => (
              <button
                key={note.note_id}
                onClick={() => onNoteSelect(note.note_id)}
                className={cn(
                  "w-full text-left rounded-lg p-3 transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  selectedNoteId === note.note_id && "bg-white shadow-sm dark:bg-gray-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {note.content}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {note.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};