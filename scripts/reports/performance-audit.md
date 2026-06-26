# Dentech Pro Route Performance Audit

Generated at: 2026-06-26T15:04:12.444Z
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
| /products | 200 | 2001ms | 2893ms, 2001ms, 1561ms | slow | - |
| /products?q=polisher | 200 | 1677ms | 1677ms, 1633ms, 2286ms | slow | - |
| /products?q=801 | 200 | 1325ms | 1325ms, 1660ms, 1293ms | watch | - |
| /products?q=arkansas | 200 | 996ms | 996ms, 970ms, 1029ms | watch | - |
| /products?q=JOT-859L-FG-014 | 200 | 974ms | 974ms, 991ms, 966ms | watch | - |

## Full route timings

| Route | Access | Status | Median | Runs | Severity | Length | Redirects | Error |
| --- | --- | ---: | ---: | --- | --- | ---: | --- | --- |
| / | public | 200 | 237ms | 433ms, 225ms, 237ms | good | 61.3 KB | - |  |
| /login | public | 200 | 203ms | 203ms, 241ms, 194ms | good | 23.2 KB | - |  |
| /register | public | 200 | 199ms | 217ms, 195ms, 199ms | good | 31.0 KB | - |  |
| /products | public | 200 | 2001ms | 2893ms, 2001ms, 1561ms | slow | 371.9 KB | - |  |
| /products?q=801 | public | 200 | 1325ms | 1325ms, 1660ms, 1293ms | watch | 220.8 KB | - |  |
| /products?q=JOT-801-FG-010 | public | 200 | 964ms | 983ms, 957ms, 964ms | watch | 68.0 KB | - |  |
| /products?q=polisher | public | 200 | 1677ms | 1677ms, 1633ms, 2286ms | slow | 347.3 KB | - |  |
| /products?q=arkansas | public | 200 | 996ms | 996ms, 970ms, 1029ms | watch | 120.3 KB | - |  |
| /products?q=JOT-859L-FG-014 | public | 200 | 974ms | 974ms, 991ms, 966ms | watch | 66.0 KB | - |  |
| /request | protected | 200 | 393ms | 531ms, 379ms, 393ms | good | 23.2 KB | 307 -> /login |  |
| /dashboard | protected | 200 | 411ms | 418ms, 411ms, 374ms | good | 23.2 KB | 307 -> /login |  |
| /admin | protected | 200 | 481ms | 395ms, 481ms, 510ms | good | 23.2 KB | 307 -> /login |  |
| /admin/products | protected | 200 | 493ms | 459ms, 538ms, 493ms | good | 23.2 KB | 307 -> /login |  |
| /admin/users | protected | 200 | 503ms | 503ms, 482ms, 513ms | good | 23.2 KB | 307 -> /login |  |
| /admin/requests | protected | 200 | 469ms | 469ms, 534ms, 443ms | good | 23.2 KB | 307 -> /login |  |
| /admin/customers | protected | 200 | 461ms | 461ms, 366ms, 512ms | good | 23.2 KB | 307 -> /login |  |
| /admin/search-logs | protected | 200 | 521ms | 413ms, 521ms, 572ms | good | 23.2 KB | 307 -> /login |  |
| /products/fb2689e9-58f2-49b4-b283-da08a439a44e | public | 200 | 659ms | 864ms, 648ms, 659ms | good | 33.5 KB | - |  |
| /admin/requests/374cdf81-8145-4e26-8077-ff56f73faa2f | protected | 200 | 502ms | 771ms, 457ms, 502ms | good | 23.2 KB | 307 -> /login |  |
