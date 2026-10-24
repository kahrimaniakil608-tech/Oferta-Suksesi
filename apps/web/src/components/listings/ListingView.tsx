"use client";
import { useEffect } from "react";
export default function ListingView({ listingId }: { listingId: string }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = false;
    const check = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState !== "visible" || sent) return;
      timer = setTimeout(() => {
        sent = true;
        void fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/listings/${encodeURIComponent(listingId)}/view`,
          {
            method: "POST",
            keepalive: true,
            signal: AbortSignal.timeout(5000),
          },
        ).catch(() => {});
      }, 1500);
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [listingId]);
  return null;
}
