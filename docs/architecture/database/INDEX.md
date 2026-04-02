# Database — Index

**Son Güncelleme:** 2026-03-21

---

## Planlanan Dokümanlar

| Dosya | İçerik | Durum |
|-------|--------|-------|
| data-model.md | MongoDB koleksiyon şemaları, E-R diyagramı, index tanımları | Plan sonrası yazılacak |

## Veri İzolasyonu (Karar Verilmiş)

Her servisin kendi bağımsız MongoDB veritabanı olacak:

| Servis | Veritabanı |
|--------|------------|
| Dispatcher | dispatcher_db |
| Auth Service | auth_db |
| Product Service | product_db |
| Order Service | order_db |

- Servisler birbirinin veritabanına doğrudan erişemez
- Servisler arası veri transferi JSON (HTTP üzerinden)
- Tek MongoDB instance, farklı database'ler (ADR-002)

## Üst Dizin

[<- architecture/INDEX.md](../INDEX.md)
