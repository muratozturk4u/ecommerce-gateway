# Kisisel Calisma Raporu — Tahsin Oden

## Genel Bakis

Bu rapor, E-Commerce Gateway projesinde benim (Tahsin) yaptigim tum calismalari adim adim aciklamaktadir. Proje kapsaminda **43 commit** attim ve asagidaki ana gorevleri tamamladim:

- **Phase 1:** Dispatcher servisi TDD ile gelistirme (11 cycle, 33 commit)
- **Phase 3:** Grafana dashboard provisioning ve 4 dashboard JSON
- **Phase 3:** k6 yuk testleri (smoke, load, stress, routing-accuracy)
- **Phase 3:** README.md raporu (7 bolum, Mermaid diyagramlar)

---

## Phase 1: Dispatcher TDD Gelistirme

### TDD Nedir ve Neden Kullandik?

TDD (Test Driven Development), "once test yaz, sonra kodu implement et" prensibine dayanan bir yazilim gelistirme yontemidir. Her ozellik icin 3 adim uyguladik:

1. **RED:** Once basarisiz bir test yaziyorsun. Bu test, henuz implement etmedigin ozelligi tanimlayan bir "sozlesme" gibi dusun.
2. **GREEN:** Testi gecen minimum kodu yaziyorsun. Amac sadelik — calissin yeter.
3. **REFACTOR:** Kodu iyilestiriyorsun (tekrar eden kodu cikar, isimlendirmeleri duzelt, dependency injection ekle). Testler hala gecmeli.

Her adim icin ayri commit attim. Bu sayede git log'a baktiginda her ozelligi 3 commit ile takip edebilirsin.

### Cycle 1: Health Check Endpoint

**Amac:** Dispatcher'in ayakta olup olmadigini kontrol eden basit bir endpoint.

**RED** (`de69ab6`): `health.test.ts` dosyasinda `GET /health` icin test yazdim. Test, 200 status ve `{ status: "ok" }` body bekliyor. Henuz health controller yok, test FAIL.

**GREEN** (`101fafe`): `health.controller.ts` olusturdun. `getHealth()` metodu basitce `res.status(200).json({ status: 'ok' })` donduruyor. Test PASS.

**REFACTOR** (`f2bb75f`): Health controller'a dependency injection ekledim. Constructor'dan config alabilecek sekilde yeniden yapilandirdim. Testler hala geciyor.

**Ogrenim:** En basit endpoint'le baslamak, TDD dongusuunu anlamak icin ideal. Test-first dusunmeyi burada ogrendim.

### Cycle 2: Service Registry

**Amac:** Gelen istegi hangi mikroservise yonlendirecegimizi belirleyen bir registry.

**RED** (`310c9ec`): Service registry testleri yazdim. `/api/auth/*` → Auth Service, `/api/products/*` → Product Service, `/api/orders/*` → Order Service. Bilinmeyen path icin null donmeli.

**GREEN** (`f699401`): `service-registry.ts` olusturdun. URL pattern'e gore servis configini donduren `resolveService()` metodu.

**REFACTOR** (`bdcb073`): Method extraction yaptim — URL parsing mantgini ayri bir helper'a cikarttim.

**Ogrenim:** URL routing mantiginin nasil calistigini burada ogrendim. Express router yerine kendi registry'mizi yazmak, dispatcher'in nasil karar verdigini anlamami sagladi.

### Cycle 3: Proxy Middleware

**Amac:** Gelen istegi hedef servise forwarding yapan middleware.

**RED** (`13f2553`): Proxy forwarding testleri — axios mock'layarak hedef servise istek iletildigini, response'un geri dondugununu, hata durumunda 502 dondugununu test ettim.

**GREEN** (`23e558c`): `proxy.service.ts` ve `proxy.middleware.ts` implement ettim. `axios.request()` ile hedef servise istek atip response'u client'a donduruyor. `/api` prefix'ini strip ediyor (ornegin `/api/products` → `/products`).

**REFACTOR** (`c991d2d`): Proxy service'e method extraction ve DI uyguladim. `buildRequestConfig()` ayri metod oldu, `internalKey` constructor'dan aliniyor.

**Ogrenim:** Reverse proxy'nin nasil calistigini ogrendim. Header forwarding, URL rewriting ve error handling burada oturdu.

### Cycle 4: JWT Authentication

**Amac:** Gelen isteklerdeki JWT token'i dogrulamak.

**RED** (`906c866`): Auth middleware testleri — gecerli token ile `req.userId` ve `req.role` set edilmeli, gecersiz/expired token 401 donmeli, public endpoint'ler token olmadan gecmeli.

**GREEN** (`9ae0988`): `auth.middleware.ts` implement ettim. `jsonwebtoken.verify()` ile token dogrulama, decoded payload'dan `userId` ve `role` cikarip `req` objesine ekleme.

**REFACTOR** (`afaabdd`): Token extraction ve verification mantigini ayri metodlara cikarttim.

**Ogrenim:** JWT'nin nasil calistigini (header → decode → verify → payload) burada pratikte gordum.

### Cycle 5: Authorization Middleware

**Amac:** Kullanicinin role'une gore endpoint erisimini kontrol etmek.

**RED** (`560fcfb`): Authorization testleri — admin endpoint'e customer erisirse 403, admin erisirse gecmeli. Public endpoint'ler herkese acik. Bilinmeyen route default deny (403).

**GREEN** (`61d09ef`): `authorization.middleware.ts` implement ettim. MongoDB'den route kurallarini (`RouteAccessRule`) yukleyip, gelen istegin path + method'una gore `authLevel` kontrolu yapiyor. `public` → herkese acik, `protected` → token yeterli, `admin` → sadece admin role.

**REFACTOR** (`cd81072`): Helper methods cikarttim — `findMatchingRule`, `checkAccess` ayri fonksiyonlar oldu.

**Ogrenim:** Role-based access control (RBAC) ve "default deny" prensibini burada ogrendim. Guvenlik icin bilinmeyen route'larin varsayilan olarak reddedilmesi kritik.

### Cycle 6: Logging Middleware

**Amac:** Her request/response cifti icin log kaydedilmesi.

**RED** (`4e758c4`): Logging testleri — request method, path, status code, response time kayit edilmeli. Hassas alanlar (password, token) filtrelenmeli.

**GREEN** (`406685b`): `logging.middleware.ts` implement ettim. Response'un `finish` event'ini dinleyerek hem request hem response bilgisini loglayan middleware.

**REFACTOR** (`e2a0130`): `buildLogData()` ayri metoda cikarildi, sensitive field filtering mantigi temizlendi.

**Ogrenim:** Express'te response tamamlandiginda nasil hook'lanacagini (`res.on('finish')`) ve middleware pipeline'inda veri nasil aktarildigini ogrendim.

### Cycle 7: Error Handler

**Amac:** Tum hatalari yakalayan global error handler middleware.

**RED** (`58b695f`): Error handler testleri — AppError, ValidationError, bilinmeyen hata turleri icin dogru status code ve error response format kontrolu.

**GREEN** (`4ab44c8`): `error-handler.middleware.ts` ve `errors.ts` implement ettim. Custom error siniflari: `AppError`, `NotFoundError`, `InsufficientStockError`, `ProxyError`. Express'in 4-parametreli error handler pattern'i (`err, req, res, next`).

**REFACTOR** (`13abcc0`): `sendErrorResponse()` metodu cikarildi.

**Ogrenim:** Express'te error handling'in nasil calistigini (4 parametreli middleware) ve custom error class hierarchy'sini ogrendim.

### Cycle 8: Rate Limiting

**Amac:** Ayni IP'den gelen istekleri sinirlandirmak (DDoS/abuse koruması).

**RED** (`b52e334`): Rate limit testleri — limit asildiginda 429, pencere sifirlandiginda tekrar izin verilmeli.

**GREEN** (`826a90a`): `rate-limit.middleware.ts` implement ettim. Sliding window algoritmasi ile IP bazli istek sayaci. Default: 100 istek/15 dakika.

**REFACTOR** (`77d9c9e`): Default config'i static property olarak cikarttim.

**Ogrenim:** Rate limiting algoritmalarini (fixed window vs sliding window) ve bunlarin DDoS korumasindaki rolunu ogrendim.

### Cycle 9: Prometheus Metrics

**Amac:** Sistem metriklerini Prometheus formatinda toplamak.

**RED** (`19aec06`): Metrics testleri — `/api/metrics` endpoint'i Prometheus formatinda cikti vermeli, `http_requests_total` counter artmali.

**GREEN** (`99bd498`): `metrics.middleware.ts` implement ettim. `prom-client` kutuphanesi ile Counter, Histogram, Gauge metrikleri. Her request'te increment, response time olcumu.

**REFACTOR** (`4438fea`): Factory methods ile metric olusturmayi temizledim.

**Ogrenim:** Prometheus'un pull-based metrics toplama modelini ve prom-client kutuphanesini ogrendim.

### Cycle 10: Log Endpoint

**Amac:** Admin kullanicilarin loglari sorgulamasini saglayan endpoint.

**RED** (`f84a944`): Log endpoint testleri — `GET /api/logs` sadece admin erisebilmeli, query parametreleri (page, limit, level, method) ile filtreleme.

**GREEN** (`fe6b12c`): `log.controller.ts` implement ettim. `LogQueryService` uzerinden sayfalanmis log sorgulama.

**REFACTOR** (`c0a5cf9`): Query parsing mantigi ve helper methods ayri cikarildi.

### Cycle 11: Order Orchestration (Saga Pattern)

**Amac:** Siparis olusturma islemini birden fazla servis uzerinden koordine etmek.

**RED** (`1727ea6`): Order orchestration testleri — stok kontrolu, stok dusurme, order olusturma, hata durumunda rollback. Bu en karmasik test suite'i.

**GREEN** (`1d70b89`): `order-orchestration.service.ts` implement ettim. Saga pattern:
1. Her urun icin Product Service'den stok kontrolu (`GET /products/:id`)
2. Stok dusurme (`PATCH /products/:id/stock` ile negatif quantity)
3. Veri zenginlestirme (productName, unitPrice, totalPrice hesaplama)
4. Order Service'e siparis olusturma (`POST /orders`)
5. Hata durumunda tum dusurulmus stoklari geri ekleme (rollback)

**REFACTOR** (`4dcf097`): `app.ts` middleware siralama finalize edildi, proxy test izolasyonu saglandi.

**Ogrenim:** Saga pattern'i, dagitik transaction'larin nasil yonetildigini ve compensating transaction (rollback) kavramini burada ogrendim. Bu cycle en zorlayici olaniydi.

---

## Phase 3: Monitoring ve Test Altyapisi

### Grafana Dashboard'lari

**Ne yaptim:**
- `monitoring/prometheus/prometheus.yml` — Scrape interval'i 5 saniyeye indirdim
- `monitoring/grafana/provisioning/datasources/prometheus.yml` — uid ekledim (dashboard'larda referans icin)
- `monitoring/grafana/provisioning/dashboards/dashboard.yml` — Otomatik dashboard provisioning config'i olusturdm
- `docker-compose.yml` — Grafana'ya dashboard volume mount ekledim
- 4 dashboard JSON dosyasi olusturdm:
  1. **Traffic Overview** — req/s, avg response time, error rate, active connections
  2. **Per-Service Metrics** — servis bazli istek dagilimi, piechart, path bazli response time
  3. **Error Analysis** — status code distribution (donut), error trend (stacked), top error paths (table), 4xx vs 5xx
  4. **Load Test Results** — request rate, latency percentiles (p50/p95/p99), error rate during load

**Commit:** `3975ed5`

### k6 Yuk Testleri

**Ne yaptim:**
- `load-tests/smoke.js` — 5 VU, 30s, temel endpoint dogrulama (health, register, login, products, categories, orders, metrics)
- `load-tests/load.js` — 50 VU, 1m, agirlikli rastgele senaryolar (%30 list products, %20 product detail, %10 create order vb.)
- `load-tests/stress.js` — 50→500 VU ramp-up, 4.5 dakika, sistemin kirilma noktasini olcme
- `load-tests/routing-accuracy.js` — 20 route kuralinin tamamini test eden accuracy testi (public/protected/admin kontrolleri)
- `load-tests/README.md` — Kullanim kilavuzu
- `.gitignore` — `load-tests/results/` eklendi

**Commit:** `83e7e50`

### README.md

7 bolumlu akademik rapor: Kapak, Giris, Teorik Altyapi (Big-O analizi, literatur taramasi), Sistem Tasarimi (7 Mermaid diyagrami), Proje Yapisi (tech stack, Docker tablosu), Test ve Sonuclar (TDD tablosu, k6 senaryolari, Grafana dashboard'lari), Sonuc ve Tartisma.

**Commit:** `d191690`

---

## Commit Ozeti

| Kategori | Commit Sayisi | Aciklama |
|----------|--------------|----------|
| TDD-RED | 11 | Test dosyalari |
| TDD-GREEN | 11 | Implementasyon |
| TDD-REFACTOR | 11 | Kod iyilestirme |
| chore | 3 | Scaffold, Grafana config, temizlik |
| test | 1 | k6 yuk testleri |
| docs | 1 | README raporu |
| feat (Phase 0) | 5 | Auth service altyapisi |
| **Toplam** | **43** | |

---

## Ogrendigim Seyler

1. **TDD disiplini:** Once test yazmanin baslangicta yavaslatici gibi gorunse de, kodun guvenilirligini cok artirdigi deneyimledim. Refactor asamasinda testlerin "guvenlik agi" gorevi gormesi muhtesemeldi.

2. **Middleware pipeline:** Express'te middleware siralamasi kritik. Auth → Authorization → Logging → Proxy — bu sira degisirse guvenlik aciklari olusur.

3. **Saga pattern:** Dagitik sistemlerde transaction yonetiminin ne kadar karmasik oldugunu order orchestration'da gordum. Rollback mekanizmasi olmadan veri tutarsizligi kacinilmaz.

4. **Docker networking:** `internal: true` network ile servislerin disaridan erisilemez hale getirmek, gercek dunyadaki network izolasyonunu simule etti.

5. **Prometheus + Grafana:** Pull-based monitoring ve dashboard provisioning'in nasil yapildigini ogrendim. JSON tabanli dashboard tanimlamasi cok guclu.

6. **k6 load testing:** Smoke, load ve stress test senaryolarinin farklarini, threshold tanimlamayi ve ramp-up pattern'leri ogrendim.
