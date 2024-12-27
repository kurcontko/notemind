import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemories } from '@/hooks/useMemories';
import { formatDistanceToNow } from 'date-fns';
import { PanelLeft, Link, FileText, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMemoryId: string | null;
  onMemorySelect: (id: string) => void;
}

export const Sidebar = ({ isOpen, onClose, selectedMemoryId, onMemorySelect }: SidebarProps) => {
  const { memories, isLoading } = useMemories();

  const getMemoryIcon = (type: string) => {
    switch (type) {
      case 'link':
        return <Link className="h-4 w-4 text-blue-500" />;
      case 'image':
        return <Image className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-green-500" />;
    }
  };

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
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300">Memories</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Memory List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {memories?.map((memory) => (
              <button
                key={memory.id}
                onClick={() => onMemorySelect(memory.id)}
                className={cn(
                  "w-full text-left rounded-lg p-3 transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  selectedMemoryId === memory.id && "bg-white shadow-sm dark:bg-gray-800"
                )}
              >
                <div className="flex items-center gap-3">
                  {getMemoryIcon(memory.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {memory.content}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {memory.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {memory.tags.map((tag) => (
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