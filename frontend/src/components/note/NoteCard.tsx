// src/components/memory/MemoryCard.tsx
import React from 'react';
import { Note } from '../../types/note'; 

interface NoteCardProps {
    note: Note;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export const MemoryCard = ({ note, onEdit, onDelete }: NoteCardProps) => {
    return (
        <div className="memory-card">
            <h3>{note.title}</h3>
            <p>{note.content}</p>
            <button onClick={() => onEdit(note.note_id)}>Edit</button>
            <button onClick={() => onDelete(note.note_id)}>Delete</button>
        </div>
    );
};