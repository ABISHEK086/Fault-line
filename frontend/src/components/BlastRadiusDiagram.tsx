"use client";

import { useMemo, useState } from "react";
import type { BlastRadiusService } from "@/lib/api";

const TIER_RADIUS: Record<string, number> = {
  critical: 0.62,
  standard: 0.82,
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

export default function BlastRadiusDiagram({
  epicenter,
  severity,
  services,
  size = 560,
  onSelectService,
  selectedServiceId,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const maxRing = size / 2 - 64;

  const points = useMemo(() => {
    const n = Math.max(services.length, 1);
    return services.map((svc, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const ringFactor = TIER_RADIUS[svc.tier] ?? 0.9;
      const r = maxRing * ringFactor;
      return {
        svc,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
  }, [services, cx, cy, maxRing]);

  const severityColor =
    severity === "CRITICAL" ? "#FF6A3D" : severity === "HIGH" ? "#F5B942" : "#34D1BF";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Blast radius diagram: ${services.length} services transitively depend on ${epicenter}`}
    >
      {/* concentric shockwave rings, one per service tier */}
      {Object.values(TIER_RADIUS).map((f, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={maxRing * f}
          fill="none"
          stroke="#243252"
          strokeWidth={1}
          strokeDasharray="2 6"
        />
      ))}

      {/* spokes to each affected service */}
      {points.map(({ svc, x, y }) => {
        const isActive = hovered === svc.id || selectedServiceId === svc.id;
        return (
          <line
            key={svc.id}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={isActive ? severityColor : "#2c3654"}
            strokeWidth={isActive ? 2 : 1}
          />
        );
      })}

      {/* service nodes */}
      {points.map(({ svc, x, y }) => {
        const isActive = hovered === svc.id || selectedServiceId === svc.id;
        return (
          <g
            key={svc.id}
            transform={`translate(${x}, ${y})`}
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
            <circle
              r={isActive ? 7 : 5}
              fill={isActive ? severityColor : "#101A2E"}
              stroke={isActive ? severityColor : "#8892A6"}
              strokeWidth={1.5}
            />
            <text
              x={x > cx ? 10 : -10}
              y={4}
              textAnchor={x > cx ? "start" : "end"}
              className="fill-paper font-mono"
              fontSize={11}
              opacity={isActive ? 1 : 0.75}
            >
              {svc.name}
            </text>
          </g>
        );
      })}

      {/* epicenter */}
      <g transform={`translate(${cx}, ${cy})`}>
        <circle r={22} fill="#0B1220" stroke={severityColor} strokeWidth={2} />
        <circle r={22} fill={severityColor} opacity={0.12} />
        <text
          textAnchor="middle"
          y={-30}
          className="fill-muted font-mono"
          fontSize={10}
          letterSpacing={1}
        >
          EPICENTER
        </text>
        <text
          textAnchor="middle"
          y={4}
          className="fill-paper font-mono font-semibold"
          fontSize={11}
        >
          {epicenter.length > 14 ? epicenter.slice(0, 13) + "\u2026" : epicenter}
        </text>
      </g>
    </svg>
  );
}
