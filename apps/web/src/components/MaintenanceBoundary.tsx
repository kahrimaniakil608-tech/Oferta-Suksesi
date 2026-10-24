"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
export default function MaintenanceBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const path = usePathname();
  const [config, setConfig] = useState<{
    maintenance: boolean;
    maintenanceMessage: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/site-config`,
      { cache: "no-store", signal: controller.signal },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(setConfig)
      .catch(() => {});
    return () => controller.abort();
  }, [path]);
  if (
    config?.maintenance &&
    !path.startsWith("/auth/") &&
    !path.startsWith("/admin") &&
    user?.role !== "ADMIN"
  )
    return (
      <section className="max-w-xl mx-auto p-10 text-center space-y-4">
        <h1 className="text-2xl font-bold">Mirëmbajtje</h1>
        <p role="status">{config.maintenanceMessage}</p>
        <Link href="/auth/hyr" className="underline">
          Hyr në llogari
        </Link>
      </section>
    );
  return children;
}
