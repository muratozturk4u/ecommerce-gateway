# ADR-001: TypeScript + Node.js

**Date:** 2026-03-20
**Status:** Kabul Edildi

## Bağlam

Projenin programlama dili ve runtime seçimi gerekiyor. Proje gereksinimleri dil kısıtı koymamakta ancak TDD uyumlu bir test framework'ü şart koşmakta.

## Karar

**TypeScript + Node.js** kullanılacak.

## Alternatifler

| Alternatif | Avantaj | Dezavantaj |
|-----------|---------|------------|
| **JavaScript (Node.js)** | Hızlı geliştirme, düşük öğrenme eğrisi | Tip güvenliği yok, runtime hataları |
| **Python (FastAPI/Flask)** | Kolay sözdizimi, iyi test ekosistemi | Performans düşük, async yönetimi zor |
| **Java (Spring Boot)** | Güçlü OOP, kurumsal standart | Ağır boilerplate, yavaş geliştirme |
| **Go** | Yüksek performans, concurrency | OOP zayıf, test ekosistemi sınırlı |

## Gerekçe

1. **TypeScript** — Tip güvenliği sayesinde OOP prensipleri (interface, abstract class, generics) doğal şekilde destekleniyor. Proje OOP zorunluluğunu karşılıyor.
2. **Jest** — TDD için en olgun test framework'lerinden biri. Watch mode, coverage, mocking yerleşik.
3. **Express.js ekosistemi** — Middleware pattern ile Dispatcher mimarisi doğal uyum sağlıyor.
4. **MongoDB driver** — Node.js'in en iyi NoSQL desteğine sahip runtime'lardan biri.
5. **Docker uyumu** — Node.js container image'ları hafif ve hızlı.

## Etkiler

- Her servis TypeScript ile yazılacak
- `tsconfig.json` strict mode aktif (tip güvenliği maksimum)
- Build çıktısı JavaScript (dist/ dizini)
- Test dosyaları `.test.ts` uzantısı ile
