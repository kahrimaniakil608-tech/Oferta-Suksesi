"use client";
import { useRef, useState } from "react";

export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    try { return await action(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Veprimi dështoi. Provoni përsëri."); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, actionError, run };
}
