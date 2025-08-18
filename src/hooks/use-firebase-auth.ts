import { auth } from '../lib/firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInWithPopup,
    GoogleAuthProvider,
} from 'firebase/auth';

// Sign up with email and password
export function signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

// Sign in with email and password
export function signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

// Sign out
export function logOut() {
    return signOut(auth);
}

// Sign in with Google
export function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}
