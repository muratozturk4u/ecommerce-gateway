# Changelog

Mimari kararlar ve önemli değişikliklerin kaydı.

## [0.7.0] - 2026-03-31

### Fixed
- Dispatcher proxy URL mapping: /api prefix artik mikroservislere iletilmeden soyuluyor
- Proxy header injection: x-user-id ve x-user-role headerlari JWT'den alinip mikroservislere iletiliyor
- Authorization modeli: isPublic/roles yerine authLevel enum (public/protected/admin) ile spec uyumlu hale getirildi
- Default deny: eslesen kural olmayan route'lar 403 donuyor (onceden gecis izni veriliyordu)
- Auth middleware: public route bypass (register, login, health, metrics token gerektirmiyor)
- Order orchestration: dogru endpoint'ler (GET /products/:id, PATCH /products/:id/stock)
- Order orchestration: data enrichment (productName, unitPrice, totalPrice, totalAmount snapshot)
- Order orchestration: shippingAddress pass-through desteği
- Order orchestration: rollback dogru endpoint ve pozitif quantity ile
- Order orchestration route: /api/orders/orchestrated yerine /api/orders
- request_logs modeli: requestBody, error, ip alanlari ve compound index eklendi
- LogService: MongoDB'ye fire-and-forget yazma (LogRepository entegrasyonu)
- LoggingMiddleware: requestBody (hassas veri filtreli), error ve IP yakalama
- LogController: is mantigi LogQueryService'e tasindi (SRP)
- Guvenlik: client x-internal-key/x-user-id/x-user-role header override onleme
- Guvenlik: CORS origin, body size limit (10kb), JWT_SECRET production zorunlulugu
- AppError kullanimi: InsufficientStockError, NotFoundError, ProxyError (duz obje yerine)
- Rollback failure loglama (sessiz yutma yerine console.error)

### Added
- path-matcher.ts: paylasimli route eslestirme utility (AuthMiddleware + AuthorizationMiddleware)
- LogQueryService: log sorgulama is mantigi (SRP ayirimi)
- seedRouteRules(): dispatcher baslatilirken route_access_rules MongoDB'ye upsert
- IProxyMiddleware, ILoggingMiddleware, IMetricsMiddleware (getRegister) interface'leri
- Dependency Inversion: tum middleware'ler interface uzerinden bagimlilik aliyor
- 36 yeni test (73 → 109), authorization ve orchestration testleri tamamen yeniden yazildi

## [0.6.0] - 2026-03-28

### Added
- Seed data scripti (3 user, 4 category, 14 product, 5 order)
- Docker Compose seed profili (docker compose --profile seed up seed)
- Deterministik ObjectId'ler ile referential integrity
- Idempotent seed (tekrar calistirmada ayni sonuc)

## [0.5.0] - 2026-03-28

### Added
- Order Service: siparis olusturma, listeleme, detay, durum guncelleme
- Status state machine (pending → confirmed → shipped → delivered, pending → cancelled)
- Data scoping (kullanici sadece kendi siparislerini gorur, admin tum siparisler)
- Fiyat dogrulama (totalAmount + item prices)
- Snapshot prensibi (productName, unitPrice siparis aninda sabit)
- Unit + integration testler (78 test, coverage >%95)

## [0.4.0] - 2026-03-28

### Added
- Product CRUD endpoint'leri (GET, POST, PUT, DELETE)
- Product arama (text search), filtreleme (category, price), siralama
- Pagination (meta: page, limit, total, totalPages)
- Stok guncelleme (PATCH /products/:id/stock — atomic $inc)
- Category DELETE RESTRICT (urune bagli kategori silinemez)
- Unit + integration testler (148 test, coverage >%99)

## [0.3.0] - 2026-03-28

### Added
- Product Service: Category CRUD endpoint'leri (GET, POST, PUT, DELETE)
- Category model (name unique, case-insensitive duplicate kontrolu)
- Shared error handler utility (error-handler.ts)
- Unit + integration testler (61 test, coverage >%98)

## [0.2.0] - 2026-03-28

### Added
- Auth Service: register, login, profile endpoint'leri
- User model (email unique, bcrypt password hash)
- JWT token uretimi (access token, 24h expiry)
- Zod validation (register, login schema'lari)
- Unit + integration testler (36 test, coverage >%99)

## [0.1.0] - 2026-03-24

### Added
- Phase 0: Proje iskeleti oluşturuldu
- 4 servis scaffold'u: Dispatcher, Auth, Product, Order
- Docker Compose ile 7 container (4 servis + MongoDB + Grafana + Prometheus)
- Network isolation: public-network + internal-network
- InternalAuthMiddleware (Auth, Product, Order servisleri)
- Health check endpoint'leri (Auth, Product, Order)
- Monitoring stub konfigürasyonları (Prometheus, Grafana)
