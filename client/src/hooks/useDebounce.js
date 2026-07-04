/**
 * useDebounce hook - debounces a value
 */
import { useState, useEffect } from 'react';

export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * useKeyboardShortcut hook
 */
export const useKeyboardShortcut = (key, ctrlKey, callback) => {
  useEffect(() => {
    const handler = (e) => {
      // Treat Cmd (metaKey) on macOS as equivalent to Ctrl for the shortcut.
      const modifierPressed = ctrlKey ? (e.ctrlKey || e.metaKey) : true;
      if (e.key === key && modifierPressed) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, ctrlKey, callback]);
};
