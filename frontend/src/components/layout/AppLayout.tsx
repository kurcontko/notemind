import React from 'react';
import type { FC } from 'react';
import { Sidebar } from './Sidebar';
import { MemoryView } from './MemoryView';
import { MemoryInput } from './MemoryInput';
import { cn } from '@/lib/utils';

const AppLayout: FC = () => {
  const [selectedMemoryId, setSelectedMemoryId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true);

  const handleMemorySubmit = async (content: string, files?: File[]) => {
    // Handle the memory creation here
    console.log('Creating memory:', { content, files });
  };

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
      <main className="flex-1 h-full relative flex flex-col">
        <div className={cn(
          "flex-1 flex flex-col",
          !selectedMemoryId && "items-center justify-center"
        )}>
          {/* Memory View */}
          <div className={cn(
            "w-full",
            selectedMemoryId ? "flex-1" : "hidden"
          )}>
            <MemoryView
              memoryId={selectedMemoryId}
              onMenuClick={() => setSidebarOpen(true)}
              showMenu={!sidebarOpen}
            />
          </div>

          {/* Memory Input */}
          <div className={cn(
            "w-full bg-background dark:bg-foreground",
            selectedMemoryId ? "fixed bottom-0 left-0 right-0 shadow-lg" : ""
          )}>
            <MemoryInput onSubmit={handleMemorySubmit} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;