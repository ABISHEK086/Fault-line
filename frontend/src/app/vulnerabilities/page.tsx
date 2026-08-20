"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, Vulnerability } from "@/lib/api";
import SeverityBadge from "@/components/SeverityBadge";
import { ErrorBanner, EmptyBanner } from "@/components/StateBanner";

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .vulnerabilities()
      .then(setVulns)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  const maxExposed = Math.max(
    1,
    ...(vulns ?? []).map((v) => v.exposedServices),
  );

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-steady">
        Open vulnerabilities
      </p>
      <h1 className="mt-1 font-display text-2xl uppercase text-paper">
        Every disclosed CVE reachable in your dependency graph
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Sorted by severity, then by how many services are transitively exposed —
        that count already required a full dependency-chain traversal per row.
      </p>

      <div className="mt-8">
        {error && <ErrorBanner message={error} />}

        {!error && !vulns && (
          <div className="border-[1.5px] border-paper">
            <div className="bg-paper px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink">
              Traversing dependency graph…
            </div>
            <div className="flex flex-col gap-px bg-line">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-11 bg-panel" />
              ))}
            </div>
          </div>
        )}

        {!error && vulns && vulns.length === 0 && (
          <EmptyBanner
            title="No vulnerabilities loaded yet."
            hint="Run backend/seed/seed.py against your CognoDB instance."
          />
        )}

        {!error && vulns && vulns.length > 0 && (
          <div className="rise overflow-hidden border-[1.5px] border-paper">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-paper text-left font-mono text-[10px] uppercase tracking-[0.15em] text-ink">
                  <th className="px-4 py-2.5 font-medium">Severity</th>
                  <th className="px-4 py-2.5 font-medium">CVE</th>
                  <th className="px-4 py-2.5 font-medium">Package</th>
                  <th className="px-4 py-2.5 font-medium">Summary</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Blast radius
                  </th>
                </tr>
              </thead>
              <tbody>
                {vulns.map((v, i) => (
                  <tr
                    key={v.id}
                    className="relative border-b border-line last:border-0 hover:bg-panel2/60"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="row-bar"
                        style={{
                          width: `${(v.exposedServices / maxExposed) * 100}%`,
                        }}
                      />
                      <span className="relative z-[1]">
                        <SeverityBadge severity={v.severity} />
                      </span>
                    </td>
                    <td className="relative z-[1] px-4 py-3">
                      <Link
                        href={`/vulnerabilities/${v.id}`}
                        className="font-mono text-paper underline decoration-line underline-offset-2 hover:text-steady hover:decoration-steady"
                      >
                        {v.cve}
                      </Link>
                    </td>
                    <td className="relative z-[1] px-4 py-3 font-mono text-muted">
                      {v.packageName}
                      <span className="ml-1.5 text-[10px] text-muted/70">
                        {v.ecosystem}
                      </span>
                    </td>
                    <td className="relative z-[1] max-w-sm px-4 py-3 text-muted">
                      {v.summary}
                    </td>
                    <td className="relative z-[1] px-4 py-3 text-right font-mono text-steady">
                      {v.exposedServices} svc
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}