"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, Vulnerability } from "@/lib/api";
import SeverityBadge from "@/components/SeverityBadge";
import {
  LoadingBanner,
  ErrorBanner,
  EmptyBanner,
} from "@/components/StateBanner";

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .vulnerabilities()
      .then(setVulns)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-steady">
        Open vulnerabilities
      </p>
      <h1 className="mt-1 font-mono text-2xl font-semibold text-paper">
        Every disclosed CVE reachable in your dependency graph
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Sorted by severity, then by how many services are transitively exposed -
        that count already required a full dependency-chain traversal per row.
      </p>

      <div className="mt-8">
        {error && <ErrorBanner message={error} />}
        {!error && !vulns && (
          <LoadingBanner label="Traversing dependency graph" />
        )}
        {!error && vulns && vulns.length === 0 && (
          <EmptyBanner
            title="No vulnerabilities loaded yet."
            hint="Run backend/seed/seed.py against your CognoDB instance."
          />
        )}
        {!error && vulns && vulns.length > 0 && (
          <div className="overflow-hidden border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-panel text-left font-mono text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">CVE</th>
                  <th className="px-4 py-3 font-medium">Package</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Blast radius
                  </th>
                </tr>
              </thead>
              <tbody>
                {vulns.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-line last:border-0 hover:bg-panel/60"
                  >
                    <td className="px-4 py-3">
                      <SeverityBadge severity={v.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/vulnerabilities/${v.id}`}
                        className="font-mono text-paper hover:text-steady hover:underline"
                      >
                        {v.cve}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">
                      {v.packageName}
                      <span className="ml-1.5 text-[10px] text-muted/70">
                        {v.ecosystem}
                      </span>
                    </td>
                    <td className="max-w-sm px-4 py-3 text-muted">
                      {v.summary}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-steady">
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