import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotes } from '@/hooks/useNotes';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { SquarePen, PanelLeft, FileText, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearch } from '@/hooks/useSearch';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNoteId: string | null;
  onNoteSelect: (id: string | null) => void;
}

interface Note {
  note_id: string;
  title: string;
  content: string;
  created_at: string;
  tags?: string[];
}

interface GroupedNotes {
  title: string;
  notes: Note[];
}

const groupNotesByDate = (notes: Note[]): GroupedNotes[] => {
  const groups: GroupedNotes[] = [];
  
  notes.forEach(note => {
    const date = parseISO(note.created_at);
    let groupTitle: string;

    if (isToday(date)) {
      groupTitle = 'Today';
    } else if (isYesterday(date)) {
      groupTitle = 'Yesterday';
    } else if (isThisWeek(date)) {
      groupTitle = 'This Week';
    } else {
      groupTitle = 'Older';
    }

    const existingGroup = groups.find(g => g.title === groupTitle);
    if (existingGroup) {
      existingGroup.notes.push(note);
    } else {
      groups.push({ title: groupTitle, notes: [note] });
    }
  });

  return groups;
};

export const Sidebar = ({ isOpen, onClose, selectedNoteId, onNoteSelect }: SidebarProps) => {
  const {
    notes,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotes();
  const { query, results, isLoading: isSearchLoading, handleSearch } = useSearch();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  const displayNotes = isSearchVisible && query.length > 0 ? results ?? [] : notes;
  const groupedNotes = groupNotesByDate(displayNotes);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, displayNotes]);

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    if (!isSearchVisible) {
      handleSearch('');
    }
  };

  const renderNote = (note: Note, isLast: boolean) => (
    <div
      key={note.note_id}
      ref={isLast ? lastElementRef : null}
    >
      <button
        onClick={() => onNoteSelect(note.note_id)}
        className={cn(
          "w-full text-left rounded-lg p-2 transition-colors mb-0.5 group",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          selectedNoteId === note.note_id && "bg-white shadow-sm dark:bg-gray-800"
        )}
      >
        <div className="flex w-full items-start space-x-2">
          <FileText className="h-4 w-4 flex-shrink-0 text-primary mt-1 opacity-75 group-hover:opacity-100" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[220px]">
              {note.title}
            </p>
            {/* <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
            </p> */}
            <p className="text-xs italic text-gray-500 dark:text-gray-400 truncate mt-0.5 max-w-[220px]">
              {note.content}
            </p>
            {note.tags?.length > 0 && (
              <div className="mt-1 flex gap-1 items-center">
                <span className="flex gap-1 items-center max-w-[70%]">
                  {note.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-full bg-gray-100/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800/50 dark:text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </span>
                {note.tags.length > 2 && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    +{note.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>
    </div>
  );

  return (
    <aside
      className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-72 flex-shrink-0 flex flex-col bg-gray-50 transition-transform duration-300 dark:bg-gray-900/50",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      {/* Header */}
      <div className="flex flex-col flex-shrink-0">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="font-bold text-m">
            <span className="text-primary">Note</span>
            <span className="text-muted-foreground">mind</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={toggleSearch}>
              <Search className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onNoteSelect(null)}
            >
              <SquarePen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search Input */}
        {isSearchVisible && (
          <div className="px-4 pb-2">
            <input
              type="search"
              placeholder="Search notes..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Note List */}
      <ScrollArea className="flex-1 w-full">
        {isLoading || (isSearchVisible && isSearchLoading) ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="px-2 py-1">
            {groupedNotes.map((group, groupIndex) => (
              <div key={group.title}>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1.5">
                  {group.title}
                </h3>
                {group.notes.map((note, noteIndex) => 
                  renderNote(
                    note,
                    groupIndex === groupedNotes.length - 1 && 
                    noteIndex === group.notes.length - 1
                  )
                )}
              </div>
            ))}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
};