# API — Index

**Son Güncelleme:** 2026-03-21

---

## Planlanan Dokümanlar

| Dosya | İçerik | Durum |
|-------|--------|-------|
| route-map.md | Tüm API endpoint'leri (Dispatcher üzerinden dış URL → iç yönlendirme) | Plan sonrası yazılacak |

## API Tasarım Prensipleri

- RMM Seviye 2 zorunlu (kaynak URI + doğru HTTP metotları + doğru durum kodları)
- Tüm dış istekler Dispatcher üzerinden `/api` prefix'i ile gelir
- Hata durumunda HTTP 200 + error:true YASAK
- Detaylı konvansiyonlar: `.claude/rules/api-conventions.md`

## Üst Dizin

[<- architecture/INDEX.md](../INDEX.md)
