import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

const DEFAULT_BASE_URL = "https://dentech-pro.vercel.app";
const baseUrl = (process.env.PERFORMANCE_AUDIT_BASE_URL ?? DEFAULT_BASE_URL)
  .replace(/\/$/, "");
const authCookie = process.env.PERFORMANCE_AUDIT_COOKIE;
const reportDir = new URL("./reports/", import.meta.url);

const routes = [
  { path: "/", access: "public" },
  { path: "/login", access: "public" },
  { path: "/register", access: "public" },
  { path: "/products", access: "public" },
  { path: "/products?q=801", access: "public" },
  { path: "/products?q=JOT-801-FG-010", access: "public" },
  { path: "/products?q=polisher", access: "public" },
  { path: "/request", access: "protected" },
  { path: "/dashboard", access: "protected", auth: true },
  { path: "/admin", access: "protected", auth: true },
  { path: "/admin/products", access: "protected", auth: true },
  { path: "/admin/users", access: "protected", auth: true },
  { path: "/admin/requests", access: "protected", auth: true },
  { path: "/admin/customers", access: "protected", auth: true },
  { path: "/admin/search-logs", access: "protected", auth: true },
];

function severity(ms) {
  if (ms < 800) return "good";
  if (ms < 1500) return "watch";
  if (ms < 3000) return "slow";
  return "critical";
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
    "| Route | Status | Time | Severity | Redirects |",
    "| --- | ---: | ---: | --- | --- |",
    ...slowest.map(
      (result) =>
        `| ${result.path} | ${result.status || "-"} | ${result.totalMs}ms | ${result.severity} | ${formatRedirects(result.redirectChain)} |`
    ),
    "",
    "## Full route timings",
    "",
    "| Route | Access | Status | Time | Severity | Length | Redirects | Error |",
    "| --- | --- | ---: | ---: | --- | ---: | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.path} | ${result.access} | ${result.status || "-"} | ${result.totalMs}ms | ${result.severity} | ${formatBytes(result.contentLength)} | ${formatRedirects(result.redirectChain)} | ${result.error ?? ""} |`
    ),
    "",
  ].join("\n");
}

async function main() {
  const results = [];

  for (const route of routes) {
    process.stdout.write(`Measuring ${route.path} ... `);
    const result = await fetchWithRedirects(route);
    results.push(result);
    process.stdout.write(`${result.totalMs}ms ${result.status || result.error}\n`);
  }

  await mkdir(reportDir, { recursive: true });
  await writeFile(
    new URL("performance-audit.json", reportDir),
    `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)}\n`
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
