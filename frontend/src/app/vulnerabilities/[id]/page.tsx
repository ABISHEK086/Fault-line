"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, BlastRadius } from "@/lib/api";
import BlastRadiusDiagram from "@/components/BlastRadiusDiagram";
import SeverityBadge from "@/components/SeverityBadge";
import { ErrorBanner } from "@/components/StateBanner";

export default function VulnerabilityDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<BlastRadius | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [path, setPath] = useState<string[] | null>(null);

  useEffect(() => {
    api
      .blastRadius(params.id)
      .then(setData)
      .catch((e: ApiError) => setError(e.message));
  }, [params.id]);

  useEffect(() => {
    if (!selected) {
      setPath(null);
      return;
    }
    api
      .path(params.id, selected)
      .then((res) => setPath(res.chain))
      .catch(() => setPath(null));
  }, [selected, params.id]);

  if (error) return <ErrorBanner message={error} />;

  if (!data) {
    return (
      <div>
        <div className="skeleton h-3 w-32" />
        <div className="skeleton mt-3 h-8 w-64" />
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="skeleton aspect-square border border-line" />
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-10 w-full border border-line"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const teamGroups = data.services.reduce<Record<string, typeof data.services>>(
    (acc, svc) => {
      (acc[svc.teamName] ||= []).push(svc);
      return acc;
    },
    {},
  );

  return (
    <div>
      <Link
        href="/vulnerabilities"
        className="font-mono text-xs text-muted hover:text-steady"
      >
        ← all vulnerabilities
      </Link>

      <div className="rise mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl uppercase text-paper">
          {data.cve}
        </h1>
        <SeverityBadge severity={data.severity} />
      </div>
      <p
        className="rise mt-2 max-w-2xl text-sm text-muted"
        style={{ animationDelay: "40ms" }}
      >
        {data.summary}
      </p>
      <p
        className="rise mt-1 font-mono text-xs text-muted"
        style={{ animationDelay: "60ms" }}
      >
        Epicenter package:{" "}
        <span className="text-paper">{data.vulnerablePackage}</span>
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div
          className="rise relative border-[1.5px] border-paper bg-panel"
          style={{ animationDelay: "100ms" }}
        >
          <span className="rivet left-2 top-2" />
          <span className="rivet right-2 top-2" />
          <span className="rivet bottom-2 left-2" />
          <span className="rivet bottom-2 right-2" />

          <div className="flex items-center justify-between border-b-[1.5px] border-paper bg-paper px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink">
            <span>Field report</span>
            <span>{data.cve}</span>
          </div>

          <div className="p-4">
            <BlastRadiusDiagram
              epicenter={data.vulnerablePackage}
              severity={data.severity}
              services={data.services}
              selectedServiceId={selected}
              onSelectService={setSelected}
              size={620}
            />
            <p className="mt-2 text-center text-xs text-muted">
              Click a service to trace its dependency path back to the
              epicenter.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {selected && path && (
            <div className="border-[1.5px] border-steady bg-panel px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-steady">
                Shortest dependency path
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1 font-mono text-xs text-paper">
                {path.map((node, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="bg-panel2 px-1.5 py-0.5">{node}</span>
                    {i < path.length - 1 && (
                      <span className="text-muted">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
              {data.affectedServiceCount} services exposed, by team
            </p>
            <div className="mt-3 flex flex-col gap-4">
              {Object.entries(teamGroups).map(([team, services], gi) => (
                <div
                  key={team}
                  className="rise"
                  style={{ animationDelay: `${gi * 60}ms` }}
                >
                  <p className="font-display text-sm uppercase text-paper">
                    {team}
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {services.map((svc) => (
                      <li key={svc.id}>
                        <button
                          onClick={() => setSelected(svc.id)}
                          className={`flex w-full items-center justify-between border px-3 py-2 text-left text-sm transition-colors ${
                            selected === svc.id
                              ? "border-steady bg-panel2"
                              : "border-line bg-panel hover:border-steady/50"
                          }`}
                        >
                          <span className="font-mono text-paper">
                            {svc.name}
                          </span>
                          <span className="text-[10px] text-muted">
                            via {svc.viaPackages.join(", ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}