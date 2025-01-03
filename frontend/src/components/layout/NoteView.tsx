import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { noteService } from '@/services/noteService';
import { Menu, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

interface NoteViewProps {
  noteId: string | null;
  showMenu: boolean;
  onMenuClick: () => void;
}

export const NoteView = ({ noteId, showMenu, onMenuClick }: NoteViewProps) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState('');

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => noteId ? noteService.getById(noteId) : null,
    enabled: !!noteId,
  });

  const handleEditStart = () => {
    if (!note) return;
    setEditText(note.content || '');
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    if (!noteId) return;
    await noteService.update(noteId, { content: editText });
    setIsEditing(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      );
    }

    if (!note) {
      return (
        <div className="flex h-96 flex-col items-center justify-center text-gray-500">
          <p className="text-lg">Select a note from the sidebar</p>
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
            {isEditing ? (
              <Button variant="ghost" size="icon" onClick={handleEditSave}>
                Save
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={handleEditStart}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Note Content */}
        {isEditing ? (
          <Textarea value={editText} onChange={e => setEditText(e.target.value)} />
        ) : (
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p>{note.content}</p>
          </div>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag) => (
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