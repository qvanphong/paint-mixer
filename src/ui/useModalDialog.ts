import { useEffect, useRef } from 'react';

/**
 * Opens the <dialog> it is attached to as a modal when the component mounts, and closes it on unmount.
 * Focus goes back to the opener; if there is none or it left the page meanwhile (an empty state that the
 * dialog's own result removes), it goes to the main region instead of falling to the document body.
 */
export function useModalDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    // Safari does not focus a button on click, so the body counts as no opener.
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body ? active : null;
    element.showModal();
    return () => {
      element.close();
      if (opener?.isConnected) opener.focus();
      else document.getElementById('main')?.focus();
    };
  }, []);
  return dialog;
}
