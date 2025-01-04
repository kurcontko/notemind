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
      {/* <main className="flex-1 h-full"> */}
      <main className="fixed top-0 left-0 right-0 z-10">
        <div className={cn(
          "h-full w-full",
          !selectedNoteId && "flex items-center justify-center"
        )}>
          {/* Memory View */}
          <div className={cn(
            "w-full",
            selectedNoteId ? "flex-1" : "hidden"
          )}>
            <NoteView
              noteId={selectedNoteId}
              onMenuClick={() => setSidebarOpen(true)}
              showMenu={!sidebarOpen}
            />
          </div>

          {/* Note Input - Fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-10">
            <div className={cn(
              "w-full bg-background/95 backdrop-blur-sm dark:bg-foreground/95",
              "shadow-lg"
            )}>
              <NoteInput 
                onSubmit={handleNoteSubmit}
                onSuccess={() => setSelectedNoteId(null)} 
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;