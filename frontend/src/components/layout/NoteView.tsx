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
  Undo2,
  Save,
} from 'lucide-react';
import { noteService } from '@/services/noteService';
import TagManagement from './TagManagement';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import '@/styles/minimal-markdown.css';

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


const MarkdownRenderer = ({ content }) => (
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
      {content}
    </ReactMarkdown>
  </div>
);

export const NoteView = ({
  noteId,
  showMenu,
  onMenuClick,
  onEditStateChange,
}: NoteViewProps) => {
  const [isEditing, setIsEditing] = React.useState(false); // Track edit mode
  const [editText, setEditText] = React.useState('');
  const [editTitle, setEditTitle] = React.useState('');
  const [editTags, setEditTags] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const progressTimerRef = React.useRef<number>();
  const [activeTab, setActiveTab] = React.useState('preview');
  const { toast } = useToast();

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
    onEditStateChange(isEditing);
  }, [isEditing, onEditStateChange]);

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
      setIsEditing(false); // Exit edit mode after saving
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    if (isEditing) {
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
    setIsEditing(false); // Exit edit mode
    setActiveTab('preview');
  };

  const handleStartEditing = () => {
    setIsEditing(true);
    setActiveTab('edit');
  }

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
        {isEditing ? (
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
            {isEditing ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCloseEdit}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cancel changes</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                          isSaving ? 'bg-gray-200' : 'bg-primary hover:bg-primary/80',
                          'text-white text-xs px-3'
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                      {isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save Changes</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleStartEditing}
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
                  className="text-gray-500 hover:text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-red-500 text-white border-red-500">
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}
    </div>
  );

  const renderSummary = () => {
    if (!note?.summary || isEditing) return null;
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
        tags={isEditing ? editTags : note?.tags || []}
        onTagsChange={handleTagsChange}
        isEditing={isEditing}
      />
    </div>
  );

  const renderEditMode = () => (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div>
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="edit" className="mt-4">
          <textarea
            className="w-full min-h-[500px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-xs font-mono"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Write your note here..."
          />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-md p-4 min-h-[500px]">
            <MarkdownRenderer content={editText} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderViewMode = () => (
    <div className="space-y-4">
      <MarkdownRenderer content={note?.content || ''} />
    </div>
  );


  const renderContent = () => {
    if (isLoading) return renderLoading();
    if (!note) return renderEmptyState();

      return (
        <div className="space-y-4">
          {renderSummary()}
          {isEditing ? renderEditMode() : renderViewMode()}
          {renderTagSection()}
        </div>
      );
    };


  return (
    <div className="w-full h-full flex flex-col pb-24">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        {isSaving && (
          <Progress
            value={progress}
            className="absolute top-0 left-0 right-0 h-1 rounded-none"
          />
        )}
        <div className="max-w-5xl mx-auto px-6 pt-2 pb-2">
          {renderHeader()}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-4 pb-24">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};