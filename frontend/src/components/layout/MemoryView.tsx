import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { memoryService } from '@/services/memoryService';
import { Menu, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MemoryViewProps {
  memoryId: string | null;
  showMenu: boolean;
  onMenuClick: () => void;
}

export const MemoryView = ({ memoryId, showMenu, onMenuClick }: MemoryViewProps) => {
  const { data: memory, isLoading } = useQuery({
    queryKey: ['memory', memoryId],
    queryFn: () => memoryId ? memoryService.getById(memoryId) : null,
    enabled: !!memoryId,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      );
    }

    if (!memory) {
      return (
        <div className="flex h-96 flex-col items-center justify-center text-gray-500">
          <p className="text-lg">Select a memory from the sidebar</p>
          <p className="text-sm">or press ⌘K to create a new one</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Top Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showMenu && (
              <Button variant="ghost" size="icon" onClick={onMenuClick}>
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Memory Type Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">
            {memory.type}
          </span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}</span>
        </div>

        {/* Memory Content */}
        {memory.type === 'link' ? (
          <a
            href={memory.content}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="text-blue-500 hover:underline break-all">
              {memory.content}
            </div>
          </a>
        ) : memory.type === 'image' ? (
          <div className="rounded-lg p-1">
            <img
              src={memory.content}
              alt="Memory"
              className="rounded-lg max-h-96 w-full object-cover"
            />
          </div>
        ) : (
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p>{memory.content}</p>
          </div>
        )}

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl mx-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};