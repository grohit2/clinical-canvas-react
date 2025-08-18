import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { auth } from '../lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: PropsWithChildren<{}>) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    // Wait for Firebase to resolve the initial auth state from persistence.
    auth.authStateReady().then(() => {
      if (!isMounted) return;
      setUser(auth.currentUser);
      setLoading(false);
    });

    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      if (isMounted) setUser(currentUser);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
