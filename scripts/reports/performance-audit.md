# Dentech Pro Route Performance Audit

Generated at: 2026-06-26T09:03:42.829Z
Base URL: https://dentech-pro.vercel.app
Authenticated routes tested with cookie: no

## Severity thresholds

- good: <800ms
- watch: 800-1500ms
- slow: 1500-3000ms
- critical: >3000ms

## Slowest routes

| Route | Status | Time | Severity | Redirects |
| --- | ---: | ---: | --- | --- |
| /products?q=801 | 200 | 3066ms | critical | - |
| /products?q=JOT-801-FG-010 | 200 | 2617ms | slow | - |
| /products?q=polisher | 200 | 2570ms | slow | - |
| /products | 200 | 2252ms | slow | - |
| /admin | 200 | 539ms | good | 307 -> /login |

## Full route timings

| Route | Access | Status | Time | Severity | Length | Redirects | Error |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| / | public | 200 | 468ms | good | 61.3 KB | - |  |
| /login | public | 200 | 221ms | good | 23.2 KB | - |  |
| /register | public | 200 | 276ms | good | 31.0 KB | - |  |
| /products | public | 200 | 2252ms | slow | 371.9 KB | - |  |
| /products?q=801 | public | 200 | 3066ms | critical | 220.8 KB | - |  |
| /products?q=JOT-801-FG-010 | public | 200 | 2617ms | slow | 376.5 KB | - |  |
| /products?q=polisher | public | 200 | 2570ms | slow | 347.3 KB | - |  |
| /request | protected | 200 | 482ms | good | 23.2 KB | 307 -> /login |  |
| /dashboard | protected | 200 | 391ms | good | 23.2 KB | 307 -> /login |  |
| /admin | protected | 200 | 539ms | good | 23.2 KB | 307 -> /login |  |
| /admin/products | protected | 200 | 473ms | good | 23.2 KB | 307 -> /login |  |
| /admin/users | protected | 200 | 500ms | good | 23.2 KB | 307 -> /login |  |
| /admin/requests | protected | 200 | 470ms | good | 23.2 KB | 307 -> /login |  |
| /admin/customers | protected | 200 | 459ms | good | 23.2 KB | 307 -> /login |  |
| /admin/search-logs | protected | 200 | 522ms | good | 23.2 KB | 307 -> /login |  |
