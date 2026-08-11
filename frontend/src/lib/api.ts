const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(
      "Can't reach the DepGraph API. Is the Flask backend running?",
      0
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 503) {
      throw new ApiError(
        body.message || "CognoDB is unreachable right now.",
        503
      );
    }
    throw new ApiError(body.message || `Request failed (${res.status})`, res.status);
  }
  return res.json();
}

export type Vulnerability = {
  id: string;
  cve: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  published: string;
  packageName: string;
  ecosystem: string;
  exposedServices: number;
};

export type BlastRadiusService = {
  id: string;
  name: string;
  tier: string;
  teamId: string;
  teamName: string;
  viaPackages: string[];
};

export type BlastRadius = {
  cve: string;
  severity: string;
  summary: string;
  vulnerablePackage: string;
  affectedServiceCount: number;
  services: BlastRadiusService[];
};

export type ServiceSummary = {
  id: string;
  name: string;
  tier: string;
  teamName: string;
  vulnerablePackageCount: number;
};

export type DependencyTreeEntry = {
  direct: string;
  ecosystem: string;
  transitive: { name: string; ecosystem: string; vulnerable: boolean; cve?: string; severity?: string }[];
};

export type ServiceDependencies = {
  serviceName: string;
  serviceTier: string;
  teamName: string;
  dependencyTree: DependencyTreeEntry[];
};

export type CriticalPackage = {
  id: string;
  name: string;
  ecosystem: string;
  exposedServices: number;
  dependentPackages: number;
};

export type TeamExposure = {
  id: string;
  name: string;
  serviceCount: number;
  vulnCount: number;
  criticalCount: number;
};

export const api = {
  health: () => request<{ status: string; database: string }>("/api/health"),
  vulnerabilities: () => request<Vulnerability[]>("/api/vulnerabilities"),
  blastRadius: (id: string) => request<BlastRadius>(`/api/vulnerabilities/${id}/blast-radius`),
  path: (vulnId: string, serviceId: string) =>
    request<{ chain: string[]; relTypes: string[] }>(`/api/vulnerabilities/${vulnId}/path/${serviceId}`),
  services: () => request<ServiceSummary[]>("/api/services"),
  serviceDependencies: (id: string) => request<ServiceDependencies>(`/api/services/${id}/dependencies`),
  criticalPackages: () => request<CriticalPackage[]>("/api/dashboard/critical-packages"),
  teamExposure: () => request<TeamExposure[]>("/api/dashboard/team-exposure"),
};
