import React from 'react';
import type { FC } from 'react';
import { Sidebar } from './Sidebar';
import { NoteView } from './NoteView';
import { NoteInput } from './NoteInput';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';

const AppLayout: FC = () => {
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const { createNote } = useNotes();

  const handleNoteSubmit = async (content: string, files?: File[]) => {
    return createNote(content, files);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-foreground">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedNoteId={selectedNoteId}
        onNoteSelect={setSelectedNoteId}
      />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="fixed inset-0 flex flex-col items-center">
      <div className="w-full max-w-3xl flex-1 overflow-hidden">
        <NoteView
          noteId={selectedNoteId}
          onMenuClick={() => setSidebarOpen(true)}
          showMenu={!sidebarOpen}
          onEditStateChange={setIsEditing}
        />
      </div>

      {/* Note Input - Only show when not editing */}
      {!isEditing && (
        <div className="fixed bottom-0 w-full max-w-3xl p-4">
          <div className="w-full bg-background/95 backdrop-blur-sm dark:bg-foreground/95 rounded-lg">
            <NoteInput 
              onSubmit={handleNoteSubmit}
              onSuccess={() => setSelectedNoteId(null)} 
            />
          </div>
        </div>
      )}
    </main>
    </div>
  );
};

export default AppLayout;