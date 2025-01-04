import { api } from './api';
import { Note, NoteUpdateData } from '../types/note';

interface GetNotesParams {
  limit?: number;
  offset?: number;
  searchQuery?: string;
}

export const noteService = {
  getAll: async ({ limit = 20, offset = 0, searchQuery }: GetNotesParams = {}) => {
    const params: Record<string, any> = { limit, offset };
    if (searchQuery) params.q = searchQuery;
    
    const response = await api.get<Note[]>('/notes', { params });
    return response.data;
  },
  
  create: async (text?: string, files?: File[]) => {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (files) files.forEach((f) => formData.append('files', f));
    const response = await api.post<Note>('/notes', formData);
    return response.data;
  },
  
  update: async (id: string, data: NoteUpdateData, files?: File[]) => {
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('note_id', id);
      formData.append('note', JSON.stringify(data));
      files.forEach(f => formData.append('files', f));
      const response = await api.put<Note>(`/notes/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    }
    
    const response = await api.put<Note>(`/notes/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/notes/${id}`);
  },

  getById: async (id: string) => {
    const response = await api.get<Note>(`/notes/${id}`);
    return response.data;
  },

  getRecent: async (limit = 10, offset = 0) => {
    const response = await api.get<Note[]>('/notes/recent', { params: { limit, offset } });
    return response.data;
  },

  search: async (params: Record<string, any>) => {
    const response = await api.get<Note[]>('/search', { params });
    return response.data;
  },

  addFiles: async (noteId: string, files: File[]) => {
    const formData = new FormData();
    formData.append('note_id', noteId);
    files.forEach(f => formData.append('files', f));
    const response = await api.post<Note>(`/notes/${noteId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  removeFile: async (noteId: string, fileId: string) => {
    await api.delete(`/notes/${noteId}/files/${fileId}`);
  }
};