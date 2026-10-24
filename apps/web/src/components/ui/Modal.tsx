"use client";
import { useEffect, useRef } from "react";
export default function Modal({
  children,
  onClose,
  label,
  className = "",
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          // Handle dismissal here without also invoking browser Escape actions.
          event.preventDefault();
          event.stopPropagation();
          close.current();
          return;
        }
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "a[href], button, input, select, textarea, [tabindex]",
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(":disabled") &&
            element.getClientRects().length > 0,
        );
        const first = controls[0],
          last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      className={`m-auto max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto p-0 bg-transparent backdrop:bg-black/50 ${className}`}
    >
      <div data-dialog-feedback />
      {children}
    </dialog>
  );
}
