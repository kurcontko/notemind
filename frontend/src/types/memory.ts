// src/types/memory.ts
export interface Memory {
    id: string;
    title: string;
    type: 'note' | 'link' | 'image' | 'video' | 'audio';
    content: string;
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
  }