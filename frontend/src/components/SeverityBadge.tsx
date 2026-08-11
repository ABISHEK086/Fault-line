export default function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-mono font-medium tracking-wide severity-${severity}`}
    >
      {severity}
    </span>
  );
}
