# Tech Stack

**Version:** 1.0.0
**Date:** 2026-03-20
**Status:** Taslak
**Related ADRs:** ADR-001, ADR-002, ADR-003, ADR-005, ADR-006

## Teknoloji Tablosu

| Kategori | Teknoloji | Versiyon | ADR |
|----------|-----------|----------|-----|
| Runtime | Node.js | 20+ | ADR-001 |
| Dil | TypeScript | 5.x | ADR-001 |
| Framework | Express.js | 4.x | ADR-003 |
| Veritabanı | MongoDB | 7.x | ADR-002 |
| ODM | Mongoose | 8.x | ADR-002 |
| Auth | jsonwebtoken (JWT) | 9.x | — |
| Şifreleme | bcrypt | 5.x | — |
| Validasyon | Zod | 3.x | — |
| Loglama | Winston | 3.x | — |
| Test Framework | Jest | 29.x | ADR-005 |
| HTTP Test | Supertest | 7.x | ADR-005 |
| Monitoring | Grafana + Prometheus | Latest | ADR-006 |
| Metrics Export | prom-client | 15.x | ADR-006 |
| Yük Testi | k6 | Latest | — |
| Container | Docker + docker-compose | Latest | ADR-004 |
| Linting | ESLint | 9.x | — |
| Formatting | Prettier | 3.x | — |

## Neden Bu Stack?

- **TypeScript:** Tip güvenliği, OOP desteği, refactoring kolaylığı
- **Express.js:** Basit, hafif, geniş ekosistem, öğrenme kolaylığı
- **MongoDB:** NoSQL gereksinimi, JSON doğal uyum, servis başına izole DB
- **Jest:** TDD desteği, watch mode, coverage, mocking
- **Docker:** Tek komutla (`docker-compose up`) tüm sistem ayağa kalkar
- **Grafana:** Trafik görselleştirme gereksinimine cevap

## İlgili Dokümanlar

- [Mimari Genel Bakış](overview.md)
- [Architecture Index](INDEX.md)
- [ADR Index](../adr/INDEX.md)
