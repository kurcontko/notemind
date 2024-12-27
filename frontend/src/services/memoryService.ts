// frontend/src/services/memoryService.ts
import { api } from './api';
import { Memory } from '../types/memory';

export const memoryService = {
  getAll: async () => {
    const response = await api.get<Memory[]>('/memories');
    return response.data;
  },
  
  create: async (memory: Omit<Memory, 'id'>) => {
    const response = await api.post<Memory>('/memories', memory);
    return response.data;
  },
  
  update: async (id: string, memory: Partial<Memory>) => {
    const response = await api.put<Memory>(`/memories/${id}`, memory);
    return response.data;
  },
  
  delete: async (id: string) => {
    await api.delete(`/memories/${id}`);
  },

  getById: async (id: string) => {
    const response = await api.get<Memory>(`/memories/${id}`);
    return response.data;
  }
};