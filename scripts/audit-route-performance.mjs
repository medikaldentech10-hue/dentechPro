import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://dentech-pro.vercel.app";
const baseUrl = (process.env.PERFORMANCE_AUDIT_BASE_URL ?? DEFAULT_BASE_URL)
  .replace(/\/$/, "");
const authCookie = process.env.PERFORMANCE_AUDIT_COOKIE;
const repeatCount = Math.max(
  1,
  Number.parseInt(process.env.PERFORMANCE_AUDIT_REPEATS ?? "3", 10) || 3
);
const reportDir = new URL("./reports/", import.meta.url);

const staticRoutes = [
  { path: "/", access: "public" },
  { path: "/login", access: "public" },
  { path: "/register", access: "public" },
  { path: "/products", access: "public" },
  { path: "/products?q=801", access: "public" },
  { path: "/products?q=JOT-801-FG-010", access: "public" },
  { path: "/products?q=polisher", access: "public" },
  { path: "/products?q=arkansas", access: "public" },
  { path: "/products?q=JOT-859L-FG-014", access: "public" },
  { path: "/request", access: "protected" },
  { path: "/dashboard", access: "protected", auth: true },
  { path: "/admin", access: "protected", auth: true },
  { path: "/admin/products", access: "protected", auth: true },
  { path: "/admin/users", access: "protected", auth: true },
  { path: "/admin/requests", access: "protected", auth: true },
  { path: "/admin/customers", access: "protected", auth: true },
  { path: "/admin/search-logs", access: "protected", auth: true },
];

async function getRoutes() {
  const discoveredRoutes = await discoverDetailRoutes();
  return mergeRoutes(staticRoutes, discoveredRoutes);
}

function mergeRoutes(baseRoutes, discoveredRoutes) {
  const seen = new Set();
  return [...baseRoutes, ...discoveredRoutes].filter((route) => {
    if (seen.has(route.path)) {
      return false;
    }

    seen.add(route.path);
    return true;
  });
}

async function discoverDetailRoutes() {
  const env = await loadLocalEnv();
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const [productResult, requestResult] = await Promise.all([
    supabase
      .from("products")
      .select("id")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("order_drafts")
      .select("id,created_by_user_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const routes = [];

  if (productResult.data?.id) {
    routes.push({
      access: "public",
      label: "real product detail",
      path: `/products/${productResult.data.id}`,
    });
  }

  if (requestResult.data?.id) {
    routes.push({
      access: "protected",
      auth: true,
      label: "real admin request detail",
      path: `/admin/requests/${requestResult.data.id}`,
    });
  }

  if (requestResult.data?.created_by_user_id) {
    routes.push({
      access: "protected",
      auth: true,
      label: "user request history",
      path: "/request",
    });
  }

  return routes;
}

async function loadLocalEnv() {
  const env = {};

  try {
    const content = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);

      if (!match) {
        continue;
      }

      env[match[1].trim()] = match[2].trim();
    }
  } catch {
    // Optional: production audits can rely on process env only.
  }

  return env;
}

function severity(ms) {
  if (ms < 800) return "good";
  if (ms < 1500) return "watch";
  if (ms < 3000) return "slow";
  return "critical";
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function absoluteUrl(pathOrUrl) {
  return new URL(pathOrUrl, `${baseUrl}/`).toString();
}

async function fetchWithRedirects(route) {
  const startedAt = performance.now();
  const redirectChain = [];
  let currentUrl = absoluteUrl(route.path);
  let finalStatus = 0;
  let contentLength = null;
  let error = null;

  for (let index = 0; index < 6; index += 1) {
    try {
      const response = await fetch(currentUrl, {
        headers: {
          ...(authCookie && route.auth ? { cookie: authCookie } : {}),
          "user-agent": "DentechProPerformanceAudit/1.0",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });

      finalStatus = response.status;
      const location = response.headers.get("location");

      if (
        location &&
        response.status >= 300 &&
        response.status < 400 &&
        index < 5
      ) {
        const nextUrl = new URL(location, currentUrl).toString();
        redirectChain.push({
          from: currentUrl,
          status: response.status,
          to: nextUrl,
        });
        currentUrl = nextUrl;
        continue;
      }

      const declaredLength = response.headers.get("content-length");
      if (declaredLength) {
        contentLength = Number(declaredLength);
      } else {
        const body = await response.arrayBuffer();
        contentLength = Buffer.byteLength(Buffer.from(body));
      }

      break;
    } catch (caughtError) {
      error = caughtError instanceof Error ? caughtError.message : String(caughtError);
      break;
    }
  }

  const totalMs = Math.round(performance.now() - startedAt);

  return {
    access: route.access,
    contentLength,
    error,
    finalUrl: currentUrl,
    path: route.path,
    redirectChain,
    severity: severity(totalMs),
    status: finalStatus,
    totalMs,
  };
}

async function measureRoute(route) {
  const runs = [];

  for (let index = 0; index < repeatCount; index += 1) {
    runs.push(await fetchWithRedirects(route));
  }

  const medianMs = median(runs.map((run) => run.totalMs));
  const representative =
    runs.find((run) => run.totalMs === medianMs) ??
    runs.sort((left, right) => Math.abs(left.totalMs - medianMs) - Math.abs(right.totalMs - medianMs))[0];

  return {
    ...representative,
    runs: runs.map((run) => ({
      contentLength: run.contentLength,
      error: run.error,
      redirectChain: run.redirectChain,
      status: run.status,
      totalMs: run.totalMs,
    })),
    severity: severity(medianMs),
    totalMs: medianMs,
  };
}

function formatBytes(value) {
  if (value === null || Number.isNaN(value)) return "-";
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} KB`;
}

function formatRedirects(chain) {
  if (!chain.length) return "-";
  return chain
    .map((redirect) => `${redirect.status} -> ${new URL(redirect.to).pathname}`)
    .join(", ");
}

function createMarkdown(results) {
  const slowest = [...results].sort((a, b) => b.totalMs - a.totalMs).slice(0, 5);
  const generatedAt = new Date().toISOString();

  return [
    "# Dentech Pro Route Performance Audit",
    "",
    `Generated at: ${generatedAt}`,
    `Base URL: ${baseUrl}`,
    `Authenticated routes tested with cookie: ${authCookie ? "yes" : "no"}`,
    `Runs per route: ${repeatCount}`,
    "",
    "## Severity thresholds",
    "",
    "- good: <800ms",
    "- watch: 800-1500ms",
    "- slow: 1500-3000ms",
    "- critical: >3000ms",
    "",
    "## Slowest routes",
    "",
    "| Route | Status | Median | Runs | Severity | Redirects |",
    "| --- | ---: | ---: | --- | --- | --- |",
    ...slowest.map(
      (result) =>
        `| ${result.path} | ${result.status || "-"} | ${result.totalMs}ms | ${formatRuns(result.runs)} | ${result.severity} | ${formatRedirects(result.redirectChain)} |`
    ),
    "",
    "## Full route timings",
    "",
    "| Route | Access | Status | Median | Runs | Severity | Length | Redirects | Error |",
    "| --- | --- | ---: | ---: | --- | --- | ---: | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.path} | ${result.access} | ${result.status || "-"} | ${result.totalMs}ms | ${formatRuns(result.runs)} | ${result.severity} | ${formatBytes(result.contentLength)} | ${formatRedirects(result.redirectChain)} | ${result.error ?? ""} |`
    ),
    "",
  ].join("\n");
}

function formatRuns(runs) {
  return runs.map((run) => `${run.totalMs}ms`).join(", ");
}

async function main() {
  const routes = await getRoutes();
  const results = [];

  for (const route of routes) {
    process.stdout.write(`Measuring ${route.path} ... `);
    const result = await measureRoute(route);
    results.push(result);
    process.stdout.write(
      `${result.totalMs}ms median (${formatRuns(result.runs)}) ${result.status || result.error}\n`
    );
  }

  await mkdir(reportDir, { recursive: true });
  await writeFile(
    new URL("performance-audit.json", reportDir),
    `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), repeatCount, results }, null, 2)}\n`
  );
  await writeFile(
    new URL("performance-audit.md", reportDir),
    createMarkdown(results)
  );

  const criticalCount = results.filter((result) => result.severity === "critical").length;
  const slowCount = results.filter((result) => result.severity === "slow").length;
  console.log(
    `\nPerformance audit complete. Slow: ${slowCount}, critical: ${criticalCount}`
  );
  console.log(`Reports: ${new URL("performance-audit.md", reportDir).pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
