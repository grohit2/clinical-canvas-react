import React, { useRef, useState, useEffect } from 'react';

// ACTION_WIDTH in px
const ACTION_WIDTH = 216; // 3 actions * 72px

export const SwipeableRow = ({ children, renderRightActions, onSwipeableOpen, onSwipeableClose }) => {
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lockedOpen, setLockedOpen] = useState(false);
  const startX = useRef(0);
  const lastX = useRef(0);
  const rowRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!lockedOpen) return;
    const handleClick = (e) => {
      if (rowRef.current && !rowRef.current.contains(e.target)) {
        setTranslateX(0);
        setLockedOpen(false);
        onSwipeableClose && onSwipeableClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [lockedOpen, onSwipeableClose]);

  // Mouse/touch handlers
  const handleDragStart = (e) => {
    setDragging(true);
    startX.current = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    lastX.current = translateX;
  };
  const handleDragMove = (e) => {
    if (!dragging) return;
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    let dx = clientX - startX.current;
    let newX = Math.min(0, Math.max(-ACTION_WIDTH, lastX.current + dx));
    setTranslateX(newX);
  };
  const handleDragEnd = (e) => {
    if (!dragging) return;
    setDragging(false);
    // Snap logic
    if (Math.abs(translateX) > ACTION_WIDTH / 2) {
      setTranslateX(-ACTION_WIDTH);
      setLockedOpen(true);
      onSwipeableOpen && onSwipeableOpen();
    } else {
      setTranslateX(0);
      setLockedOpen(false);
      onSwipeableClose && onSwipeableClose();
    }
  };

  // Keyboard accessibility: open on context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    setTranslateX(-ACTION_WIDTH);
    setLockedOpen(true);
    onSwipeableOpen && onSwipeableOpen();
  };

  return (
    <div
      ref={rowRef}
      className="relative w-full"
      tabIndex={0}
      aria-label="Swipeable row"
      onContextMenu={handleContextMenu}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Actions bar (right) */}
      <div
        className="absolute top-0 right-0 h-full flex"
        style={{ width: ACTION_WIDTH, zIndex: 1 }}
      >
        {renderRightActions?.()}
      </div>
      {/* Row content */}
      <div
        className="bg-white rounded-lg shadow transition-transform select-none"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s cubic-bezier(.4,2,.6,1)',
        }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        role="button"
        tabIndex={0}
        aria-label="Row content"
      >
        {children}
      </div>
    </div>
  );
};