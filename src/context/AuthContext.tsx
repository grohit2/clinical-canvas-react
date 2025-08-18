import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";

type Claims = {
  approved?: boolean;
  [k: string]: unknown;
};

type AuthContextShape = {
  user: User | null;
  loading: boolean;
  claims: Claims | null; // includes `approved` if present
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [claims, setClaims] = useState<Claims | null>(null);
  const [loading, setLoading] = useState(() => !auth.currentUser);

  useEffect(() => {
    if (auth.currentUser) {
      auth.currentUser
        .getIdTokenResult()
        .then((tr) => setClaims(tr.claims as Claims))
        .catch(() => setClaims(null));
    }

    // Single listener with cleanup
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const tokenResult = await u.getIdTokenResult();
          setClaims(tokenResult.claims as Claims);
        } catch {
          setClaims(null);
        }
      } else {
        setClaims(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will update user/claims
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({ user, loading, claims, login, logout }),
    [user, loading, claims]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
