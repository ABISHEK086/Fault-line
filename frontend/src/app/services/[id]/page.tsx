"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, ServiceDependencies } from "@/lib/api";
import { ErrorBanner } from "@/components/StateBanner";
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

  if (!data) {
    return (
      <div>
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-3 h-8 w-64" />
        <div className="mt-8 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full border border-line" />
          ))}
        </div>
      </div>
    );
  }

  const vulnCount = data.dependencyTree.reduce(
    (sum, d) => sum + d.transitive.filter((t) => t.vulnerable).length,
    0,
  );

  return (
    <div>
      <Link
        href="/services"
        className="font-mono text-xs text-muted hover:text-steady"
      >
        ← all services
      </Link>

      <div className="rise mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl uppercase text-paper">
          {data.serviceName}
        </h1>
        <span className="border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-muted">
          {data.serviceTier}
        </span>
      </div>
      <p
        className="rise mt-1 text-sm text-muted"
        style={{ animationDelay: "40ms" }}
      >
        Owned by {data.teamName}
      </p>

      {vulnCount > 0 ? (
        <p
          className="rise mt-3 inline-block border border-signaldim bg-panel px-3 py-1.5 font-mono text-xs text-signal"
          style={{ animationDelay: "60ms" }}
        >
          {vulnCount} vulnerable package{vulnCount > 1 ? "s" : ""} reachable in
          this tree
        </p>
      ) : (
        <p
          className="rise mt-3 inline-block border border-steady/30 bg-panel px-3 py-1.5 font-mono text-xs text-steady"
          style={{ animationDelay: "60ms" }}
        >
          No known vulnerabilities in this dependency tree
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {data.dependencyTree.map((entry, i) => (
          <div
            key={i}
            className="rise border border-line bg-panel px-4 py-3.5"
            style={{ animationDelay: `${100 + i * 40}ms` }}
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-steady" />
              <p className="font-mono text-sm text-paper">{entry.direct}</p>
              <span className="border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
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