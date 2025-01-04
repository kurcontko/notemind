import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Menu, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
} from '@mdxeditor/editor';
import { noteService } from '@/services/noteService';
import TagManagement from './TagManagement';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

import '@mdxeditor/editor/style.css';

interface NoteViewProps {
  noteId: string | null;
  showMenu: boolean;
  onMenuClick: () => void;
  onEditStateChange: (isEditing: boolean) => void;
}

export const NoteView = ({ noteId, showMenu, onMenuClick, onEditStateChange }: NoteViewProps) => {
  const [tab, setTab] = React.useState<'preview' | 'edit'>('preview');
  const [editText, setEditText] = React.useState('');
  const [editTitle, setEditTitle] = React.useState('');
  const [editTags, setEditTags] = React.useState<string[]>([]);
  const editorRef = React.useRef<MDXEditorMethods>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const progressTimerRef = React.useRef<number>();
  const { toast } = useToast();

  const { data: note, isLoading, refetch } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => (noteId ? noteService.getById(noteId) : null),
    enabled: !!noteId,
  });

  React.useEffect(() => {
    // Whenever note changes, reset edit fields
    if (note) {
      setEditText(note.content || '');
      setEditTitle(note.title || '');
      setEditTags(note.tags || []);
    }
  }, [note]);

  React.useEffect(() => {
    onEditStateChange(tab === 'edit');
  }, [tab, onEditStateChange]);

  React.useEffect(() => {
    if (isSaving) {
      setProgress(0);
      progressTimerRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
    } else {
      setProgress(0);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isSaving]);

  const handleSave = async () => {
    if (!noteId) return;
    setIsSaving(true);
    try {
      await noteService.update(noteId, { 
        content: editText,
        title: editTitle,
        tags: editTags,
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({ title: "Success", description: "Note saved", variant: "default" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      refetch();
      setTab('preview');
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    if (tab === 'edit') {
      // In edit mode, just update the local state
      setEditTags(newTags);
    } else {
      // In preview mode, update directly through the API
      if (noteId) {
        await noteService.update(noteId, {
          ...note,
          tags: newTags,
        });
        refetch();
      }
    }
  };

  const renderLoading = () => (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex h-96 flex-col items-center justify-center text-gray-500">
      <p className="text-lg">Select a note from the sidebar</p>
      <p className="text-sm">or press ⌘K to create a new one</p>
    </div>
  );

  const renderHeader = () => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {showMenu && (
          <Button variant="ghost" size="icon" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>
        )}
        {tab === 'edit' ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 text-xl font-bold bg-transparent focus:outline-none min-w-0"
            placeholder="Note title"
          />
        ) : (
          <h1 className="text-xl font-bold truncate">{note?.title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4">
        {tab === 'edit' ? (
          <Button variant="ghost" onClick={handleSave}>
            Save
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setTab('edit')}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderSummary = () => {
    if (!note?.summary || tab === 'edit') return null;
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
        {note.summary}
      </div>
    );
  };

  const renderTagSection = () => (
    <div className="py-4">
      <TagManagement
        tags={tab === 'edit' ? editTags : (note?.tags || [])}
        onTagsChange={handleTagsChange}
        isEditing={tab === 'edit'}
      />
    </div>
  );

  const renderPreview = () => {
    return (
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <ReactMarkdown
          className="break-words"
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, style, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  {...props}
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: '1em 0',
                    borderRadius: '0.375rem',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code {...props} className={className}>
                  {children}
                </code>
              );
            },
          }}
        >
          {note?.content || ''}
        </ReactMarkdown>
      </div>
    );
  };

  const renderEditor = () => (
    <div className="editor-wrapper prose prose-gray dark:prose-invert max-w-none">
      <MDXEditor
        markdown={editText}
        onChange={setEditText}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
        ]}
      />
    </div>
  );

  const renderContent = () => {
    if (isLoading) return renderLoading();
    if (!note) return renderEmptyState();

    return (
      <div className="space-y-4">
        {/* {renderTitleSection()} */}
        {renderSummary()}
        {tab === 'preview' ? renderPreview() : renderEditor()}
        {renderTagSection()}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        {isSaving && (
          <Progress value={progress} className="absolute top-0 left-0 right-0 h-1 rounded-none" />
        )}
        <div className="max-w-3xl mx-auto px-6 py-2">
          {renderHeader()}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};