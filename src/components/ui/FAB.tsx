import React from 'react';

export const FAB = ({ icon, label, onClick, style, ariaLabel }) => (
  <button
    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
    style={style}
    onClick={onClick}
    aria-label={ariaLabel || label}
  >
    {icon}
    {label && <span className="font-semibold text-base">{label}</span>}
  </button>
);