from db import run_query

MAX_HOPS = 6


def list_vulnerabilities():
    cypher = """
    MATCH (v:Vulnerability)<-[:HAS_VULNERABILITY]-(pkg:Package)
    OPTIONAL MATCH (dependent:Package)-[:DEPENDS_ON*0..%d]->(pkg)
    OPTIONAL MATCH (svc:Service)-[:USES]->(dependent)
    WITH v, pkg, count(DISTINCT svc) AS exposedServices
    RETURN v.id AS id, v.cve AS cve, v.severity AS severity,
           v.summary AS summary, v.published AS published,
           pkg.name AS packageName, pkg.ecosystem AS ecosystem,
           exposedServices
    ORDER BY
      CASE v.severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1
                       WHEN 'MEDIUM' THEN 2 ELSE 3 END,
      exposedServices DESC
    """ % MAX_HOPS
    return run_query(cypher)


def vulnerability_blast_radius(vuln_id):
    """THE core query. Given one vulnerable package, walk every DEPENDS_ON
    edge *backwards*, any number of hops (0 to MAX_HOPS), to find every
    package that pulls it in transitively — then fan out to the services
    that use any of those packages, and the teams that own those services.

    This is the query a relational schema struggles with: dependency depth
    is unbounded and varies package to package, diamond dependencies mean
    naive joins double-count, and you'd need a recursive CTE per hop-count
    with manual dedup to approximate what MATCH *0..N does natively.
    """
    cypher = """
    MATCH (vuln:Package)-[:HAS_VULNERABILITY]->(v:Vulnerability {id: $vulnId})
    OPTIONAL MATCH path = (dependent:Package)-[:DEPENDS_ON*0..%d]->(vuln)
    WITH v, vuln, collect(DISTINCT dependent) AS dependents
    UNWIND (CASE WHEN size(dependents) = 0 THEN [vuln] ELSE dependents END) AS dep
    MATCH (svc:Service)-[:USES]->(dep)
    MATCH (svc)-[:OWNED_BY]->(team:Team)
    RETURN DISTINCT
      v.cve AS cve, v.severity AS severity, v.summary AS summary,
      vuln.name AS vulnerablePackage,
      dep.name AS viaPackage,
      svc.id AS serviceId, svc.name AS serviceName, svc.tier AS serviceTier,
      team.id AS teamId, team.name AS teamName
    ORDER BY serviceTier, teamName, serviceName
    """ % MAX_HOPS
    return run_query(cypher, {"vulnId": vuln_id})


def shortest_path_to_vulnerability(service_id, vuln_id):
    """Shortest dependency chain from one service down to the vulnerable
    package, so the UI can show *why* a service is exposed, not just *that*
    it is. shortestPath() over a mixed USES/DEPENDS_ON pattern is a
    single-line, index-backed operation in Cypher; the SQL equivalent is a
    recursive CTE with a visited-set to avoid infinite loops on cycles."""
    cypher = """
    MATCH (svc:Service {id: $serviceId})
    MATCH (pkg:Package)-[:HAS_VULNERABILITY]->(v:Vulnerability {id: $vulnId})
    MATCH p = shortestPath((svc)-[:USES|DEPENDS_ON*1..%d]->(pkg))
    RETURN [n IN nodes(p) | coalesce(n.name, n.id)] AS chain,
           [r IN relationships(p) | type(r)] AS relTypes
    """ % (MAX_HOPS + 1)
    rows = run_query(cypher, {"serviceId": service_id, "vulnId": vuln_id})
    return rows[0] if rows else None


def service_dependency_tree(service_id):
    """Full transitive dependency tree for one service, with each package
    flagged if it (or anything it depends on) carries an open CVE. Powers
    the service detail page."""
    cypher = """
    MATCH (svc:Service {id: $serviceId})-[:OWNED_BY]->(team:Team)
    MATCH (svc)-[:USES]->(direct:Package)
    OPTIONAL MATCH (direct)-[:DEPENDS_ON*0..%d]->(transitive:Package)
    OPTIONAL MATCH (transitive)-[:HAS_VULNERABILITY]->(v:Vulnerability)
    WITH svc, team, direct, collect(DISTINCT {
      name: transitive.name, ecosystem: transitive.ecosystem,
      vulnerable: v IS NOT NULL, cve: v.cve, severity: v.severity
    }) AS transitiveDeps
    RETURN svc.name AS serviceName, svc.tier AS serviceTier, team.name AS teamName,
           collect({
             direct: direct.name, ecosystem: direct.ecosystem,
             transitive: [t IN transitiveDeps WHERE t.name IS NOT NULL]
           }) AS dependencyTree
    """ % MAX_HOPS
    rows = run_query(cypher, {"serviceId": service_id})
    return rows[0] if rows else None


def critical_packages(limit=10):
    """Single-point-of-failure ranking: packages ordered by how many
    distinct services would be affected if *this* package alone were
    compromised, counted transitively through the whole dependency graph.
    This is a graph centrality-style question — awkward to express in SQL
    since 'transitively' has no fixed join depth."""
    cypher = """
    MATCH (pkg:Package)
    OPTIONAL MATCH (dependent:Package)-[:DEPENDS_ON*0..%d]->(pkg)
    OPTIONAL MATCH (svc:Service)-[:USES]->(dependent)
    WITH pkg, count(DISTINCT svc) AS exposedServices,
         count(DISTINCT dependent) AS dependentPackages
    WHERE exposedServices > 0
    RETURN pkg.id AS id, pkg.name AS name, pkg.ecosystem AS ecosystem,
           exposedServices, dependentPackages
    ORDER BY exposedServices DESC
    LIMIT $limit
    """ % MAX_HOPS
    return run_query(cypher, {"limit": limit})


def team_exposure():
    """Aggregate risk per team: how many distinct open vulnerabilities are
    transitively reachable from each team's services, weighted by
    severity. Drives the dashboard's team leaderboard."""
    cypher = """
    MATCH (team:Team)<-[:OWNED_BY]-(svc:Service)-[:USES]->(pkg:Package)
    OPTIONAL MATCH (pkg)-[:DEPENDS_ON*0..%d]->(transitive:Package)
    OPTIONAL MATCH (transitive)-[:HAS_VULNERABILITY]->(v:Vulnerability)
    WITH team, svc, collect(DISTINCT v) AS vulns
    UNWIND (CASE WHEN size(vulns) = 0 THEN [null] ELSE vulns END) AS v
    WITH team, count(DISTINCT svc) AS serviceCount,
         count(DISTINCT v) AS vulnCount,
         count(DISTINCT CASE WHEN v.severity = 'CRITICAL' THEN v END) AS criticalCount
    RETURN team.id AS id, team.name AS name, serviceCount, vulnCount, criticalCount
    ORDER BY criticalCount DESC, vulnCount DESC
    """ % MAX_HOPS
    return run_query(cypher)


def search_packages(term, limit=20):
    cypher = """
    MATCH (pkg:Package)
    WHERE toLower(pkg.name) CONTAINS toLower($term)
    OPTIONAL MATCH (pkg)-[:HAS_VULNERABILITY]->(v:Vulnerability)
    RETURN pkg.id AS id, pkg.name AS name, pkg.ecosystem AS ecosystem,
           pkg.version AS version, collect(DISTINCT v.severity) AS vulnSeverities
    ORDER BY pkg.name
    LIMIT $limit
    """
    return run_query(cypher, {"term": term, "limit": limit})


def list_services():
    cypher = """
    MATCH (svc:Service)-[:OWNED_BY]->(team:Team)
    OPTIONAL MATCH (svc)-[:USES]->(pkg:Package)-[:DEPENDS_ON*0..%d]->(transitive:Package)
    OPTIONAL MATCH (transitive)-[:HAS_VULNERABILITY]->(v:Vulnerability)
    RETURN svc.id AS id, svc.name AS name, svc.tier AS tier, team.name AS teamName,
           count(DISTINCT CASE WHEN v IS NOT NULL THEN transitive END) AS vulnerablePackageCount
    ORDER BY vulnerablePackageCount DESC, svc.name
    """ % MAX_HOPS
    return run_query(cypher)
