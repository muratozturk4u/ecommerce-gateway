# ADR-003: Express.js (Web Framework)

**Date:** 2026-03-20
**Status:** Kabul Edildi

## Bağlam

Dispatcher (API Gateway) ve mikroservisler için bir web framework seçilmeli. Dispatcher'ın middleware pattern ile istek zincirleme yapabilmesi önemli.

## Karar

**Express.js 4.x** tüm servisler için kullanılacak.

## Alternatifler

| Alternatif | Avantaj | Dezavantaj |
|-----------|---------|------------|
| **Fastify** | 2-3x daha hızlı, schema validation | Daha az yaygın, middleware farklı |
| **Koa** | Modern, async/await native | Küçük ekosistem, middleware az |
| **NestJS** | Tam OOP, Angular benzeri | Ağır boilerplate, öğrenme eğrisi |
| **Hapi** | Konfigürasyon bazlı | Popülarite düşmüş |

## Gerekçe

1. **Middleware pattern** — Dispatcher'ın auth → log → proxy → error handling zinciri Express middleware ile doğal.
2. **Basitlik** — Üniversite projesi ölçeğinde overkill olmayan, anlaşılır bir framework.
3. **Ekosistem** — Binlerce middleware paketi (cors, helmet, morgan, express-rate-limit).
4. **Supertest uyumu** — Test sırasında Express app'i doğrudan test edebilme (TDD için kritik).
5. **Yaygınlık** — En bilinen Node.js framework'ü, her yerde kaynak var.

## Etkiler

- Tüm 4 servis Express.js kullanacak
- Dispatcher: `http-proxy-middleware` veya custom proxy implementasyonu
- Her servis bağımsız Express app instance
- Middleware'ler class-based yazılacak (OOP uyumu için)
