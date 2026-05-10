/**
 * useKeyboardAvoid
 *
 * Tracks the software keyboard height on mobile and writes it to a CSS
 * custom property --kb-offset on <html> so modal sheets can shift up.
 *
 * Uses the Visual Viewport API (supported in all modern mobile browsers).
 * On desktop / when no keyboard is present the value is always 0px.
 */
import { useEffect } from 'react';

export function useKeyboardAvoid() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // keyboardHeight = layoutViewport height - visualViewport height
      // (when keyboard is open, visualViewport shrinks)
      const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-offset', `${kbHeight}px`);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update(); // initial

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.documentElement.style.setProperty('--kb-offset', '0px');
    };
  }, []);
}
