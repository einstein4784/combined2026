import { useEffect } from "react";

/**
 * Custom hook to lock body scroll when a modal is open
 * and prevent layout shift by compensating for scrollbar width
 */
export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // Calculate scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Store original values
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // Prevent body scroll and compensate for scrollbar width to prevent layout shift
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      return () => {
        // Restore original values
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);
}

