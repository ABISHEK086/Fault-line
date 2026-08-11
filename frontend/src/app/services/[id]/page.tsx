"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, ServiceDependencies } from "@/lib/api";
import { LoadingBanner, ErrorBanner } from "@/components/StateBanner";
import SeverityBadge from "@/components/SeverityBadge";

export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ServiceDependencies | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .serviceDependencies(params.id)
      .then(setData)
      .catch((e: ApiError) => setError(e.message));
  }, [params.id]);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <LoadingBanner label="Walking dependency tree" />;

  const vulnCount = data.dependencyTree.reduce(
    (sum, d) => sum + d.transitive.filter((t) => t.vulnerable).length,
    0
  );

  return (
    <div>
      <Link href="/services" className="font-mono text-xs text-muted hover:text-steady">
        ← all services
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold text-paper">{data.serviceName}</h1>
        <span className="rounded border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-muted">
          {data.serviceTier}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">Owned by {data.teamName}</p>

      {vulnCount > 0 ? (
        <p className="mt-3 inline-block rounded border border-signaldim bg-panel px-3 py-1.5 font-mono text-xs text-signal">
          {vulnCount} vulnerable package{vulnCount > 1 ? "s" : ""} reachable in this tree
        </p>
      ) : (
        <p className="mt-3 inline-block rounded border border-steady/30 bg-panel px-3 py-1.5 font-mono text-xs text-steady">
          No known vulnerabilities in this dependency tree
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {data.dependencyTree.map((entry, i) => (
          <div key={i} className="rounded border border-line bg-panel px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-steady" />
              <p className="font-mono text-sm text-paper">{entry.direct}</p>
              <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {entry.ecosystem}
              </span>
              <span className="text-[11px] text-muted">direct dependency</span>
            </div>
            {entry.transitive.length > 0 && (
              <ul className="ml-3.5 mt-2 flex flex-col gap-1 border-l border-line pl-4">
                {entry.transitive
                  .filter((t) => t.name !== entry.direct)
                  .map((t, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted">{t.name}</span>
                      {t.vulnerable && (
                        <>
                          <SeverityBadge severity={t.severity!} />
                          <span className="font-mono text-muted">{t.cve}</span>
                        </>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
