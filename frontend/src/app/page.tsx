"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, BlastRadius, CriticalPackage, TeamExposure, Vulnerability } from "@/lib/api";
import BlastRadiusDiagram from "@/components/BlastRadiusDiagram";
import SeverityBadge from "@/components/SeverityBadge";
import { LoadingBanner, ErrorBanner, EmptyBanner } from "@/components/StateBanner";

export default function DashboardPage() {
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [heroRadius, setHeroRadius] = useState<BlastRadius | null>(null);
  const [heroId, setHeroId] = useState<string | null>(null);
  const [critical, setCritical] = useState<CriticalPackage[] | null>(null);
  const [teams, setTeams] = useState<TeamExposure[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.vulnerabilities(), api.criticalPackages(), api.teamExposure()])
      .then(([v, c, t]) => {
        setVulns(v);
        setCritical(c);
        setTeams(t);
        if (v.length > 0) setHeroId(v[0].id);
      })
      .catch((e: ApiError) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!heroId) return;
    api.blastRadius(heroId).then(setHeroRadius).catch((e: ApiError) => setError(e.message));
  }, [heroId]);

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-steady">
            Software supply-chain impact graph
          </p>
          <h1 className="mt-3 font-mono text-4xl font-semibold leading-tight text-paper sm:text-5xl">
            When a dependency
            <br />
            turns out to be a bomb,
            <br />
            <span className="text-signal">this is who&apos;s on fire.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            Faultline models your services, their package dependencies — direct and
            transitive — and who owns them, as a graph. Point at a CVE and see the
            full blast radius in one traversal: no manually walking package.json
            files service by service.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href="/vulnerabilities"
              className="rounded bg-signal px-4 py-2 font-mono text-sm font-medium text-ink transition-opacity hover:opacity-90"
            >
              View open vulnerabilities
            </Link>
            <Link
              href="/services"
              className="rounded border border-line px-4 py-2 font-mono text-sm text-paper transition-colors hover:border-steady"
            >
              Browse services
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4">
          {!heroRadius ? (
            <div className="flex aspect-square items-center justify-center">
              <LoadingBanner label="Computing blast radius" />
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-muted">
                    {heroRadius.cve} · epicenter:{" "}
                    <span className="text-paper">{heroRadius.vulnerablePackage}</span>
                  </p>
                </div>
                <SeverityBadge severity={heroRadius.severity} />
              </div>
              <BlastRadiusDiagram
                epicenter={heroRadius.vulnerablePackage}
                severity={heroRadius.severity}
                services={heroRadius.services}
              />
              <p className="mt-2 text-center font-mono text-xs text-muted">
                {heroRadius.affectedServiceCount} services transitively exposed —{" "}
                <Link href={`/vulnerabilities/${heroId}`} className="text-steady hover:underline">
                  full detail →
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      {/* Stats row */}
      {vulns && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Open CVEs" value={vulns.length} />
          <Stat
            label="Critical severity"
            value={vulns.filter((v) => v.severity === "CRITICAL").length}
            accent="signal"
          />
          <Stat
            label="Max blast radius"
            value={Math.max(0, ...vulns.map((v) => v.exposedServices))}
            unit="services"
          />
          <Stat label="Teams tracked" value={teams?.length ?? "—"} />
        </section>
      )}

      {/* Critical packages + team exposure */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Single points of failure"
            title="Most-depended-upon packages"
            hint="Ranked by distinct services transitively exposed if this package alone were compromised."
          />
          {!critical ? (
            <LoadingBanner />
          ) : critical.length === 0 ? (
            <EmptyBanner title="No package usage data yet." />
          ) : (
            <ol className="mt-4 flex flex-col gap-2">
              {critical.slice(0, 8).map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded border border-line bg-panel px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-mono text-sm text-paper">{p.name}</span>
                    <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      {p.ecosystem}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-steady">{p.exposedServices} svc</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <SectionHeading
            eyebrow="Ownership"
            title="Exposure by team"
            hint="Distinct vulnerabilities transitively reachable from each team's services."
          />
          {!teams ? (
            <LoadingBanner />
          ) : teams.length === 0 ? (
            <EmptyBanner title="No teams found." />
          ) : (
            <ol className="mt-4 flex flex-col gap-2">
              {teams.slice(0, 8).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded border border-line bg-panel px-4 py-2.5"
                >
                  <div>
                    <p className="font-mono text-sm text-paper">{t.name}</p>
                    <p className="text-xs text-muted">{t.serviceCount} services</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.criticalCount > 0 && (
                      <span className="rounded border border-signaldim px-1.5 py-0.5 font-mono text-[10px] text-signal">
                        {t.criticalCount} critical
                      </span>
                    )}
                    <span className="font-mono text-sm text-muted">{t.vulnCount} total</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number | string;
  unit?: string;
  accent?: "signal";
}) {
  return (
    <div className="rounded border border-line bg-panel px-4 py-4">
      <p className={`font-mono text-2xl font-semibold ${accent === "signal" ? "text-signal" : "text-paper"}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted">{unit}</span>}
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, hint }: { eyebrow: string; title: string; hint: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-steady">{eyebrow}</p>
      <h2 className="mt-1 font-mono text-lg font-semibold text-paper">{title}</h2>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
