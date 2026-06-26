# Dentech Pro Route Performance Audit

Generated at: 2026-06-26T09:26:33.856Z
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
| /products | 200 | 2429ms | 3139ms, 1706ms, 2429ms | slow | - |
| /products?q=polisher | 200 | 2351ms | 2351ms, 2376ms, 1909ms | slow | - |
| /products?q=801 | 200 | 2236ms | 2224ms, 2236ms, 2284ms | slow | - |
| /products?q=JOT-801-FG-010 | 200 | 2209ms | 1783ms, 2209ms, 2312ms | slow | - |
| /products?q=JOT-859L-FG-014 | 200 | 1970ms | 1964ms, 2016ms, 1970ms | slow | - |

## Full route timings

| Route | Access | Status | Median | Runs | Severity | Length | Redirects | Error |
| --- | --- | ---: | ---: | --- | --- | ---: | --- | --- |
| / | public | 200 | 211ms | 1024ms, 211ms, 203ms | good | 61.3 KB | - |  |
| /login | public | 200 | 205ms | 215ms, 205ms, 200ms | good | 23.2 KB | - |  |
| /register | public | 200 | 201ms | 218ms, 194ms, 201ms | good | 31.0 KB | - |  |
| /products | public | 200 | 2429ms | 3139ms, 1706ms, 2429ms | slow | 371.9 KB | - |  |
| /products?q=801 | public | 200 | 2236ms | 2224ms, 2236ms, 2284ms | slow | 220.8 KB | - |  |
| /products?q=JOT-801-FG-010 | public | 200 | 2209ms | 1783ms, 2209ms, 2312ms | slow | 376.5 KB | - |  |
| /products?q=polisher | public | 200 | 2351ms | 2351ms, 2376ms, 1909ms | slow | 347.3 KB | - |  |
| /products?q=arkansas | public | 200 | 1791ms | 1621ms, 1791ms, 2244ms | slow | 120.3 KB | - |  |
| /products?q=JOT-859L-FG-014 | public | 200 | 1970ms | 1964ms, 2016ms, 1970ms | slow | 376.5 KB | - |  |
| /request | protected | 200 | 396ms | 567ms, 396ms, 394ms | good | 23.2 KB | 307 -> /login |  |
| /dashboard | protected | 200 | 443ms | 769ms, 443ms, 390ms | good | 23.2 KB | 307 -> /login |  |
| /admin | protected | 200 | 504ms | 615ms, 504ms, 482ms | good | 23.2 KB | 307 -> /login |  |
| /admin/products | protected | 200 | 530ms | 502ms, 530ms, 723ms | good | 23.2 KB | 307 -> /login |  |
| /admin/users | protected | 200 | 591ms | 591ms, 532ms, 592ms | good | 23.2 KB | 307 -> /login |  |
| /admin/requests | protected | 200 | 494ms | 481ms, 556ms, 494ms | good | 23.2 KB | 307 -> /login |  |
| /admin/customers | protected | 200 | 604ms | 604ms, 837ms, 403ms | good | 23.2 KB | 307 -> /login |  |
| /admin/search-logs | protected | 200 | 503ms | 503ms, 399ms, 785ms | good | 23.2 KB | 307 -> /login |  |
