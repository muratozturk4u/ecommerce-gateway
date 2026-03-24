# Changelog

Mimari kararlar ve önemli değişikliklerin kaydı.

## [0.1.0] - 2026-03-24

### Added
- Phase 0: Proje iskeleti oluşturuldu
- 4 servis scaffold'u: Dispatcher, Auth, Product, Order
- Docker Compose ile 7 container (4 servis + MongoDB + Grafana + Prometheus)
- Network isolation: public-network + internal-network
- InternalAuthMiddleware (Auth, Product, Order servisleri)
- Health check endpoint'leri (Auth, Product, Order)
- Monitoring stub konfigürasyonları (Prometheus, Grafana)
