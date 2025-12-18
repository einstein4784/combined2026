import { useEffect } from "react";

/**
 * Custom hook to lock body scroll when a modal is open
 * Simple approach: just prevent scrolling without layout compensation
 * to avoid conflicts with Next.js router refreshes
 */
export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const originalOverflow = body.style.overflow;
    
    // Prevent body scroll
    body.style.overflow = 'hidden';
    
    // Cleanup: restore original overflow
    return () => {
      body.style.overflow = originalOverflow;
    };
  }, [isOpen]);
}

