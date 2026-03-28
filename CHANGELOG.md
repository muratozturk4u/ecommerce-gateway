# Changelog

Mimari kararlar ve önemli değişikliklerin kaydı.

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
