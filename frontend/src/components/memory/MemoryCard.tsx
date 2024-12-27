// src/components/memory/MemoryCard.tsx
import React from 'react';
import { Memory } from '../../types/memory'; 

interface MemoryCardProps {
    memory: Memory;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export const MemoryCard = ({ memory, onEdit, onDelete }: MemoryCardProps) => {
    return (
        <div className="memory-card">
            <h3>{memory.title}</h3>
            <p>{memory.content}</p>
            <button onClick={() => onEdit(memory.id)}>Edit</button>
            <button onClick={() => onDelete(memory.id)}>Delete</button>
        </div>
    );
};