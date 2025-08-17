import { useEffect, useState } from 'react';
import { useAuth, logOut } from './use-firebase-auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '../lib/firebase';

const db = getFirestore(app);

/**
 * Hook to check if the current user is approved in Firestore.
 * If not approved, logs out and shows a pending message.
 * Also creates a user doc on first login if it doesn't exist.
 */
export function useApprovalCheck() {
    const user = useAuth();
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const checkApproval = async () => {
            setChecking(true);
            try {
                if (user) {
                    const userRef = doc(db, 'userApprovals', user.uid);
                    let userSnap;
                    try {
                        userSnap = await getDoc(userRef);
                    } catch (err) {
                        // Firestore read error
                        await logOut();
                        alert('There was a problem checking your approval status. Please contact support.');
                        return;
                    }
                    if (!userSnap.exists()) {
                        // Create user doc with approved: false, then log out
                        try {
                            await setDoc(userRef, {
                                email: user.email,
                                approved: false,
                                createdAt: new Date().toISOString(),
                            });
                        } catch (err) {
                            await logOut();
                            alert('There was a problem creating your approval request. Please contact support.');
                            return;
                        }
                        await logOut();
                        alert('Your account is pending approval by an admin.');
                        return;
                    }
                    if (!userSnap.data().approved) {
                        await logOut();
                        alert('Your account is pending approval by an admin.');
                        return;
                    }
                }
            } finally {
                if (isMounted) setChecking(false);
            }
        };
        if (user) {
            checkApproval();
        }
        return () => { isMounted = false; };
    }, [user]);

    return checking;
}
