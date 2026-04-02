# Phase 0 — Proje İskeleti

**Durum:** NOT STARTED
**Tahmini Süre:** 1 gün
**Bağımlılık:** Yok (ilk faz)

---

## Hedef

Phase 0 bittiğinde:

- Monorepo yapısı kurulmuş (4 servis dizini)
- docker-compose.yml ile 7 container tanımlı (dispatcher, auth, product, order, mongodb, grafana, prometheus)
- Her servis stub Express uygulaması (sadece health check)
- MongoDB erişilebilir (4 database)
- Network isolation yapılandırılmış (public + internal)
- InternalAuthMiddleware mikroservislerde aktif
- `docker-compose up --build` başarılı
- TypeScript build hatasız

---

## Ön Koşullar

- Node.js 20+ kurulu
- Docker Desktop kurulu ve çalışıyor
- Git yapılandırılmış

---

## Adımlar

### Adım 0.1: Root Proje Yapısı

Oluşturulacak dosyalar:

```
ecommerce-gateway/
  package.json                    (root — workspace tanımı opsiyonel)
  tsconfig.base.json              (paylaşılan TS config)
  .env.example                    (tüm environment variable'lar)
  .gitignore                      (node_modules, dist, .env, vb.)
  .dockerignore                   (node_modules, dist, *.test.ts, .env)
```

**.env.example içeriği:**

```env
# Ports
DISPATCHER_PORT=3000
AUTH_SERVICE_PORT=3001
PRODUCT_SERVICE_PORT=3002
ORDER_SERVICE_PORT=3003

# MongoDB
MONGODB_URI=mongodb://mongodb:27017

# Auth
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=24h

# Internal Communication
INTERNAL_KEY=your-internal-key-here

# Service URLs (Docker internal network)
AUTH_SERVICE_URL=http://auth-service:3001
PRODUCT_SERVICE_URL=http://product-service:3002
ORDER_SERVICE_URL=http://order-service:3003

# Logging
LOG_LEVEL=info

# Node
NODE_ENV=development
```

### Adım 0.2: Servis Scaffold'ları

Her servis (dispatcher, auth-service, product-service, order-service) için aynı yapı:

```
services/{service-name}/
  package.json                    (scripts: dev, build, start, test)
  tsconfig.json                   (extends root tsconfig.base.json)
  jest.config.ts                  (ts-jest preset)
  Dockerfile                      (multi-stage build)
  .dockerignore                   (node_modules, dist, *.test.ts)
  src/
    app.ts                        (Express app factory — createApp)
    server.ts                     (listen on port)
    config/
      index.ts                    (environment variables)
    interfaces/
      .gitkeep                    (Git boş dizin takip etmez — .gitkeep gerekli)
    models/
      .gitkeep
    repositories/
      .gitkeep
    services/
      .gitkeep
    controllers/
      .gitkeep
    routes/
      health.routes.ts            (GET /health endpoint)
    middleware/
      .gitkeep
    validators/
      .gitkeep
    utils/
      .gitkeep
  __tests__/
    .gitkeep
```

**Health check endpoint (her serviste):**

```
GET /health → 200 OK
{
  "success": true,
  "data": {
    "service": "dispatcher",
    "status": "ok",
    "timestamp": "2026-03-23T12:00:00Z"
  }
}
```

**Dockerfile (multi-stage build):**

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
# Her servis kendi portunu kullanır:
# dispatcher: 3000, auth-service: 3001, product-service: 3002, order-service: 3003
CMD ["node", "dist/server.js"]
```

### Adım 0.3: InternalAuthMiddleware

Auth, Product ve Order servisleri için `X-Internal-Key` doğrulama middleware'i:

```
services/{service-name}/src/middleware/internal-auth.middleware.ts
```

**Davranış:**
- `X-Internal-Key` header'ı kontrol eder
- Eşleşmezse → `403 Forbidden` döner
- `/health` endpoint'i muaf (Docker health check için gerekli — ADR-004'e ek karar)
- Class-based (OOP uyumlu — ADR-003 gereği tüm middleware'ler class olmalı)

> **Not:** express-rate-limit gibi function-based kütüphaneler de class wrapper ile sarılmalıdır (OOP uyumu).

**Response (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Internal access only"
  }
}
```

> **Not:** Dispatcher'da bu middleware YOKTUR. Dispatcher dış dünyaya açıktır.

### Adım 0.4: Docker Compose

```
ecommerce-gateway/
  docker-compose.yml
```

**Container'lar:**

| Servis | Image | Port Mapping | Network |
|--------|-------|-------------|---------|
| dispatcher | Build: ./services/dispatcher | 3000:3000 | public-network, internal-network |
| auth-service | Build: ./services/auth-service | — (yok) | internal-network |
| product-service | Build: ./services/product-service | — (yok) | internal-network |
| order-service | Build: ./services/order-service | — (yok) | internal-network |
| mongodb | mongo:7 | — (yok) | internal-network |
| grafana | grafana/grafana:latest | 3100:3000 | public-network, internal-network |
| prometheus | prom/prometheus:latest | — (yok) | internal-network |

**Network yapısı:**

```yaml
networks:
  public-network:
    driver: bridge
  internal-network:
    driver: bridge
    internal: true    # Dış erişim fiziksel olarak engellenir
```

**MongoDB tek instance, 4 database:**
- Her servis farklı connection string ile farklı database'e bağlanır
- `mongodb://mongodb:27017/dispatcher_db`
- `mongodb://mongodb:27017/auth_db`
- `mongodb://mongodb:27017/product_db`
- `mongodb://mongodb:27017/order_db`

**Grafana ve Prometheus stub config:**

```
monitoring/
  prometheus/
    prometheus.yml              (stub — Phase 3'te doldurulacak)
  grafana/
    provisioning/
      datasources/
        prometheus.yml          (stub — Phase 3'te doldurulacak)
```

### Adım 0.5: Doğrulama

```bash
# 1. Docker build ve start
docker-compose up --build -d

# 2. Health check testi
curl http://localhost:3000/health          # Dispatcher → 200 OK

# 3. Internal servislere dışarıdan erişim testi
curl http://localhost:3001/health          # → Connection refused (port mapping yok)

# 4. Network isolation doğrulama
docker network inspect ecommerce-gateway_internal-network

# 5. MongoDB bağlantı testi (container içinden)
docker exec -it mongodb mongosh --eval "show dbs"

# 6. TypeScript build kontrolü
cd services/dispatcher && npx tsc --noEmit
```

---

## Oluşturulacak Dosya Listesi

```
Root:
  package.json
  tsconfig.base.json
  .env.example
  .env                           (.gitignore'da, .example'dan kopyalanır)
  .gitignore
  .dockerignore
  docker-compose.yml

Monitoring:
  monitoring/prometheus/prometheus.yml
  monitoring/grafana/provisioning/datasources/prometheus.yml

Her Servis (x4):
  services/{name}/package.json
  services/{name}/tsconfig.json
  services/{name}/jest.config.ts
  services/{name}/Dockerfile
  services/{name}/.dockerignore
  services/{name}/src/app.ts
  services/{name}/src/server.ts
  services/{name}/src/config/index.ts
  services/{name}/src/routes/health.routes.ts

Sadece Mikroservisler (x3, Dispatcher hariç):
  services/{name}/src/middleware/internal-auth.middleware.ts
```

**Toplam: ~35 dosya**

---

## Quality Gate — Phase 1'e Geçmeden Önce

- [ ] `docker-compose up --build` tüm servisleri başlatıyor
- [ ] Dispatcher `GET /health` → 200 OK dönüyor
- [ ] Auth Service `GET /health` → 200 OK (container içinden)
- [ ] Product Service `GET /health` → 200 OK (container içinden)
- [ ] Order Service `GET /health` → 200 OK (container içinden)
- [ ] Dışarıdan mikroservislere erişim yok (port mapping yok)
- [ ] `docker network inspect` ile internal-network doğrulandı
- [ ] MongoDB 4 database'e bağlantı çalışıyor
- [ ] InternalAuthMiddleware aktif (X-Internal-Key olmadan → 403)
- [ ] TypeScript build hatasız (`tsc --noEmit`)
- [ ] .env.example tüm değişkenleri içeriyor
- [ ] .dockerignore dosyaları mevcut
- [ ] Kod: TODO/FIXME/HACK yok
- [ ] Kod: Dead code yok

---

## İlgili Dokümanlar

- [ADR-004: Docker Network Isolation](../adr/adr-004-docker-network-isolation.md)
- [ADR-001: TypeScript + Node.js](../adr/adr-001-typescript-nodejs.md)
- [Mimari Genel Bakış](../architecture/overview.md)
