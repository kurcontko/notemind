import React from 'react';
import type { FC } from 'react';
import { Sidebar } from './Sidebar';
import { NoteView } from './NoteView';
import { NoteInput } from './NoteInput';
import CollapsibleNoteInput from './CollapsibleNoteInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { ChatSidebar } from './ChatSidebar';
import { MessageCircle } from 'lucide-react';

const AppLayout: FC = () => {
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const { createNote } = useNotes();
  const { theme, setTheme } = useTheme();
  const [chatSidebarOpen, setChatSidebarOpen] = React.useState<boolean>(false);

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
        <div className="w-full max-w-4xl flex-1 overflow-hidden">
          <NoteView
            noteId={selectedNoteId}
            onMenuClick={() => setSidebarOpen(true)}
            showMenu={!sidebarOpen}
            onEditStateChange={setIsEditing}
          />
        </div>

        {/* Note Input - Only show when not editing */}
        {!isEditing && (
          <CollapsibleNoteInput
            onSubmit={handleNoteSubmit}
            onSuccess={() => setSelectedNoteId(null)}
            isNoteSelected={!!selectedNoteId}
          />
        )}
      </main>

      {/* Toggle Chat Sidebar Button */}
      <button
        onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
        className="fixed top-4 right-16 z-50 hover:bg-gray-200 px-3 py-2 rounded-md dark:hover:bg-gray-600"
      >
        <MessageCircle className="h-4 w-4" />
      </button>

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={chatSidebarOpen}
        onClose={() => setChatSidebarOpen(false)}
      />
    </div>
  );
};

export default AppLayout;