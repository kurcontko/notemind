// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/providers/theme-provider';
import AppLayout from './components/layout/AppLayout';
import { Toaster } from "@/components/ui/toaster"

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="memory-theme">
        <AppLayout />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;