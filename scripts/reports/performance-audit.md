# Dentech Pro Route Performance Audit

Generated at: 2026-06-26T14:48:08.620Z
Base URL: https://dentech-pro.vercel.app
Authenticated routes tested with cookie: no
Runs per route: 3

## Severity thresholds

- good: <800ms
- watch: 800-1500ms
- slow: 1500-3000ms
- critical: >3000ms

## Slowest routes

| Route | Status | Median | Runs | Severity | Redirects |
| --- | ---: | ---: | --- | --- | --- |
| /products?q=JOT-859L-FG-014 | 200 | 2990ms | 4048ms, 2990ms, 2401ms | slow | - |
| /products?q=JOT-801-FG-010 | 200 | 2317ms | 2317ms, 2269ms, 2409ms | slow | - |
| /products | 200 | 2220ms | 2565ms, 2220ms, 1562ms | slow | - |
| /products?q=polisher | 200 | 1705ms | 1765ms, 1700ms, 1705ms | slow | - |
| /products?q=801 | 200 | 1265ms | 1249ms, 2080ms, 1265ms | watch | - |

## Full route timings

| Route | Access | Status | Median | Runs | Severity | Length | Redirects | Error |
| --- | --- | ---: | ---: | --- | --- | ---: | --- | --- |
| / | public | 200 | 247ms | 2177ms, 247ms, 214ms | good | 61.3 KB | - |  |
| /login | public | 200 | 206ms | 238ms, 206ms, 197ms | good | 23.2 KB | - |  |
| /register | public | 200 | 209ms | 237ms, 201ms, 209ms | good | 31.0 KB | - |  |
| /products | public | 200 | 2220ms | 2565ms, 2220ms, 1562ms | slow | 371.9 KB | - |  |
| /products?q=801 | public | 200 | 1265ms | 1249ms, 2080ms, 1265ms | watch | 220.8 KB | - |  |
| /products?q=JOT-801-FG-010 | public | 200 | 2317ms | 2317ms, 2269ms, 2409ms | slow | 376.5 KB | - |  |
| /products?q=polisher | public | 200 | 1705ms | 1765ms, 1700ms, 1705ms | slow | 347.3 KB | - |  |
| /products?q=arkansas | public | 200 | 983ms | 978ms, 2739ms, 983ms | watch | 120.3 KB | - |  |
| /products?q=JOT-859L-FG-014 | public | 200 | 2990ms | 4048ms, 2990ms, 2401ms | slow | 392.6 KB | - |  |
| /request | protected | 200 | 405ms | 563ms, 401ms, 405ms | good | 23.2 KB | 307 -> /login |  |
| /dashboard | protected | 200 | 393ms | 397ms, 385ms, 393ms | good | 23.2 KB | 307 -> /login |  |
| /admin | protected | 200 | 557ms | 1278ms, 557ms, 483ms | good | 23.2 KB | 307 -> /login |  |
| /admin/products | protected | 200 | 476ms | 483ms, 476ms, 454ms | good | 23.2 KB | 307 -> /login |  |
| /admin/users | protected | 200 | 476ms | 476ms, 481ms, 469ms | good | 23.2 KB | 307 -> /login |  |
| /admin/requests | protected | 200 | 479ms | 484ms, 476ms, 479ms | good | 23.2 KB | 307 -> /login |  |
| /admin/customers | protected | 200 | 397ms | 541ms, 397ms, 381ms | good | 23.2 KB | 307 -> /login |  |
| /admin/search-logs | protected | 200 | 500ms | 407ms, 500ms, 556ms | good | 23.2 KB | 307 -> /login |  |
