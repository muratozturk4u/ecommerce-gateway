# Services — Index

**Son Güncelleme:** 2026-03-21

---

## Planlanan Servisler

| Servis | Port | Veritabanı | Açıklama | Doküman |
|--------|------|------------|----------|---------|
| Dispatcher (API Gateway) | 3000 | dispatcher_db | Tek giriş noktası, routing, auth, loglama | Plan sonrası yazılacak |
| Auth Service | 3001 | auth_db | Kullanıcı kaydı, giriş, JWT yönetimi | Plan sonrası yazılacak |
| Product Service | 3002 | product_db | Ürün CRUD, arama, kategoriler | Plan sonrası yazılacak |
| Order Service | 3003 | order_db | Sipariş oluşturma, takip, geçmiş | Plan sonrası yazılacak |

> Servis spesifikasyonları (sınıf diyagramları, endpoint tabloları, middleware zinciri vb.)
> planlama aşamasından sonra bu klasöre eklenecektir.

## Üst Dizin

[<- architecture/INDEX.md](../INDEX.md)
