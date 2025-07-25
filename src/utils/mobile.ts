// Mobile utilities for clipboard, haptic feedback, and browser integration

// Simulate haptic feedback for web
export const triggerHaptic = (type: 'impact' | 'selection' | 'notification' = 'selection') => {
  if (navigator.vibrate) {
    switch (type) {
      case 'impact':
        navigator.vibrate(100);
        break;
      case 'selection':
        navigator.vibrate(50);
        break;
      case 'notification':
        navigator.vibrate([100, 50, 100]);
        break;
    }
  }
};

// Copy text to clipboard with fallback
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      return fallbackCopyTextToClipboard(text);
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return fallbackCopyTextToClipboard(text);
  }
};

// Fallback clipboard copy method
const fallbackCopyTextToClipboard = (text: string): boolean => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Fallback: Failed to copy to clipboard:', err);
    return false;
  }
};

// Open URL in browser/webview
export const openInBrowser = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

// Generate Labs URL
export const generateLabsUrl = (mrn: string): string => {
  // Replace with actual LIS URL pattern
  return `/Patient_Report.aspx/${mrn}`;
};

// Generate Radiology URL (placeholder)
export const generateRadiologyUrl = (mrn: string): string => {
  // Placeholder for future radiology URL
  return `/radiology/${mrn}`;
};

// Detect if device has touch capability
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Detect mobile browser
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};