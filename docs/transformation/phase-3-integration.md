# Phase 3 — Entegrasyon, Monitoring, Yük Testi ve Rapor

**Durum:** NOT STARTED
**Tahmini Süre:** 2-3 gün
**Bağımlılık:** Phase 0, 1, 2a, 2b, 2c tümü tamamlanmış olmalı

---

## Hedef

Phase 3 bittiğinde:

- Tüm sistem uçtan uca çalışıyor (register → login → ürün listele → sipariş oluştur)
- Grafana dashboard'ları trafik verisi gösteriyor
- Prometheus Dispatcher'dan metrik topluyor
- Winston logları konsol ve dosyaya yazıyor
- GET /api/logs paginated log tablosu dönüyor
- k6 yük testleri tamamlanmış (50, 100, 200, 500 VU)
- Network isolation doğrulanmış ve ekran görüntüsü alınmış
- Seed data yüklenmiş (demo için)
- README.md rapor tamamlanmış (tüm bölümler, Mermaid diyagramları, ekran görüntüleri)
- (Opsiyonel) HATEOAS (+5 bonus)
- Sunuma hazır

---

## Ön Koşullar

- Phase 0: Docker altyapısı çalışıyor
- Phase 1: Dispatcher tam fonksiyonel (routing, auth, proxy, logging, metrics)
- Phase 2a: Auth Service çalışıyor (register, login, profile)
- Phase 2b: Product Service çalışıyor (CRUD, arama, stok)
- Phase 2c: Order Service çalışıyor (sipariş CRUD, status)

---

## Adımlar

### Adım 3.1: End-to-End Smoke Test

Tüm sistemi `docker-compose up` ile kaldırıp elle veya script ile tam akış testi:

```bash
# 1. Sistemi başlat
docker-compose up --build -d

# 2. Health check
curl http://localhost:3000/health

# 3. Seed data yükle (admin + demo verisi)
docker-compose run --rm seed

# 4. Seed admin ile giriş
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seed.com","password":"admin123"}'
# → Token al (seed admin hesabı, role: admin)

# 5. Seed kategorileri listele (seed'den gelen veri)
curl http://localhost:3000/api/categories \
  -H "Authorization: Bearer {TOKEN}"

# 6. Seed ürünleri listele (seed'den gelen veri)
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer {TOKEN}"

# 7. Yeni ürün oluştur (admin CRUD doğrulama)
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Ürün","price":100,"stock":10}'

# 8. Sipariş oluştur (orchestration)
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"...","quantity":2}]}'

# 9. Siparişleri listele
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer {TOKEN}"

# 10. Logları kontrol et
curl http://localhost:3000/api/logs \
  -H "Authorization: Bearer {TOKEN}"

# 11. Network isolation doğrulama
curl http://localhost:3001/health    # → Connection refused (DOĞRU)
curl http://localhost:3002/health    # → Connection refused (DOĞRU)
curl http://localhost:3003/health    # → Connection refused (DOĞRU)

# 12. Metrics kontrolü
curl http://localhost:3000/api/metrics
```

**Doğrulanacaklar:**
- [ ] Tüm akış sorunsuz çalışıyor
- [ ] Stok düşüyor (sipariş sonrası)
- [ ] Loglar MongoDB'de görünüyor
- [ ] Dışarıdan mikroservislere erişim yok

---

### Adım 3.2: Prometheus Yapılandırması

**Dosya:** `monitoring/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'dispatcher'
    static_configs:
      - targets: ['dispatcher:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 5s
```

**docker-compose.yml güncellemesi:**
```yaml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
  networks:
    - internal-network
```

**Doğrulama:**
```bash
# Prometheus UI (geçici olarak port açarak kontrol)
# veya container içinden:
docker exec prometheus wget -qO- http://dispatcher:3000/api/metrics
```

---

### Adım 3.3: Grafana Dashboard'ları

**Dosya yapısı:**
```
monitoring/
  grafana/
    provisioning/
      datasources/
        prometheus.yml
      dashboards/
        dashboard.yml
    dashboards/
      traffic-overview.json
      per-service.json
      error-analysis.json
      load-test-results.json
```

**Provisioning — Datasource (prometheus.yml):**
```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

**4 Dashboard:**

| # | Dashboard | İçerik |
|---|-----------|--------|
| 1 | Traffic Overview | Requests/sec, ortalama response time, error rate, aktif bağlantılar |
| 2 | Per-Service | Servise göre request dağılımı (auth, product, order), servise göre latency |
| 3 | Error Analysis | HTTP status code dağılımı (2xx, 4xx, 5xx), hata trendi (zaman bazlı) |
| 4 | Load Test Results | VU bazlı performans (50, 100, 200, 500), throughput vs response time |

**docker-compose.yml güncellemesi:**
```yaml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3100:3000"
  volumes:
    - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
    - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/traffic-overview.json
  networks:
    - public-network
    - internal-network
```

**Erişim:** `http://localhost:3100` (admin / admin)

---

### Adım 3.4: k6 Yük Testleri

**Dosya yapısı:**
```
load-tests/
  smoke.js           (5 VU, 30s — temel sağlık kontrolü)
  load.js            (50 VU, 1 dakika — normal yük)
  stress.js          (ramp-up: 50→100→200→500 VU — stres testi)
  helpers/
    auth.js           (login + token alma helper)
```

**Test Senaryoları:**

| Senaryo | Endpoint | Metot | VU Seviyeleri |
|---------|----------|-------|--------------|
| Product listing | /api/products | GET | 50, 100, 200, 500 |
| Product detail | /api/products/:id | GET | 50, 100, 200, 500 |
| Auth flow | /api/auth/login | POST | 50, 100 |
| Order creation | /api/orders | POST | 50, 100 |
| Mixed workload | Karma (70% read, 30% write) | GET/POST | 100, 200, 500 |
| Routing accuracy | Tüm endpoint'ler | GET/POST/PUT/PATCH/DELETE | 5 |

> **Routing accuracy senaryosu:** Her endpoint'e 1 istek göndererek tüm routing
> tablosunun doğru çalıştığını doğrular. Yanlış yönlendirme, 404, veya beklenmeyen
> hata dönen endpoint'ler raporlanır.

**stress.js örnek yapısı:**
```javascript
export const options = {
  stages: [
    { duration: '30s', target: 50 },    // ramp-up to 50 VU
    { duration: '1m',  target: 50 },    // stay at 50
    { duration: '30s', target: 100 },   // ramp-up to 100
    { duration: '1m',  target: 100 },   // stay at 100
    { duration: '30s', target: 200 },   // ramp-up to 200
    { duration: '1m',  target: 200 },   // stay at 200
    { duration: '30s', target: 500 },   // ramp-up to 500
    { duration: '1m',  target: 500 },   // stay at 500
    { duration: '30s', target: 0 },     // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // %95 istekte <2s
    http_req_failed: ['rate<0.05'],      // hata oranı <%5
  },
};
```

**Çalıştırma:**
```bash
# Docker dışında, host makinede:
k6 run load-tests/smoke.js
k6 run load-tests/load.js
k6 run load-tests/stress.js

# Sonuçları JSON'a kaydet:
k6 run --out json=results/stress-results.json load-tests/stress.js
```

**Rapor için kaydedilecek metrikler:**
- Ortalama response time (ms)
- p95 response time (ms)
- Requests/sec (throughput)
- Error rate (%)
- Her VU seviyesi için ayrı ayrı

---

### Adım 3.5: Seed Data (Demo Verisi)

**Dosya:** `scripts/seed.ts` (veya `scripts/seed.js`)

Sunumda boş DB ile demo yapılmaması için başlangıç verisi:

| Veri | Miktar | Detay |
|------|--------|-------|
| Kullanıcılar | 3 | 1 admin (admin@seed.com), 2 customer |
| Kategoriler | 4 | Elektronik, Giyim, Kitap, Ev & Yaşam |
| Ürünler | 12-15 | Her kategoride 3-4 ürün (farklı fiyat ve stok) |
| Siparişler | 5 | Farklı durumlar (pending, confirmed, shipped, delivered) |

> **Not:** Admin hesabı yalnızca seed data ile oluşturulur. Public register her zaman
> `customer` rolü atar (Phase 2a kararı — admin self-promotion engeli).

**Çalıştırma:**

Seed script'i ayrı bir container olarak çalıştırılır. Bu container 3 veritabanına
(auth_db, product_db, order_db) bağlanarak verileri yükler:

> **Not:** dispatcher_db'ye seed yapılmaz. route_access_rules Dispatcher kendi startup'ında
> seed eder (Phase 1 Cycle 5). request_logs operasyonel veridir.

```yaml
# docker-compose.yml'de seed servisi tanımı:
seed:
  build:
    context: ./scripts
    dockerfile: Dockerfile.seed
  environment:
    - MONGODB_URI=mongodb://mongodb:27017
  networks:
    - internal-network
  depends_on:
    - mongodb
  profiles:
    - seed    # Sadece "docker-compose run --rm seed" ile çalışır
```

```bash
# Seed çalıştırma:
docker-compose run --rm seed
```

> **Neden ayrı container?** Seed script'i birden fazla veritabanına yazma yapması gerekir
> (auth_db'ye kullanıcılar, product_db'ye ürünler/kategoriler, order_db'ye siparişler).
> Servislerin kendi veritabanı dışına erişmemesi prensibi gereği, seed ayrı bir container'da çalışır.

---

### Adım 3.6: HATEOAS — RMM Seviye 3 (Opsiyonel, +5 Bonus Puan)

> **Bu adım opsiyonel.** Zaman kalırsa yapılır. Yapılmazsa puan kaybı yok.

Response'lara `_links` alanı eklenir:

**Örnek — GET /api/products/:id:**
```json
{
  "success": true,
  "data": {
    "id": "64a...",
    "name": "Laptop",
    "price": 15000,
    "_links": {
      "self": { "href": "/api/products/64a...", "method": "GET" },
      "update": { "href": "/api/products/64a...", "method": "PUT" },
      "delete": { "href": "/api/products/64a...", "method": "DELETE" },
      "category": { "href": "/api/categories/64b...", "method": "GET" },
      "collection": { "href": "/api/products", "method": "GET" }
    }
  }
}
```

**Örnek — GET /api/orders/:id (status: pending):**
```json
{
  "success": true,
  "data": {
    "id": "64c...",
    "status": "pending",
    "_links": {
      "self": { "href": "/api/orders/64c...", "method": "GET" },
      "cancel": { "href": "/api/orders/64c.../status", "method": "PATCH" },
      "collection": { "href": "/api/orders", "method": "GET" }
    }
  }
}
```

**Eklenecek servisler:** Dispatcher (proxy response'ları zenginleştirme) veya her mikroserviste ayrı ayrı.

---

### Adım 3.7: README.md Rapor

**Dosya:** `README.md` (repo kökünde)

PDF'teki rapor gereksinimleri — tüm bölümler:

#### Bölüm 1: Kapak Bilgileri
- Proje adı
- Ekip üyeleri (isim, numara)
- Tarih
- Ders adı

#### Bölüm 2: Giriş
- Problem tanımı (e-ticaret sisteminde API Gateway ihtiyacı)
- Projenin amacı
- Kullanılan teknolojiler (kısa özet)

#### Bölüm 3: Teorik Altyapı
- **Mikroservis mimarisi nedir** — monolith vs mikroservis karşılaştırması
- **API Gateway (Dispatcher) nedir** — rolü, faydaları
- **Richardson Maturity Model (RMM) nedir** — 4 seviye açıklaması
- **RESTful servisler nedir** — REST prensipleri
- **Test-Driven Development (TDD) nedir** — Red-Green-Refactor açıklaması
- **Karmaşıklık analizi** — Ana algoritmalar ve Big-O karmaşıklıkları:

  | İşlem | Karmaşıklık | Açıklama |
  |-------|-------------|----------|
  | Ürün arama (text search) | O(n) | MongoDB text index ile |
  | Ürün filtreleme (index) | O(log n) | B-tree index |
  | JWT doğrulama | O(1) | HMAC imza kontrolü |
  | Route matching | O(k) | k = route sayısı |
  | Sipariş oluşturma (orchestration) | O(m) | m = ürün sayısı |
  | Log ekleme | O(1) | Async fire-and-forget |

- **Literatür taraması** — Kaynak referanslar:
  - Mikroservis mimarisi (Martin Fowler, Sam Newman)
  - API Gateway pattern (Richardson, 2018)
  - TDD (Kent Beck, 2002)
  - REST (Roy Fielding, 2000)
  - Docker containerization

#### Bölüm 4: Sistem Tasarımı
- **Mimari diyagram** (Mermaid — overview.md'deki diyagram)
- **Network isolation diyagramı** (Mermaid)
- **İstek akışı sequence diyagramları** (Mermaid):
  - Basit proxy akışı
  - Orchestration akışı (sipariş oluşturma)
  - Auth akışı (register → login)
- **Sınıf diyagramları** (Mermaid — her servis için)
- **Akış diyagramları / Flowchart** (Mermaid):
  - Dispatcher istek işleme akışı
  - JWT doğrulama akışı
  - Sipariş orchestration akışı
- **Veritabanı şemaları** (her servis için koleksiyon tabloları)

#### Bölüm 5: Proje Yapısı
- Dizin yapısı (Mermaid tree veya kod bloğu)
- Modüllerin açıklamaları

#### Bölüm 6: Test ve Sonuçlar
- **TDD süreci** — Örnek Red-Green-Refactor döngüsü
- **Test coverage tablosu** (servis bazında)
- **k6 yük testi sonuçları:**
  - 50 VU: avg response time, p95, error rate
  - 100 VU: avg response time, p95, error rate
  - 200 VU: avg response time, p95, error rate
  - 500 VU: avg response time, p95, error rate
- **Ekran görüntüleri:**
  - Grafana dashboard'ları (4 dashboard)
  - Docker çalışan container'lar (`docker ps`)
  - Network isolation kanıtı (`docker network inspect`)
  - k6 çalışma sonuçları
  - API request/response örnekleri

#### Bölüm 7: Sonuç ve Tartışma
- Başarılar (neler tamamlandı)
- Sınırlılıklar (bilinen eksikler, iyileştirme alanları)
- Olası iyileştirmeler (gelecek çalışmalar)

---

### Adım 3.8: Sunum Hazırlığı

- [ ] `docker-compose down && docker-compose up --build` ile temiz başlatma testi
- [ ] Demo akışı hazırla (register → login → CRUD → sipariş → Grafana → loglar)
- [ ] Ekran görüntülerini al (rapor için)
- [ ] k6 sonuçlarını dışa aktar
- [ ] `git shortlog -sn` ile commit dengesi kontrol et
- [ ] Son bir kez tüm testleri çalıştır

---

## Oluşturulacak / Güncellenecek Dosyalar

```
Güncellenen stub dosyalar (Phase 0'da oluşturulmuş):
  monitoring/prometheus/prometheus.yml              (stub → gerçek config)
  monitoring/grafana/provisioning/datasources/prometheus.yml  (stub → gerçek config)

Yeni dosyalar:
  monitoring/grafana/provisioning/dashboards/dashboard.yml
  monitoring/grafana/dashboards/traffic-overview.json
  monitoring/grafana/dashboards/per-service.json
  monitoring/grafana/dashboards/error-analysis.json
  monitoring/grafana/dashboards/load-test-results.json
  load-tests/smoke.js
  load-tests/load.js
  load-tests/stress.js
  load-tests/helpers/auth.js
  scripts/seed.ts (veya seed.js)
  scripts/Dockerfile.seed
  scripts/package.json
  README.md

Güncellenecek dosyalar:
  docker-compose.yml (Grafana + Prometheus volumes ve config)
  CHANGELOG.md (Phase 3 completion entry)
  SCRATCHPAD.md (durum güncellemesi)
  docs/transformation/INDEX.md (durum güncellemesi)
  docs/architecture/services/ (servis spesifikasyonları — asıl yazılacak)
  docs/architecture/api/route-map.md (endpoint tablosu — asıl yazılacak)
  docs/architecture/database/data-model.md (şema tanımları — asıl yazılacak)
```

---

## Quality Gate — Teslim Öncesi (Final Kontrol)

### Sistem
- [ ] `docker-compose up --build` ile TÜM sistem sorunsuz kalkıyor
- [ ] End-to-end akış çalışıyor (register → login → ürün listele → sipariş oluştur)
- [ ] Network isolation doğrulanmış (`docker network inspect` + dış erişim testi)
- [ ] Tüm health check'ler yanıt veriyor

### Test
- [ ] Dispatcher testleri geçiyor, coverage >%80
- [ ] Auth Service testleri geçiyor, coverage >%60
- [ ] Product Service testleri geçiyor, coverage >%60
- [ ] Order Service testleri geçiyor, coverage >%60
- [ ] TDD timestamp'ları doğru (Phase 1 — `git log` kontrolü)

### Monitoring
- [ ] Grafana dashboard'ları veri gösteriyor (http://localhost:3100)
- [ ] Prometheus metrik topluyor (dispatcher:3000/api/metrics)
- [ ] Winston konsol logları çalışıyor
- [ ] GET /api/logs paginated log tablosu dönüyor

### Yük Testi
- [ ] k6 smoke test geçiyor
- [ ] k6 load test tamamlandı (50 VU)
- [ ] k6 stress test tamamlandı (100, 200, 500 VU)
- [ ] Sonuçlar kaydedildi (JSON + ekran görüntüsü)

### Rapor
- [ ] README.md tüm bölümleri içeriyor
- [ ] Mermaid diyagramları render ediliyor (mimari, sequence, class, flowchart)
- [ ] Ekran görüntüleri mevcut (Grafana, docker ps, network inspect, k6)
- [ ] Karmaşıklık analizi yazıldı
- [ ] Literatür taraması yazıldı
- [ ] Sonuç ve tartışma bölümü yazıldı

### Kod Kalitesi
- [ ] TODO/FIXME/HACK yok (tüm codebase)
- [ ] Dead code yok
- [ ] `any` type yok
- [ ] Hardcoded değer yok (portlar, URL'ler, secret'lar .env'den)

### Ekip
- [ ] `git shortlog -sn` — commit sayıları dengeli
- [ ] Her iki ekip üyesinden düzenli commit var (git log tarihleri)
- [ ] Proje tek sıkıştırılmış dosya olarak teslim edilecek

### Opsiyonel
- [ ] HATEOAS (_links) eklenmiş (+5 bonus)

---

## İlgili Dokümanlar

- [ADR-006: Grafana + Prometheus](../adr/adr-006-grafana-monitoring.md)
- [Tüm faz dosyaları](INDEX.md)
- [Mimari Genel Bakış](../architecture/overview.md)
- [Proje Anayasası](../../CLAUDE.md)
