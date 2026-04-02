# Sistem Mimarisi — Dosya Dosya Aciklama

Bu rapor, E-Commerce Gateway projesinin tum dosya yapisini ve her dosyanin ne is yaptigini aciklar.

---

## 1. Kok Dizin Dosyalari

### `docker-compose.yml`
Tum sistemi Docker container'lari olarak ayaga kaldiran ana konfigurasyon dosyasi.

- **7 servis** tanimli: dispatcher, auth-service, product-service, order-service, mongodb, grafana, prometheus
- **2 network:** `public-network` (disaridan erisilebilir — dispatcher + grafana) ve `internal-network` (sadece container'lar arasi — tum servisler + mongodb)
- **3 volume:** mongodb_data, grafana_data, prometheus_data
- **Seed profili:** `docker compose --profile seed up seed` ile test verisi yuklenebilir
- Dispatcher disindaki servisler host'a port expose etmez → **network izolasyonu**

### `.gitignore`
Versiyon kontrolune dahil edilmemesi gereken dosyalar: `node_modules/`, `.env`, `coverage/`, `load-tests/results/`, `.claude/`

### `README.md`
7 bolumlu akademik proje raporu. Mermaid diyagramlari, TDD tablosu, tech stack, API endpoint listesi, k6 test senaryolari iceriyor.

---

## 2. Dispatcher Servisi (`services/dispatcher/`)

Dispatcher, tum sistemin kalbi — **API Gateway** rolunu ustleniyor. Disaridan gelen tum HTTP istekleri buradan geciyor.

### 2.1 Giris Noktalari

#### `src/server.ts`
- MongoDB'ye baglanir
- `createApp()` fonksiyonunu cagirir (app.ts'den)
- HTTP server'i belirtilen PORT'ta dinlemeye baslatir

#### `src/app.ts` — Composition Root
Express uygulamasinin tum middleware'lerini ve route'larini bir araya getiren dosya. **Middleware sirasi kritik:**

```
1. CORS                          → Cross-origin izinleri
2. express.json()                → Body parsing
3. Strip internal headers        → Disaridan gelen x-internal-key header'ini siler (guvenlik)
4. Rate Limiter                  → IP bazli istek sinirlandirma
5. Metrics Middleware             → Prometheus metrik toplama
6. Health Route                   → GET /health (auth gerektirmez)
7. Metrics Route                  → GET /api/metrics (auth gerektirmez)
8. Logging Middleware             → Request/response loglama
9. Auth Middleware                → JWT token dogrulama
10. Authorization Middleware      → Role bazli erisim kontrolu
11. Order Orchestration Route     → POST /api/orders (ozel islem)
12. Log Router                    → GET /api/logs (admin only)
13. Proxy Middleware              → Diger tum istekleri hedef servise yonlendir
14. Error Handler                 → Yakalanmamis hatalari isle
```

Bu sira neden onemli:
- Health ve Metrics, auth'dan once → her zaman erisilebilir
- Auth, Authorization'dan once → once kim oldugunu bil, sonra ne yapabilecegine bak
- Logging, Auth'dan sonra → log kayitlarinda userId mevcut
- Proxy en sonda → kalan tum istekleri yakalar
- Error handler mutlaka en son → tum hatalari yakalar

### 2.2 Config

#### `src/config/index.ts`
Environment variable'lari bir Config sinifinda toplar:
- `PORT`, `MONGODB_URI`, `SERVICE_NAME`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `AUTH_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL`
- `INTERNAL_KEY` — servisler arasi kimlik dogrulama anahtari
- `LOG_LEVEL`, `NODE_ENV`

### 2.3 Middleware Katmani

#### `src/middleware/auth.middleware.ts`
JWT Authentication middleware'i.
- `Authorization: Bearer <token>` header'indan token'i cikarir
- `jsonwebtoken.verify()` ile dogrular
- Gecerliyse `req.userId` ve `req.role` set eder
- `public` route kurallarinda token yoksa bile gecer (ama token varsa decode eder)
- Gecersiz/expired token → 401 Unauthorized

#### `src/middleware/authorization.middleware.ts`
Role-based access control (RBAC).
- MongoDB'den `RouteAccessRule` koleksiyonunu yukler (veya default kurallari kullanir)
- Gelen istegin path + method'unu kurallara gore eslestirir (`findMatchingRule`)
- 3 seviye: `public` (herkes), `protected` (token yeterli), `admin` (sadece admin role)
- Bilinmeyen route → **default deny** (403)

#### `src/middleware/logging.middleware.ts`
Request/response loglama.
- `res.on('finish')` event'ini dinler → response tamamlandiginda log kaydeder
- Loglanan bilgiler: method, path, statusCode, responseTime, IP, userId, requestBody
- **Hassas alan filtreleme:** password, token, secret, authorization gibi alanlar `[FILTERED]` ile maskelenir
- Log'u `ILogService` uzerinden kaydeder (in-memory + opsiyonel MongoDB)

#### `src/middleware/metrics.middleware.ts`
Prometheus metrik toplama.
- `prom-client` kutuphanesi kullanir
- 5 metrik:
  - `http_requests_total` (Counter) — toplam istek sayisi
  - `http_request_duration_seconds` (Histogram) — istek suresi
  - `http_requests_by_service` (Counter) — servis bazli istek
  - `http_errors_total` (Counter) — hata sayisi (status >= 400)
  - `active_connections` (Gauge) — anlik baglanti sayisi
- `GET /api/metrics` endpoint'i Prometheus scrape formatinda cikti verir

#### `src/middleware/rate-limit.middleware.ts`
IP bazli istek sinirlandirma.
- Default: 100 istek / 15 dakika
- Limit asildiginda 429 Too Many Requests donduruyor
- Sliding window algoritmasi

#### `src/middleware/proxy.middleware.ts`
Reverse proxy — istekleri hedef servise yonlendirir.
- `ServiceRegistry`'den hedef servisi bulur
- `ProxyService.forward()` ile istegi iletir
- Bulunamazsa 404 donduruyor

#### `src/middleware/error-handler.middleware.ts`
Global error handler (Express 4-parametreli middleware).
- `AppError` → kendi status code'u ile
- `ValidationError` → 400
- Bilinmeyen hata → 500
- Response formati: `{ success: false, error: { code, message } }`

### 2.4 Controller Katmani

#### `src/controllers/health.controller.ts`
`GET /health` → `{ status: 'ok', timestamp, uptime, service }`

#### `src/controllers/log.controller.ts`
`GET /api/logs` → Sayfalanmis log sorgulama. Query parametreleri: page, limit, level, method, path, startDate, endDate.

#### `src/controllers/order-orchestration.controller.ts`
`POST /api/orders` → Order orchestration akisini baslatir. Request body'den items ve shippingAddress alir, `OrderOrchestrationService`'e delege eder. Hata durumunda `ErrorHandler`'a yonlendirir (`next(error)`).

### 2.5 Service Katmani

#### `src/services/service-registry.ts`
URL pattern'e gore hangi mikroservise yonlendirilecegini belirler:
- `/api/auth/*` → `http://auth-service:3001`
- `/api/products/*` veya `/api/categories/*` → `http://product-service:3002`
- `/api/orders/*` → `http://order-service:3003`

#### `src/services/proxy.service.ts`
Axios ile HTTP proxy yapan servis.
- `forward(req, res, service)` → hedef servise istek atar
- Header'lara `x-internal-key`, `x-user-id`, `x-user-role` ekler
- `/api` prefix'ini strip eder: `/api/products` → `/products`
- Hata durumunda hedef servisin response'unu iletir veya 502 Bad Gateway donduruyor

#### `src/services/order-orchestration.service.ts`
Saga pattern ile siparis olusturma — projenin en karmasik parcasi.

**Akis:**
1. `checkAllStock()` — Her urun icin Product Service'den stok ve fiyat bilgisi al
2. `decreaseAllStock()` — Stok dusur (PATCH ile negatif quantity)
3. `enrichItems()` — Urun adi, birim fiyat, toplam fiyat hesapla
4. `createOrder()` — Order Service'e zenginlestirilmis veriyi gonder

**Rollback mekanizmasi:**
- `decreaseAllStock` sirasinda hata → o ana kadar dusurulen stoklari geri ekle
- `createOrder` sirasinda hata → TUM dusurulen stoklari geri ekle
- Rollback basarisiz olursa console.error ile logla (best-effort)

#### `src/services/log.service.ts`
Winston logger + opsiyonel MongoDB kaydi.

#### `src/services/log-query.service.ts`
Log sorgulama servisi — filtreleme, sayfalama, toplam sayim.

### 2.6 Model ve Repository

#### `src/models/request-log.model.ts`
Mongoose schema — HTTP log kayitlari: method, path, statusCode, responseTime, userId, ip, requestBody, error.

#### `src/models/route-access-rule.model.ts`
Route erisim kurallari modeli. `AuthLevel` enum: `public`, `protected`, `admin`.
20 default kural tanimli (ornek: `GET /health` → public, `POST /api/products` → admin).
`seedRouteRules()` fonksiyonu ile veritabanina yazilir.

#### `src/repositories/log.repository.ts`
MongoDB CRUD islemleri: `save()`, `findAll()`, `count()`.

### 2.7 Utility ve Tipler

#### `src/utils/errors.ts`
Custom error siniflari:
- `AppError` — base class (message, statusCode, code)
- `NotFoundError` — 404
- `InsufficientStockError` — 400 (stok yetersiz)
- `ProxyError` — 502 (hedef servis erisilemez)

#### `src/utils/path-matcher.ts`
URL path eslestirme: `/api/products/:id` pattern'ini `/api/products/abc123` ile eslestiren fonksiyon. Auth ve Authorization middleware'leri tarafindan kullanilir.

#### `src/types/express.d.ts`
Express Request tipini genisletir — `userId` ve `role` property'leri ekler.

### 2.8 Test Dosyalari (`tests/`)

11 test dosyasi, 114 test case:

| Dosya | Test Sayisi | Ne Test Eder |
|-------|------------|-------------|
| health.test.ts | ~5 | Health endpoint response |
| service-registry.test.ts | ~8 | Route resolution, bilinmeyen path |
| proxy.test.ts | ~10 | Forwarding, error handling, header injection |
| auth.test.ts | ~12 | Token validation, public bypass, expired token |
| authorization.test.ts | ~15 | RBAC, default deny, admin/protected/public |
| logging.test.ts | ~10 | Log kaydi, sensitive field filtering |
| error-handler.test.ts | ~8 | Custom errors, unknown errors |
| rate-limit.test.ts | ~6 | Limit enforcement, window reset |
| metrics.test.ts | ~10 | Counter increment, histogram, gauge |
| log-endpoint.test.ts | ~10 | Query params, pagination, admin access |
| order-orchestration.test.ts | ~20 | Stock check, decrease, rollback, order creation |

---

## 3. Monitoring (`monitoring/`)

### `monitoring/prometheus/prometheus.yml`
Prometheus konfigurasyonu:
- 5 saniye scrape interval
- `dispatcher:3000` hedefinden `/api/metrics` path'inden metrik toplar

### `monitoring/grafana/provisioning/datasources/prometheus.yml`
Grafana'ya Prometheus datasource'u otomatik ekler. `uid: prometheus` ile dashboard JSON'larinda referans edilir.

### `monitoring/grafana/provisioning/dashboards/dashboard.yml`
`/var/lib/grafana/dashboards` dizinindeki JSON dosyalarini otomatik yukler. `E-Commerce Gateway` klasorunde goruntulenir.

### `monitoring/grafana/dashboards/` (4 JSON)

| Dashboard | Paneller |
|-----------|---------|
| traffic-overview.json | Requests/sec (timeseries), Avg Response Time (timeseries), Error Rate % (stat), Active Connections (gauge) |
| per-service.json | Requests by Service (timeseries), Distribution (piechart), Response Time by Path (timeseries), Error Rate by Path (bargauge) |
| error-analysis.json | Status Code Distribution (donut piechart), Error Trend Stacked (timeseries), Top Error Paths (table), 4xx vs 5xx (timeseries) |
| load-test-results.json | Request Rate (timeseries), Latency Percentiles p50/p95/p99 (timeseries), Error Rate During Load (timeseries), Active Connections (timeseries) |

---

## 4. Load Tests (`load-tests/`)

| Dosya | VU | Sure | Amac |
|-------|----|------|------|
| smoke.js | 5 | 30s | Temel endpoint dogrulama — health, register, login, products, categories, orders, metrics |
| load.js | 50 | 1m | Normal yuk — agirlikli rastgele senaryolar (list, detail, create order, profile) |
| stress.js | 50→500 | 4.5m | Kirilma noktasi — kademeli ramp-up ile sistemin sinirlarini test eder |
| routing-accuracy.js | 1 | 1 iter | 20 route kuralinin dogru calistigini dogrular (public 200, protected 401, admin 403) |
| README.md | - | - | Kullanim kilavuzu, threshold tablosu, Grafana izleme rehberi |

---

## 5. Diger Servisler (Murat'in Gelistirdigi)

### Auth Service (`services/auth-service/`)
Kullanici kayit (register), giris (login), profil (profile) islemleri. JWT token uretir. Zod ile validasyon.

### Product Service (`services/product-service/`)
Urun ve kategori CRUD islemleri. Stok yonetimi (PATCH ile artirma/azaltma). Pagination destegi.

### Order Service (`services/order-service/`)
Siparis CRUD ve durum yonetimi. State machine: pending → confirmed → shipped → delivered, pending → cancelled.

### Seed Scripts (`scripts/`)
Test verisi: 3 kullanici, 4 kategori, 14 urun, 5 siparis. `docker compose --profile seed up seed` ile calistirilir.
