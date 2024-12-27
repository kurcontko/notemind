import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Link,
  FileText,
  Image,
  ArrowRight,
  Hash,
  CalendarDays,
  Command
} from 'lucide-react';

interface CommandPaletteProps {
  onMemoryCreate: () => void;
  onMemorySelect: (id: string) => void;
}

interface CommandOption {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  shortcut?: string[];
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onMemoryCreate,
  onMemorySelect,
}) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Command options
  const commands: CommandOption[] = [
    {
      id: 'new-note',
      icon: React.createElement(FileText, { size: 16 }),
      label: 'Create Note',
      description: 'Create a new text note',
      shortcut: ['n'],
      action: () => {
        onMemoryCreate();
        setOpen(false);
      }
    },
    {
      id: 'new-link',
      icon: React.createElement(Link, { size: 16 }),
      label: 'Save Link',
      description: 'Save a URL with notes',
      shortcut: ['l'],
      action: () => {
        onMemoryCreate();
        setOpen(false);
      }
    },
    {
      id: 'new-image',
      icon: React.createElement(Image, { size: 16 }),
      label: 'Upload Image',
      description: 'Upload and save an image',
      shortcut: ['i'],
      action: () => {
        onMemoryCreate();
        setOpen(false);
      }
    },
    {
      id: 'add-tags',
      icon: React.createElement(Hash, { size: 16 }),
      label: 'Add Tags',
      description: 'Add tags to organize memories',
      shortcut: ['t'],
      action: () => {
        // Implement tag adding
        setOpen(false);
      }
    },
    {
      id: 'view-timeline',
      icon: React.createElement(CalendarDays, { size: 16 }),
      label: 'View Timeline',
      description: 'See memories in chronological order',
      shortcut: ['v'],
      action: () => {
        // Implement timeline view
        setOpen(false);
      }
    }
  ];

  // Filter commands based on search
  const filteredCommands = React.useMemo(() => {
    if (!search) return commands;
    const searchLower = search.toLowerCase();
    return commands.filter(
      command => 
        command.label.toLowerCase().includes(searchLower) ||
        command.description?.toLowerCase().includes(searchLower)
    );
  }, [search, commands]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return React.createElement(React.Fragment, null, [
    // Quick Action Button
    React.createElement(Button, {
      key: 'quick-action',
      variant: 'outline',
      className: 'fixed bottom-6 right-6 h-12 w-12 rounded-full p-0 sm:right-8',
      onClick: () => setOpen(true)
    }, React.createElement(Plus, { 
      className: 'h-6 w-6',
      'aria-hidden': 'true' 
    })),

    // Command Dialog
    React.createElement(Dialog, {
      key: 'dialog',
      open: open,
      onOpenChange: setOpen,
    }, 
      React.createElement(DialogContent, {
        className: 'sm:max-w-lg p-0 gap-0'
      }, [
        // Search input
        React.createElement('div', {
          key: 'search',
          className: 'flex items-center space-x-3 border-b px-4 py-4 dark:border-gray-700'
        }, [
          React.createElement(Search, {
            className: 'h-5 w-5 text-gray-500'
          }),
          React.createElement('input', {
            ref: inputRef,
            type: 'text',
            placeholder: 'Search or type a command...',
            className: 'flex-1 bg-transparent outline-none placeholder:text-gray-500',
            value: search,
            onChange: (e) => setSearch(e.target.value)
          })
        ]),

        // Command list
        React.createElement('div', {
          key: 'command-list',
          className: 'max-h-96 overflow-y-auto p-2'
        }, filteredCommands.map(command => 
          React.createElement('button', {
            key: command.id,
            onClick: command.action,
            className: 'flex w-full items-center space-x-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'
          }, [
            // Icon container
            React.createElement('div', {
              key: 'icon',
              className: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }, command.icon),
            
            // Content
            React.createElement('div', {
              key: 'content',
              className: 'flex-1 space-y-1'
            }, [
              React.createElement('div', {
                className: 'flex items-center space-x-2'
              }, [
                React.createElement('span', {
                  className: 'font-medium'
                }, command.label),
                command.shortcut && React.createElement('kbd', {
                  className: 'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-gray-50 px-1.5 font-mono text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }, command.shortcut.join(' + '))
              ]),
              command.description && React.createElement('p', {
                className: 'text-sm text-gray-500 dark:text-gray-400'
              }, command.description)
            ]),
            
            // Arrow icon
            React.createElement(ArrowRight, {
              key: 'arrow',
              className: 'h-4 w-4 text-gray-400'
            })
          ])
        ))
      ])
    )
  ]);
};