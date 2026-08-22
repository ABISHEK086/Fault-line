"use client";

import { useMemo, useState } from "react";
import type { BlastRadiusService } from "@/lib/api";

const TIER_RADIUS: Record<string, number> = {
  critical: 0.56,
  standard: 0.78,
  internal: 1.0,
};

type Props = {
  epicenter: string;
  severity: string;
  services: BlastRadiusService[];
  size?: number;
  onSelectService?: (id: string) => void;
  selectedServiceId?: string | null;
};

// Rough monospace character width at 11px, for sizing label pills without
// a DOM measurement pass.
const charWidth = (text: string, fontSize = 11) => text.length * fontSize * 0.6;

export default function BlastRadiusDiagram({
  epicenter,
  severity,
  services,
  size = 640,
  onSelectService,
  selectedServiceId,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const maxRing = size / 2 - 118; // generous margin so labels never clip
  const stripeId = "hazard-stripe-pattern";

  const severityColor =
    severity === "CRITICAL"
      ? "#D7263D"
      : severity === "HIGH"
        ? "#B98A00"
        : "#1B4B91";

  // Cluster services into contiguous angular slices, one per team, so the
  // diagram encodes *two* things at once: angle = which team owns it,
  // radial distance = how directly exposed it is (tier).
  const { points, teamArcs } = useMemo(() => {
    const teams = Array.from(new Set(services.map((s) => s.teamName)));
    const perTeamCount = new Map(
      teams.map((t) => [t, services.filter((s) => s.teamName === t).length]),
    );
    const total = services.length || 1;

    let cursor = -Math.PI / 2;
    const teamStart = new Map<string, number>();
    const teamSpan = new Map<string, number>();
    for (const team of teams) {
      const span = ((perTeamCount.get(team) ?? 0) / total) * Math.PI * 2;
      teamStart.set(team, cursor);
      teamSpan.set(team, span);
      cursor += span;
    }

    const withinTeamIndex = new Map<string, number>();
    const pts = services.map((svc) => {
      const start = teamStart.get(svc.teamName) ?? 0;
      const span = teamSpan.get(svc.teamName) ?? 0;
      const teamCount = perTeamCount.get(svc.teamName) ?? 1;
      const idx = withinTeamIndex.get(svc.teamName) ?? 0;
      withinTeamIndex.set(svc.teamName, idx + 1);

      // spread members evenly within their team's slice, with a small
      // inset so adjacent teams never touch
      const inset = span * 0.12;
      const t = teamCount > 1 ? idx / (teamCount - 1) : 0.5;
      const angle = start + inset + t * (span - inset * 2);

      const ringFactor = TIER_RADIUS[svc.tier] ?? 0.9;
      const r = maxRing * ringFactor;
      return {
        svc,
        angle,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });

    const arcs = teams.map((team) => {
      const start = teamStart.get(team) ?? 0;
      const span = teamSpan.get(team) ?? 0;
      const mid = start + span / 2;
      return {
        team,
        boundary: start,
        labelX: cx + (maxRing + 34) * Math.cos(mid),
        labelY: cy + (maxRing + 34) * Math.sin(mid),
        anchor:
          Math.cos(mid) > 0.15
            ? "start"
            : Math.cos(mid) < -0.15
              ? "end"
              : "middle",
      };
    });

    return { points: pts, teamArcs: arcs };
  }, [services, cx, cy, maxRing]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Blast radius diagram: ${services.length} services across ${teamArcs.length} teams transitively depend on ${epicenter}`}
    >
      <defs>
        <pattern
          id={stripeId}
          width="10"
          height="10"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="10" height="10" fill="#ffc400" />
          <rect width="5" height="10" fill="#15140f" />
        </pattern>
      </defs>

      {/* concentric tier rings — plain hairlines, technical-drawing style */}
      {Object.values(TIER_RADIUS).map((f, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={maxRing * f}
          fill="none"
          stroke="#e3dfd0"
          strokeWidth={1}
        />
      ))}

      {/* team-boundary divider ticks + labels around the outer ring */}
      {teamArcs.map(({ team, boundary, labelX, labelY, anchor }) => {
        const x2 = cx + (maxRing + 12) * Math.cos(boundary);
        const y2 = cy + (maxRing + 12) * Math.sin(boundary);
        const x1 = cx + maxRing * Math.cos(boundary);
        const y1 = cy + maxRing * Math.sin(boundary);
        return (
          <g key={team}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#c7c2b2"
              strokeWidth={1}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor={anchor as "start" | "end" | "middle"}
              dominantBaseline="middle"
              className="fill-muted font-mono"
              fontSize={10}
              letterSpacing={0.5}
            >
              {team.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* curved connectors — quadratic bezier toward center, reads as a
          network graph rather than a flat spoke wheel */}
      {points.map(({ svc, x, y }) => {
        const isActive = hovered === svc.id || selectedServiceId === svc.id;
        const mx = cx + (x - cx) * 0.55;
        const my = cy + (y - cy) * 0.55;
        return (
          <path
            key={svc.id}
            d={`M ${cx} ${cy} Q ${mx} ${my} ${x} ${y}`}
            fill="none"
            stroke={isActive ? severityColor : "#d3cebb"}
            strokeWidth={isActive ? 2 : 1}
          />
        );
      })}

      {/* service nodes with label pills so text never sits directly on a line */}
      {points.map(({ svc, x, y }) => {
        const isActive = hovered === svc.id || selectedServiceId === svc.id;
        const onRight = x >= cx;
        const labelW = charWidth(svc.name) + 12;
        const pillX = onRight ? x + 10 : x - 10 - labelW;
        return (
          <g
            key={svc.id}
            className="cursor-pointer"
            onMouseEnter={() => setHovered(svc.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelectService?.(svc.id)}
            tabIndex={0}
            role="button"
            aria-label={`${svc.name}, owned by ${svc.teamName}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectService?.(svc.id);
            }}
          >
            {isActive && (
              <rect
                x={pillX}
                y={y - 9}
                width={labelW}
                height={18}
                fill="#fbfbf7"
                stroke={severityColor}
                strokeWidth={1}
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={isActive ? 6.5 : 4.5}
              fill={isActive ? severityColor : "#ffffff"}
              stroke={isActive ? severityColor : "#15140f"}
              strokeWidth={1.5}
              style={{
                transition: "r 0.15s ease, fill 0.15s ease, stroke 0.15s ease",
              }}
            />
            <text
              x={onRight ? x + 12 : x - 12}
              y={y}
              textAnchor={onRight ? "start" : "end"}
              dominantBaseline="middle"
              className="fill-paper font-mono"
              fontSize={11}
              opacity={isActive ? 1 : 0.82}
            >
              {svc.name}
            </text>
          </g>
        );
      })}

      {/* epicenter */}
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={28}
          fill="none"
          stroke={`url(#${stripeId})`}
          strokeWidth={7}
        />
        <circle
          cx={cx}
          cy={cy}
          r={21}
          fill="#ffffff"
          stroke="#15140f"
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy - 38}
          textAnchor="middle"
          className="fill-muted font-mono"
          fontSize={10}
          letterSpacing={1.5}
        >
          EPICENTER
        </text>
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="fill-paper font-mono font-semibold"
          fontSize={11}
        >
          {epicenter.length > 14
            ? epicenter.slice(0, 13) + "\u2026"
            : epicenter}
        </text>
      </g>
    </svg>
  );
}