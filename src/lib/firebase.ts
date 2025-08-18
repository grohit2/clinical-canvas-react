// src/lib/firebase.ts
// Firebase initialization. Replace the config object with your Firebase project credentials.

import { initializeApp } from 'firebase/app';
import {
    initializeAuth,
    indexedDBLocalPersistence,
    inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    // During server-side rendering environments like Vercel's build step,
    // IndexedDB is unavailable. Fall back to an in-memory store so that
    // initialization doesn't throw and the client can rehydrate normally.
    persistence:
        typeof window === 'undefined'
            ? inMemoryPersistence
            : indexedDBLocalPersistence,
});

export const db = getFirestore(app);

// Enable offline persistence only in the browser. Some hosting environments
// (e.g. server-side rendering) lack IndexedDB and would otherwise throw.
if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
        console.warn('Failed to enable persistence', err);
    });
}
