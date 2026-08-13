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
  const stripeId = "hazard-stripe-pattern";

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
    severity === "CRITICAL" ? "#D7263D" : severity === "HIGH" ? "#B98A00" : "#1B4B91";

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Blast radius diagram: ${services.length} services transitively depend on ${epicenter}`}
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

      {/* concentric rings — plain black hairlines, technical-drawing style */}
      {Object.values(TIER_RADIUS).map((f, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={maxRing * f}
          fill="none"
          stroke="#d9d4c5"
          strokeWidth={1}
        />
      ))}

      {/* spokes */}
      {points.map(({ svc, x, y }) => {
        const isActive = hovered === svc.id || selectedServiceId === svc.id;
        return (
          <line
            key={svc.id}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={isActive ? severityColor : "#c7c2b2"}
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
              fill={isActive ? severityColor : "#ffffff"}
              stroke={isActive ? severityColor : "#15140f"}
              strokeWidth={1.5}
            />
            <text
              x={x > cx ? 10 : -10}
              y={4}
              textAnchor={x > cx ? "start" : "end"}
              className="fill-paper font-mono"
              fontSize={11}
              opacity={isActive ? 1 : 0.8}
            >
              {svc.name}
            </text>
          </g>
        );
      })}

      {/* epicenter — the hazard-stripe ring, one of three deliberate uses of the motif */}
      <g transform={`translate(${cx}, ${cy})`}>
        <circle r={26} fill="none" stroke={`url(#${stripeId})`} strokeWidth={7} />
        <circle r={20} fill="#ffffff" stroke="#15140f" strokeWidth={2} />
        <text textAnchor="middle" y={-34} className="fill-muted font-mono" fontSize={10} letterSpacing={1}>
          EPICENTER
        </text>
        <text textAnchor="middle" y={4} className="fill-paper font-mono font-semibold" fontSize={11}>
          {epicenter.length > 14 ? epicenter.slice(0, 13) + "\u2026" : epicenter}
        </text>
      </g>
    </svg>
  );
}