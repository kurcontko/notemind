export interface NoteReference {
  note_id: string;
  relationship_type: 'parent' | 'child' | 'related';
  created_at: string;
  metadata: Record<string, any>;
}

export interface NoteFile {
  file_id: string;
  filename: string;
  content_type: string;
  size: number;
  url?: string;
}

export interface Note {
    note_id: string;
    title?: string;
    summary?: string;
    tags: string[];
    // contents: Array<{
    //   content_id: string;
    //   type: string;
    //   preview?: string;
    //   storage_url?: string;
    //   content?: string;
    // }>;
    created_at: string;
    updated_at: string;
    user_id?: string;
    categories: string[];
    content: string;
    entities: Record<string, string>;
    // embedding?: number[];
    linked_notes?: NoteReference[];
    metadata?: Record<string, any>;
    files?: NoteFile[];
}

export interface NoteUpdateData {
    title?: string;
    content?: string;
    tags?: string[];
    categories?: string[];
    summary?: string;
    metadata?: Record<string, any>;
}