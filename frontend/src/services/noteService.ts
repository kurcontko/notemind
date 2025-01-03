
// frontend/src/services/noteService.ts
import { api } from './api';
import { Note } from '../types/note';

export const noteService = {
  getAll: async () => {
    const response = await api.get<Note[]>('/notes');
    return response.data;
  },
  
  create: async (text?: string, files?: File[]) => {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (files) files.forEach((f) => formData.append('files', f));
    const response = await api.post<Note>('/notes', formData);
    return response.data;
  },
  
  update: async (id: string, note: Partial<Note>) => {
    const response = await api.put<Note>(`/notes/${id}`, note);
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
  }
};