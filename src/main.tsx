import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-share.js').catch(() => {});
  });
}

// Listen for Android share target messages
navigator.serviceWorker?.addEventListener?.('message', (e: MessageEvent) => {
  if (e.data?.type === 'shared-image') {
    const { name, fileType, data } = e.data;
    const blob = new Blob([new Uint8Array(data)], { type: fileType });
    const file = new File([blob], name, { type: fileType });
    // Dispatch a custom event for app-level handlers
    window.dispatchEvent(new CustomEvent('shared-image', { detail: file }));
  }
});

createRoot(document.getElementById("root")!).render(<App />);
