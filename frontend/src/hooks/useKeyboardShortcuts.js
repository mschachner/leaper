import { useEffect } from "react";

export default function useKeyboardShortcuts(shortcuts) {
    useEffect(() => {
      const onKeyDown = (evt) => {
        for (const shortcut of shortcuts) {
          if (shortcut.match(evt)) {
            shortcut.action(evt);
            return;
          }
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [shortcuts]);
  }