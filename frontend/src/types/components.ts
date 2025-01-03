// src/types/components.ts
export interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedNoteId: string | null;
    onNoteSelect: (id: string) => void;
  }
  
  export interface NoteViewProps {
    noteId: string | null;
    onMenuClick: () => void;
    showMenu: boolean;
  }
  
  export interface CommandPaletteProps {
    onNoteCreate: () => void;
    onNoteSelect: (id: string) => void;
  }