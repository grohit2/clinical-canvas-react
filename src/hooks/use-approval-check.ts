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
                        let token = await user.getIdToken();
                        let { approved, exp } = JSON.parse(atob(token.split('.')[1]));
                        if (exp * 1000 < Date.now() || approved === undefined) {
                            token = await user.getIdToken(true);
                            ({ approved } = JSON.parse(atob(token.split('.')[1])));
                        }
                        if (!approved) {
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
