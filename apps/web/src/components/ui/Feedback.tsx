"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Persistent feedback. Errors are focused so a failed save is not missed below the fold. */
export default function Feedback({ message, type = "error", retry }: {
  message: string;
  type?: "error" | "success";
  retry?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => {
    const dialogs = document.querySelectorAll('dialog[open] [data-dialog-feedback]');
    setHost(dialogs.length ? dialogs[dialogs.length - 1] : null);
  }, [message]);
  useEffect(() => {
    if (message && type === "error") ref.current?.focus({ preventScroll: false });
  }, [message, type, host]);
  if (!message) return null;
  const content = <div ref={ref} tabIndex={-1} role={type === "error" ? "alert" : "status"}
    className={`rounded-xl border p-4 text-sm break-words ${type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
    {message}
    {retry && <button type="button" onClick={retry} className="ml-3 min-h-10 underline font-semibold">Provo përsëri</button>}
  </div>;
  return host?.isConnected ? createPortal(content, host) : content;
}
