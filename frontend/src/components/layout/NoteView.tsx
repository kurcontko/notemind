import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import { noteService } from '@/services/noteService';
import { Menu, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface NoteViewProps {
  noteId: string | null;
  showMenu: boolean;
  onMenuClick: () => void;
}

export const NoteView = ({ noteId, showMenu, onMenuClick }: NoteViewProps) => {
  const [tab, setTab] = React.useState<'preview' | 'edit'>('preview');
  const [editText, setEditText] = React.useState('');
  const [editTitle, setEditTitle] = React.useState('');

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
    }
  }, [note]);

  const handleSave = async () => {
    if (!noteId) return;
    await noteService.update(noteId, { 
      content: editText,
      title: editTitle,
    });
    // refetch to get updated data
    refetch();
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
      <p className="text-sm">or press ⌘K to create a new one</p>
    </div>
  );

  const renderTabs = () => (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
      <nav className="flex gap-4">
        <button
          onClick={() => setTab('preview')}
          className={clsx(
            'p-2 pb-1 border-b-2 transition-colors',
            tab === 'preview'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent hover:text-blue-500'
          )}
        >
          Preview
        </button>
        <button
          onClick={() => setTab('edit')}
          className={clsx(
            'p-2 pb-1 border-b-2 transition-colors',
            tab === 'edit'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent hover:text-blue-500'
          )}
        >
          Edit
        </button>
      </nav>
    </div>
  );

  const renderTitleSection = () => (
    <div className="border-b pb-4">
      {tab === 'edit' ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-2xl font-bold bg-transparent border-b border-gray-300 focus:outline-none pb-2 mb-2"
        />
      ) : (
        <h1 className="text-2xl font-bold">{note?.title}</h1>
      )}
      <div className="text-sm text-gray-500">
        Last modified {formatDistanceToNow(new Date(note?.updated_at || ''))} ago
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

  const renderTags = () => {
    if (!note?.tags || note.tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {note.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
          >
            #{tag}
          </span>
        ))}
      </div>
    );
  };

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

  const editorOptions = React.useMemo(() => ({
    spellChecker: false,
    autofocus: true,
    status: false,
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', 'code', '|',
      'preview', 'side-by-side', 'fullscreen'
    ],
    minHeight: '300px',
    maxHeight: '600px',
    sideBySideFullscreen: false
  }), []);

  const renderEditor = React.useCallback(() => (
    <div className="editor-wrapper relative [&_.EasyMDEContainer]:!static [&_.editor-preview-side]:!w-[50%] [&_.editor-preview-side]:!static">
      <SimpleMDE
        value={editText}
        onChange={setEditText}
        options={editorOptions}
        key={noteId} // This ensures editor state resets when switching notes
      />
    </div>
  ), [editText, noteId, editorOptions]);

  const renderContent = () => {
    if (isLoading) return renderLoading();
    if (!note) return renderEmptyState();

    return (
      <div className="space-y-4">
        {renderTitleSection()}
        {renderSummary()}
        {tab === 'preview' ? renderPreview() : renderEditor()}
        {renderTags()}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="max-w-3xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showMenu && (
                <Button variant="ghost" size="icon" onClick={onMenuClick}>
                  <Menu className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
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
          {/* {note} && renderTabs()} */}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-600">
        <div className="max-w-3xl mx-auto px-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
