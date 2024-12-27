import React from 'react';
import type { FC } from 'react';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { MemoryView } from './MemoryView';
import { cn } from '@/lib/utils';

const AppLayout: FC = () => {
  const [selectedMemoryId, setSelectedMemoryId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-foreground">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedMemoryId={selectedMemoryId}
        onMemorySelect={setSelectedMemoryId}
      />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 h-full relative",
        "lg:pl-0" // Remove left padding on larger screens
      )}>
        {/* Memory View */}
        <div className="h-full overflow-hidden">
          <MemoryView
            memoryId={selectedMemoryId}
            onMenuClick={() => setSidebarOpen(true)}
            showMenu={!sidebarOpen}
          />
        </div>

        {/* Command Palette */}
        <CommandPalette
          onMemoryCreate={() => {
            // Refresh memories list
          }}
          onMemorySelect={setSelectedMemoryId}
        />
      </main>
    </div>
  );
};

export default AppLayout;