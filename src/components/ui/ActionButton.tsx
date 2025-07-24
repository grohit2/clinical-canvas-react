import React from 'react';

export const ActionButton = ({ icon, label, onClick, ariaLabel }) => (
  <button
    className="flex flex-col items-center justify-center w-16 h-16 bg-gray-100 rounded-r-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
    onClick={onClick}
    aria-label={ariaLabel || label}
    type="button"
  >
    <span className="text-2xl mb-1">{icon}</span>
    <span className="text-xs font-medium text-gray-700">{label}</span>
  </button>
);