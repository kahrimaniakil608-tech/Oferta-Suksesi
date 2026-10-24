"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Explicit editor baseline; never persists passwords or customer data in browser storage. */
export function useUnsavedChanges(value: unknown, ready = true) {
  const snapshot = JSON.stringify(value);
  const [baseline, setBaseline] = useState<string | null>(null);
  const current = useRef(snapshot);
  current.current = snapshot;
  useEffect(() => {
    if (!ready) {
      setBaseline(null);
    } else if (baseline === null) {
      setBaseline(snapshot);
    }
  }, [ready, baseline, snapshot]);
  const dirty = ready && baseline !== null && baseline !== snapshot;
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const markSaved = useCallback((saved?: unknown) => { const next = saved === undefined ? current.current : JSON.stringify(saved); dirtyRef.current = next !== current.current; setBaseline(next); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const link = (event: MouseEvent) => {
      if (!dirtyRef.current) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== location.origin ||
          anchor.href === location.href || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!window.confirm("Keni ndryshime të paruajtura. Dëshironi të largoheni pa i ruajtur?")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const navigate = (event: Event) => {
      const navigation = event as Event & { navigationType?: string };
      if (dirtyRef.current && navigation.navigationType === 'traverse' && event.cancelable &&
          !window.confirm("Keni ndryshime të paruajtura. Dëshironi të largoheni pa i ruajtur?")) event.preventDefault();
    };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", link, true);
    navigation?.addEventListener("navigate", navigate);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", link, true);
      navigation?.removeEventListener("navigate", navigate);
    };
  }, [dirty]);
  return { dirty, markSaved };
}
