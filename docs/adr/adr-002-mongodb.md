# ADR-002: MongoDB (NoSQL Veritabanı)

**Date:** 2026-03-20
**Status:** Kabul Edildi

## Bağlam

Proje gereksinimleri NoSQL veritabanı zorunlu kılıyor. JSON dosyası okuyup yazan basit bir sınıf yerine gerçek bir NoSQL motoru kullanılmalı. Her servisin kendi izole veritabanı olmalı.

## Karar

**MongoDB 7.x** + **Mongoose 8.x** (ODM) kullanılacak.

## Alternatifler

| Alternatif | Avantaj | Dezavantaj |
|-----------|---------|------------|
| **Redis** | Ultra hızlı, key-value | Karmaşık sorgular zor, veri yapısı sınırlı |
| **Cassandra** | Yüksek ölçeklenebilirlik | Öğrenme eğrisi yüksek, küçük projede overkill |
| **CouchDB** | HTTP API, JSON native | Daha az yaygın, ekosistem küçük |
| **DynamoDB** | AWS managed | Cloud bağımlılığı, local development zor |

## Gerekçe

1. **JSON native** — Servisler arası veri transferi JSON gereksinimi ile doğal uyum.
2. **Mongoose** — Schema validation, middleware, virtuals. OOP prensipleri ile modelleme.
3. **Docker uyumu** — Resmi MongoDB Docker image'ı, docker-compose ile kolay kurulum.
4. **Veri izolasyonu** — Docker-compose'da 4 ayrı MongoDB instance veya tek instance üzerinde 4 ayrı database.
5. **Yaygınlık** — Geniş dokümantasyon, topluluk desteği, öğrenme kaynakları.

## Etkiler

- Her servis için ayrı MongoDB veritabanı (auth_db, product_db, order_db, dispatcher_db)
- Docker-compose'da tek MongoDB instance, farklı database'ler (maliyet-verimli)
- Mongoose model'leri TypeScript interface'leri ile tip güvenli
- Connection string'ler environment variable olarak
