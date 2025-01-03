import React from 'react';
import type { FC } from 'react';
import { Sidebar } from './Sidebar';
import { NoteView } from './NoteView';
import { NoteInput } from './NoteInput';
import { cn } from '@/lib/utils';
import { noteService } from '@/services/noteService';

const AppLayout: FC = () => {
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true);

  const handleNoteSubmit = async (content: string, files?: File[]) => {
    // Handle the memory creation here
    console.log('Creating note:', { content, files });
    await noteService.create(content, files);
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
      <main className="flex-1 h-full relative flex flex-col">
        <div className={cn(
          "flex-1 flex flex-col",
          !selectedNoteId && "items-center justify-center"
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

          {/* Memory Input */}
          <div className={cn(
            "w-full bg-background dark:bg-foreground",
            selectedNoteId ? "fixed bottom-0 left-0 right-0 shadow-lg" : ""
          )}>
            <NoteInput onSubmit={handleNoteSubmit} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;