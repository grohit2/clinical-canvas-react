import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logOut } from './use-firebase-auth';

/**
 * Hook to check if the current user has an approved custom claim.
 * If not approved, logs out and shows a pending message.
 */
export function useApprovalCheck() {
    const { user } = useAuth();
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const checkApproval = async () => {
            setChecking(true);
            try {
                if (user) {
                    try {
                        const tokenResult = await user.getIdTokenResult();
                        if (!tokenResult.claims.approved) {
                            await logOut();
                            alert('Your account is pending approval by an admin.');
                        }
                    } catch (err) {
                        await logOut();
                        alert('There was a problem checking your approval status. Please contact support.');
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
