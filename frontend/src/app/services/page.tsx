"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, ServiceSummary } from "@/lib/api";
import { LoadingBanner, ErrorBanner, EmptyBanner } from "@/components/StateBanner";

const TIER_STYLE: Record<string, string> = {
  critical: "border-signaldim text-signal",
  standard: "border-amber/40 text-amber",
  internal: "border-line text-muted",
};

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.services().then(setServices).catch((e: ApiError) => setError(e.message));
  }, []);

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-steady">Services</p>
      <h1 className="mt-1 font-mono text-2xl font-semibold text-paper">
        Every internal service and what it&apos;s built on
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Sorted by how many of its transitive dependencies currently carry an open CVE.
      </p>

      <div className="mt-8">
        {error && <ErrorBanner message={error} />}
        {!error && !services && <LoadingBanner />}
        {!error && services && services.length === 0 && (
          <EmptyBanner title="No services loaded yet." hint="Run backend/seed/seed.py first." />
        )}
        {!error && services && services.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.id}`}
                className="rounded border border-line bg-panel px-4 py-3.5 transition-colors hover:border-steady/60"
              >
                <div className="flex items-start justify-between">
                  <p className="font-mono text-sm text-paper">{s.name}</p>
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${TIER_STYLE[s.tier] ?? "border-line text-muted"}`}
                  >
                    {s.tier}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{s.teamName}</p>
                {s.vulnerablePackageCount > 0 ? (
                  <p className="mt-2 font-mono text-xs text-signal">
                    {s.vulnerablePackageCount} vulnerable dep{s.vulnerablePackageCount > 1 ? "s" : ""}
                  </p>
                ) : (
                  <p className="mt-2 font-mono text-xs text-steady">clean</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
