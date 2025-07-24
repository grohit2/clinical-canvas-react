import React from 'react';
import { ActionButton } from './ui/ActionButton';

const LIS_URL = 'http://115.241.194.20/LIS/Reports/Patient_Report.aspx/';

export const RightActions = ({ mrn, close, showToast }) => {
  const openLink = (mrn) => {
    const url = `${LIS_URL}${mrn}`;
    window.open(url, '_blank');
    close && close();
  };

  const copyMrn = (mrn) => {
    navigator.clipboard.writeText(mrn);
    if (showToast) showToast('MRN copied');
    close && close();
  };

  const openRadiology = (mrn) => {
    if (showToast) showToast('Radiology link coming soon');
    close && close();
  };

  return (
    <div className="flex h-full items-center bg-gray-100 rounded-r-lg overflow-hidden">
      <ActionButton icon="🧪" label="Labs" onClick={() => openLink(mrn)} />
      <ActionButton icon="📋" label="Copy" onClick={() => copyMrn(mrn)} />
      <ActionButton icon="🖼️" label="Radio" onClick={() => openRadiology(mrn)} />
    </div>
  );
};