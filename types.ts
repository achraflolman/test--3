

import type { Timestamp } from '@firebase/firestore';

export interface AppUser {
    uid: string;
    email: string;
    userName: string;
    profilePictureUrl: string;
    createdAt: Timestamp | Date;
    selectedSubjects: string[];
    schoolName: string;
    className: string;
    educationLevel: string;
    languagePreference: 'nl' | 'en';
    themePreference: string;
    homeLayout?: string[];
    hasCompletedTutorial?: boolean;
    customSubjects?: string[];
}

export interface FileData {
    id: string;
    title: string;
    description: string;
    subject: string;
    ownerId: string;
    createdAt: Timestamp;
    fileUrl: string;
    storagePath: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start: Timestamp;
    end: Timestamp;
    type: 'test' | 'presentation' | 'homework' | 'oral' | 'other';
    subject: string;
    ownerId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    subject: string;
    ownerId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface ToDoTask {
    id: string;
    text: string;
    completed: boolean;
    ownerId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Flashcard {
    id: string;
    question: string;
    answer: string;
    ownerId: string;
    createdAt: Timestamp;
    // --- SRS Fields ---
    dueDate?: Timestamp;
    interval?: number;
    easeFactor?: number;
}

export interface FlashcardDeck {
    id: string;
    name: string;
    subject: string;
    ownerId: string;
    createdAt: Timestamp;
    cardCount: number;
}


export interface ModalContent {
    text: string;
    confirmAction?: () => void;
    cancelAction?: () => void;
}