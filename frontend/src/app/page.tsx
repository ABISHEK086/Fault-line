"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  ApiError,
  BlastRadius,
  CriticalPackage,
  TeamExposure,
  Vulnerability,
} from "@/lib/api";
import BlastRadiusDiagram from "@/components/BlastRadiusDiagram";
import SeverityBadge from "@/components/SeverityBadge";
import { ErrorBanner, EmptyBanner } from "@/components/StateBanner";

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

  const maxExposed = Math.max(1, ...(critical ?? []).map((p) => p.exposedServices));
  const maxVuln = Math.max(1, ...(teams ?? []).map((t) => t.vulnCount));

  return (
    <div className="flex flex-col gap-16">
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div className="rise">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steady">
            Software supply-chain impact graph
          </p>
          <h1 className="mt-3 font-display text-3xl uppercase leading-[1.15] text-paper sm:text-4xl">
            When a dependency
            <br />
            turns out to be a bomb,
            <br />
            <span className="text-signal">this is who&apos;s on fire.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            Faultline models your services, their package dependencies - direct and
            transitive - and who owns them, as a graph. Point at a CVE and see the
            full blast radius in one traversal: no manually walking package.json
            files service by service.
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href="/vulnerabilities"
              className="border border-signal bg-signal px-4 py-2 font-mono text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
            >
              View open vulnerabilities
            </Link>
            <Link
              href="/services"
              className="border border-line px-4 py-2 font-mono text-sm text-paper transition-colors hover:border-steady"
            >
              Browse services
            </Link>
          </div>
        </div>

        <div className="rise relative border-[1.5px] border-paper bg-panel" style={{ animationDelay: "80ms" }}>
          <span className="rivet left-2 top-2" />
          <span className="rivet right-2 top-2" />
          <span className="rivet bottom-2 left-2" />
          <span className="rivet bottom-2 right-2" />

          <div className="flex items-center justify-between border-b-[1.5px] border-paper bg-paper px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink">
            <span>Field report</span>
            <span>Blast-radius</span>
          </div>

          <div className="p-5">
            {!heroRadius ? (
              <HeroSkeleton />
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-xs text-muted">
                    {heroRadius.cve} · epicenter:{" "}
                    <span className="text-paper">{heroRadius.vulnerablePackage}</span>
                  </p>
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
        </div>
      </section>

      <section className="rise grid grid-cols-2 divide-x-[1.5px] divide-paper border-[1.5px] border-paper sm:grid-cols-4">
        <Stat label="Open CVEs" value={vulns?.length} />
        <Stat
          label="Critical severity"
          value={vulns?.filter((v) => v.severity === "CRITICAL").length}
          accent="signal"
        />
        <Stat
          label="Max blast radius"
          value={vulns ? Math.max(0, ...vulns.map((v) => v.exposedServices)) : undefined}
          unit="services"
        />
        <Stat label="Teams tracked" value={teams?.length} />
      </section>


      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Single points of failure"
            title="Most-depended-upon packages"
            hint="Ranked by distinct services transitively exposed if this package alone were compromised."
          />
          {!critical ? (
            <ListSkeleton />
          ) : critical.length === 0 ? (
            <EmptyBanner title="No package usage data yet." />
          ) : (
            <ol className="mt-4 flex flex-col gap-1.5">
              {critical.slice(0, 8).map((p, i) => (
                <li
                  key={p.id}
                  className="rise relative flex items-center justify-between overflow-hidden border border-line px-4 py-2.5"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span
                    className="row-bar"
                    style={{ width: `${(p.exposedServices / maxExposed) * 100}%` }}
                  />
                  <div className="relative z-[1] flex items-center gap-3">
                    <span className="font-mono text-xs text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-sm text-paper">{p.name}</span>
                    <span className="border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      {p.ecosystem}
                    </span>
                  </div>
                  <span className="relative z-[1] font-mono text-sm text-steady">
                    {p.exposedServices} svc
                  </span>
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
            <ListSkeleton />
          ) : teams.length === 0 ? (
            <EmptyBanner title="No teams found." />
          ) : (
            <ol className="mt-4 flex flex-col gap-1.5">
              {teams.slice(0, 8).map((t, i) => (
                <li
                  key={t.id}
                  className="rise relative flex items-center justify-between overflow-hidden border border-line px-4 py-2.5"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span
                    className="row-bar"
                    style={{ width: `${(t.vulnCount / maxVuln) * 100}%` }}
                  />
                  <div className="relative z-[1]">
                    <p className="font-mono text-sm text-paper">{t.name}</p>
                    <p className="text-xs text-muted">{t.serviceCount} services</p>
                  </div>
                  <div className="relative z-[1] flex items-center gap-2">
                    {t.criticalCount > 0 && (
                      <span className="border border-signaldim px-1.5 py-0.5 font-mono text-[10px] text-signal">
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
  value: number | undefined;
  unit?: string;
  accent?: "signal";
}) {
  return (
    <div className="flex flex-col justify-between px-4 py-4 sm:px-5 sm:py-5">
      {value === undefined ? (
        <span className="skeleton mt-1 h-8 w-14" />
      ) : (
        <p
          className={`font-display text-2xl ${accent === "signal" ? "text-signal" : "text-paper"}`}
        >
          {value}
          {unit && <span className="ml-1.5 font-mono text-xs font-normal text-muted">{unit}</span>}
        </p>
      )}
      <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, hint }: { eyebrow: string; title: string; hint: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-steady">{eyebrow}</p>
      <h2 className="mt-1 font-display text-base uppercase text-paper">{title}</h2>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-3">
      <div className="skeleton h-40 w-40 rounded-full" />
      <div className="skeleton h-3 w-48" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-10 w-full border border-line" />
      ))}
    </div>
  );
}