import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  actions,
  className,
  onOpen,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  const actionBarWidth = actions.length * 72; // 72dp per action
  
  // Transform for revealing action bar
  const actionBarX = useTransform(x, [0, -actionBarWidth], [actionBarWidth, 0]);
  
  // Simulate haptic feedback for web
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50); // Short vibration
    }
  };

  const handleDragEnd = (event: Event, info: PanInfo) => {
    setIsDragging(false);
    
    const threshold = actionBarWidth * 0.5; // 50% threshold
    const velocity = Math.abs(info.velocity.x);
    
    if (Math.abs(info.offset.x) > threshold || velocity > 500) {
      // Snap to open
      x.set(-actionBarWidth);
      setIsOpen(true);
      triggerHaptic();
      onOpen?.();
    } else {
      // Snap to closed
      x.set(0);
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const closeCard = () => {
    x.set(0);
    setIsOpen(false);
    onClose?.();
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    closeCard();
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        closeCard();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        closeCard();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div 
      ref={cardRef}
      className={cn("relative overflow-hidden", className)}
      role="group"
      aria-label="Swipeable card with actions"
    >
      {/* Action Bar */}
      <motion.div
        ref={actionBarRef}
        className="absolute right-0 top-0 h-full flex z-10"
        style={{ x: actionBarX }}
        initial={{ x: actionBarWidth }}
      >
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            className={cn(
              "h-full w-[72px] flex flex-col items-center justify-center gap-1 text-white text-xs font-medium",
              action.color,
              index === actions.length - 1 && "rounded-r-lg"
            )}
            onClick={() => handleActionClick(action)}
            whileTap={{ scale: 0.95 }}
            role="button"
            aria-label={action.label}
            initial={isOpen ? { scale: 1 } : { scale: 0.8 }}
            animate={isOpen ? { scale: 1 } : { scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-lg">{action.icon}</div>
            <span className="text-[10px] leading-tight text-center">
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Main Card Content */}
      <motion.div
        className="relative z-20 bg-background"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -actionBarWidth, right: 0 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: "grabbing" }}
        animate={isOpen ? { x: -actionBarWidth } : { x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
      
      {/* Brief flash effect when opening */}
      {isOpen && (
        <motion.div
          className="absolute inset-0 bg-primary/10 pointer-events-none z-30"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      )}
    </div>
  );
};