const STAMP_CLASS: Record<string, string> = {
  CRITICAL: "stamp stamp-critical",
  HIGH: "stamp stamp-high",
  MEDIUM: "stamp stamp-medium",
  LOW: "stamp stamp-low",
};

export default function SeverityBadge({ severity }: { severity: string }) {
  return <span className={STAMP_CLASS[severity] ?? "stamp stamp-low"}>{severity}</span>;
}