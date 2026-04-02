# ADR-005: Jest + TDD Yaklaşımı

**Date:** 2026-03-20
**Status:** Kabul Edildi

## Bağlam

Proje gereksinimleri Dispatcher servisinin TDD (Red-Green-Refactor) ile geliştirilmesini zorunlu kılıyor. Test dosyalarının zaman damgası fonksiyonel kodlardan önce gelmeli. TDD uyumlu bir test framework'ü seçilmeli.

## Karar

**Jest 29.x** + **Supertest 7.x** kullanılacak. Dispatcher TDD ile, diğer servisler test-after ile geliştirilecek.

## Alternatifler

| Alternatif | Avantaj | Dezavantaj |
|-----------|---------|------------|
| **Mocha + Chai** | Esnek, modüler | Konfigürasyon fazla, yerleşik mock yok |
| **Vitest** | Hızlı, Vite uyumlu | Node.js backend'de Vite gereksiz |
| **Jasmine** | Basit | Modern özellikleri eksik |
| **AVA** | Paralel çalışma | Ekosistem küçük |

## Gerekçe

1. **Zero-config** — TypeScript desteği (`ts-jest` ile), mocking, coverage yerleşik.
2. **Watch mode** — TDD döngüsünde `jest --watch` ile anında geri bildirim.
3. **Supertest** — Express app'i port açmadan HTTP test edebilme (unit test hızında integration test).
4. **Coverage** — `--coverage` ile test kapsam raporu otomatik.
5. **Mocking** — `jest.mock()`, `jest.spyOn()` ile dependency injection test'leri kolay.

## TDD Workflow

```
┌─────────────────────────────────────────────┐
│ Dispatcher TDD Döngüsü                      │
│                                              │
│  1. [RED] Test yaz → jest FAIL              │
│     └─ git commit -m "[TDD-RED] test: ..."  │
│                                              │
│  2. [GREEN] Implement et → jest PASS        │
│     └─ git commit -m "[TDD-GREEN] feat: ..."│
│                                              │
│  3. [REFACTOR] İyileştir → jest PASS        │
│     └─ git commit -m "[TDD-REFACTOR] ..."   │
│                                              │
│  Tekrar 1'e dön (sonraki özellik)           │
└─────────────────────────────────────────────┘
```

## Test Kategorileri

| Kategori | Araç | Kapsam |
|----------|------|--------|
| Unit Test | Jest | Service, Repository, Middleware sınıfları |
| Integration Test | Jest + Supertest | API endpoint'leri (Express app) |
| Load Test | k6 | Performans, eşzamanlı istek |

## Etkiler

- Dispatcher: Her özellik için önce test, sonra implementation commit
- Diğer servisler: Test zorunlu ama TDD sırası şart değil
- CI pipeline'da test çalıştırma
- Coverage raporu (%80+ hedef)
- Test dosyaları `__tests__/` veya `*.test.ts` pattern
