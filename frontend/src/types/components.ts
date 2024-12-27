// src/types/components.ts
export interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedMemoryId: string | null;
    onMemorySelect: (id: string) => void;
  }
  
  export interface MemoryViewProps {
    memoryId: string | null;
    onMenuClick: () => void;
    showMenu: boolean;
  }
  
  export interface CommandPaletteProps {
    onMemoryCreate: () => void;
    onMemorySelect: (id: string) => void;
  }