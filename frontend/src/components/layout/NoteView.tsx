import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import {
  Menu,
  Pencil,
  Trash2,
  Loader2,
  XCircle,
  Sparkles,
  Save,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  MDXEditor,
  MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  CodeToggle,
  UndoRedo,
  Separator,
  linkPlugin,
  imagePlugin,
  codeBlockPlugin,
  tablePlugin,
} from '@mdxeditor/editor';
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { noteService } from '@/services/noteService';
import TagManagement from './TagManagement';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import '@/styles/minimal-markdown.css';

import '@mdxeditor/editor/style.css';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NoteViewProps {
  noteId: string | null;
  showMenu: boolean;
  onMenuClick: () => void;
  onEditStateChange: (isEditing: boolean) => void;
}

export const NoteView = ({
  noteId,
  showMenu,
  onMenuClick,
  onEditStateChange,
}: NoteViewProps) => {
  const [tab, setTab] = React.useState<'preview' | 'edit'>('preview');
  const [editText, setEditText] = React.useState('');
  const [editTitle, setEditTitle] = React.useState('');
  const [editTags, setEditTags] = React.useState<string[]>([]);
  const editorRef = React.useRef<MDXEditorMethods>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const progressTimerRef = React.useRef<number>();
  const { toast } = useToast();
  const [sparklesEnabled, setSparklesEnabled] = React.useState(true);

  const { data: note, isLoading, refetch } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => (noteId ? noteService.getById(noteId) : null),
    enabled: !!noteId,
  });

  React.useEffect(() => {
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
        setProgress((prev) => {
          if (prev >= 90) {
            if (progressTimerRef.current)
              clearInterval(progressTimerRef.current);
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast({ title: 'Success', description: 'Note saved', variant: 'default' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      refetch();
      setTab('preview');
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    if (tab === 'edit') {
      setEditTags(newTags);
    } else {
      if (noteId && note) {
        await noteService.update(noteId, {
          ...note,
          tags: newTags,
        });
        refetch();
      }
    }
  };

  const handleCloseEdit = () => {
    setEditText(note?.content || '');
    setEditTitle(note?.title || '');
    setEditTags(note?.tags || []);
    setTab('preview');
  };

  const renderLoading = () => (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex h-96 flex-col items-center justify-center text-gray-500">
      <p className="text-lg">Select a note from the sidebar</p>
      <p className="text-sm">or press + to create a new one</p>
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
      {note && (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1.5 ml-4">
            {tab === 'edit' ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCloseEdit}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Close</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                          isSaving ? 'bg-gray-200' : 'bg-primary hover:bg-primary/80',
                          'text-white'
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                      {isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save Changes</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSparklesEnabled(!sparklesEnabled)}
                      className={cn(
                        'transition-colors',
                        sparklesEnabled
                          ? 'text-primary hover:text-primary/80' 
                          : 'text-gray-400 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-500'
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sparklesEnabled ? 'Disable' : 'Enable'} AI</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTab('edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}
    </div>
  );

  const renderSummary = () => {
    if (!note?.summary || tab === 'edit') return null;
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
        <ReactMarkdown
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
          {note.summary}
        </ReactMarkdown>
      </div>
    );
  };

  const renderTagSection = () => (
    <div className="py-4">
      <TagManagement
        tags={tab === 'edit' ? editTags : note?.tags || []}
        onTagsChange={handleTagsChange}
        isEditing={tab === 'edit'}
      />
    </div>
  );

  const renderPreview = () => (
    <div className="markdown-preview break-words"> 
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

  const renderEditor = () => (
    <div className="editor-wrapper prose prose-gray dark:prose-invert max-w-none">
      <MDXEditor
        ref={editorRef}
        markdown={editText}
        onChange={setEditText}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <UndoRedo />
              </>
            ),
          }),
        ]}
      />
    </div>
  );

  const renderContent = () => {
    if (isLoading) return renderLoading();
    if (!note) return renderEmptyState();

    return (
      <div className="space-y-4">
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
          <Progress
            value={progress}
            className="absolute top-0 left-0 right-0 h-1 rounded-none"
          />
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