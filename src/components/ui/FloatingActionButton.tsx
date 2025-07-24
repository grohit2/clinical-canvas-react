import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  hideOnKeyboard?: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  label,
  onClick,
  className,
  hideOnKeyboard = true,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      setHasScrolled(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setHasScrolled(false);
      }, 150);
    };

    const handleResize = () => {
      if (hideOnKeyboard) {
        // Detect if virtual keyboard is open (viewport height changed significantly)
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const screenHeight = window.screen.height;
        const heightRatio = viewportHeight / screenHeight;
        
        // If viewport height is significantly reduced, assume keyboard is open
        setIsVisible(heightRatio > 0.75);
      }
    };

    const handleVisualViewportChange = () => {
      if (hideOnKeyboard && window.visualViewport) {
        const heightRatio = window.visualViewport.height / window.screen.height;
        setIsVisible(heightRatio > 0.75);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleVisualViewportChange);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      clearTimeout(scrollTimeout);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleVisualViewportChange);
      }
    };
  }, [hideOnKeyboard]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            "fixed bottom-6 right-6 z-50",
            className
          )}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: hasScrolled ? 0.9 : 1, 
            opacity: 1,
            y: hasScrolled ? 8 : 0
          }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 25 
          }}
        >
          <Button
            onClick={onClick}
            className={cn(
              "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "flex items-center justify-center"
            )}
            aria-label={label}
            size="default"
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex items-center justify-center"
            >
              {icon}
            </motion.div>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};