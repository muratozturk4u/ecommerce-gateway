# Transformation Plan — Ana Navigasyon

**Proje:** E-Commerce Gateway (Mikroservis + API Gateway)
**Oluşturma:** 2026-03-23
**Son Güncelleme:** 2026-03-23
**Teslim Tarihi:** 2026-04-05

---

## Faz Durumu

| Faz | Dosya | Durum | Başlangıç | Bitiş |
|-----|-------|-------|-----------|-------|
| Phase 0: Proje İskeleti | [phase-0-skeleton.md](phase-0-skeleton.md) | NOT STARTED | - | - |
| Phase 1: Dispatcher (TDD) | [phase-1-dispatcher.md](phase-1-dispatcher.md) | NOT STARTED | - | - |
| Phase 2a: Auth Service | [phase-2a-auth-service.md](phase-2a-auth-service.md) | NOT STARTED | - | - |
| Phase 2b: Product Service | [phase-2b-product-service.md](phase-2b-product-service.md) | NOT STARTED | - | - |
| Phase 2c: Order Service | [phase-2c-order-service.md](phase-2c-order-service.md) | NOT STARTED | - | - |
| Phase 3: Entegrasyon | [phase-3-integration.md](phase-3-integration.md) | NOT STARTED | - | - |

> **Durum değerleri:** NOT STARTED → IN PROGRESS → BLOCKED → COMPLETED

## Dosya Haritası

| Dosya | İçerik |
|-------|--------|
| [overview.md](overview.md) | Büyük resim: bağımlılık grafi, timeline, risk tablosu, ekip stratejisi |
| [phase-0-skeleton.md](phase-0-skeleton.md) | Monorepo yapısı, Docker, config, service scaffold |
| [phase-1-dispatcher.md](phase-1-dispatcher.md) | Dispatcher TDD — 11 cycle, 33 commit (KRİTİK FAZ) |
| [phase-2a-auth-service.md](phase-2a-auth-service.md) | Auth Service: register, login, profile |
| [phase-2b-product-service.md](phase-2b-product-service.md) | Product Service: CRUD, arama, kategori, stok |
| [phase-2c-order-service.md](phase-2c-order-service.md) | Order Service: sipariş oluşturma, takip, durum |
| [phase-3-integration.md](phase-3-integration.md) | E2E test, Grafana, k6, seed data, rapor, sunum |

## Hızlı Referans

- Proje Anayasası: [CLAUDE.md](../../CLAUDE.md)
- Mimari Genel Bakış: [docs/architecture/overview.md](../architecture/overview.md)
- ADR Kararları: [docs/adr/INDEX.md](../adr/INDEX.md)
- Kodlama Standartları: [.claude/rules/](../../.claude/rules/)
- Proje Gereksinimleri: [PDF](../YazLab%20II%20-%202526B%20-%20Proje%20I.pdf)

## Üst Dizin

[<- docs/INDEX.md](../INDEX.md)
