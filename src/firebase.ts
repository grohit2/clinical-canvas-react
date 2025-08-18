import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  // optional:
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

const app = initializeApp(firebaseConfig);

// Firestore offline cache (fast warm starts, multi-tab aware)
initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const db = getFirestore(app);
export const auth = getAuth(app);

// Explicit long-lived session persistence (survives reloads)
setPersistence(auth, browserLocalPersistence);

// Optional: initialize Analytics only in supported browser environments
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  // Lazy-load analytics to avoid impacting non-browser contexts
  import("firebase/analytics").then(async ({ getAnalytics, isSupported }) => {
    try {
      const ok = await isSupported();
      if (ok) getAnalytics(app);
    } catch {
      // ignore analytics init errors
    }
  });
}
