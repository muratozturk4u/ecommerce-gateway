# ADR-006: Grafana + Prometheus Monitoring

**Date:** 2026-03-20
**Status:** Kabul Edildi

## Bağlam

Proje gereksinimleri Dispatcher üzerindeki trafik akışının grafiksel arayüz (Grafana vb.) ve detaylı log tablosu ile sunulmasını zorunlu kılıyor.

## Karar

**Grafana** (görselleştirme) + **Prometheus** (metrik toplama) + **Winston** (loglama) kullanılacak.

## Alternatifler

| Alternatif | Avantaj | Dezavantaj |
|-----------|---------|------------|
| **ELK Stack (Elasticsearch + Kibana)** | Güçlü log arama | Ağır, çok kaynak tüketir |
| **Datadog** | SaaS, kolay kurulum | Ücretli, bulut bağımlılığı |
| **Custom dashboard** | Tam kontrol | Geliştirme maliyeti yüksek |

## Gerekçe

1. **Grafana** — Açık kaynak, Docker ile kolay kurulum, hazır dashboard template'leri.
2. **Prometheus** — Pull-based metrik toplama, Node.js için `prom-client` kütüphanesi.
3. **Winston** — Yapılandırılmış JSON loglama, MongoDB'ye log yazma (log tablosu için).
4. **docker-compose** — Grafana + Prometheus container'ları tek komutla ayağa kalkar.

## Metrikler

| Metrik | Tip | Açıklama |
|--------|-----|----------|
| `http_requests_total` | Counter | Toplam HTTP istek sayısı |
| `http_request_duration_seconds` | Histogram | İstek yanıt süreleri |
| `http_requests_by_service` | Counter | Servise göre istek dağılımı |
| `http_errors_total` | Counter | Hata sayısı (4xx, 5xx) |
| `active_connections` | Gauge | Aktif bağlantı sayısı |

## Grafana Dashboard'ları

1. **Trafik Genel Bakış** — Toplam istek/saniye, yanıt süreleri, hata oranı
2. **Servis Bazlı** — Her mikroservise yönlendirilen istek sayısı ve süresi
3. **Hata Analizi** — HTTP durum kodu dağılımı, hata trendi
4. **Yük Testi Sonuçları** — 50/100/200/500 eşzamanlı istek performansı

## Log Tablosu

Winston logları MongoDB'ye yazılır. Dispatcher API'den (`GET /api/logs`) sorgulanabilir.

| Alan | Açıklama |
|------|----------|
| timestamp | İstek zamanı |
| method | HTTP metodu |
| path | İstek yolu |
| statusCode | HTTP durum kodu |
| responseTime | Yanıt süresi (ms) |
| userId | Kullanıcı ID (varsa) |
| targetService | Hedef servis |
| error | Hata mesajı (varsa) |

## Etkiler

- docker-compose'a Grafana ve Prometheus container'ları eklenir
- Dispatcher'a `prom-client` middleware eklenir
- `/api/metrics` endpoint'i Prometheus'a metrik sunar
- Grafana dashboard JSON'ları versiyon kontrolünde tutulur
- Rapor için Grafana ekran görüntüleri alınacak
