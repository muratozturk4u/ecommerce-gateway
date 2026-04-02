# Sistem Mimarisi — Genel Bakış

**Version:** 1.0.0
**Date:** 2026-03-21
**Status:** Taslak
**Related ADRs:** ADR-001, ADR-002, ADR-003, ADR-004

## Mimari Diyagram

```mermaid
graph TB
    Client[İstemci / Tarayıcı] -->|HTTP| Dispatcher

    subgraph public-network
        Dispatcher[Dispatcher<br/>API Gateway<br/>:3000]
    end

    subgraph internal-network
        Dispatcher2[Dispatcher]
        Auth[Auth Service<br/>:3001]
        Product[Product Service<br/>:3002]
        Order[Order Service<br/>:3003]

        AuthDB[(MongoDB<br/>auth_db)]
        DispatcherDB[(MongoDB<br/>dispatcher_db)]
        ProductDB[(MongoDB<br/>product_db)]
        OrderDB[(MongoDB<br/>order_db)]
    end

    Dispatcher2 -->|/api/auth/*| Auth
    Dispatcher2 -->|/api/products/*| Product
    Dispatcher2 -->|/api/orders/*| Order

    Dispatcher2 --- DispatcherDB
    Auth --- AuthDB
    Product --- ProductDB
    Order --- OrderDB

    style Dispatcher fill:#e74c3c,color:#fff
    style Auth fill:#3498db,color:#fff
    style Product fill:#2ecc71,color:#fff
    style Order fill:#f39c12,color:#fff
```

## Network Isolation

```mermaid
graph LR
    subgraph Public Network
        Client[İstemci]
        Dispatcher[Dispatcher :3000]
    end

    subgraph Internal Network - Erişilemez
        Auth[Auth :3001]
        Product[Product :3002]
        Order[Order :3003]
    end

    Client -->|HTTP| Dispatcher
    Dispatcher -->|Internal| Auth
    Dispatcher -->|Internal| Product
    Dispatcher -->|Internal| Order
    Client -.->|BLOCKED| Auth
    Client -.->|BLOCKED| Product
    Client -.->|BLOCKED| Order
```

- **Dış dünyaya sadece Dispatcher açık** (port 3000)
- Mikroservisler Docker internal network'te
- Mikroservisler `X-Internal-Key` header'ı kontrol eder — sadece Dispatcher'dan gelen istekleri kabul eder
- **Mikroservisler birbirine doğrudan erişmez** — servisler arası koordinasyon Dispatcher orchestration ile yapılır

## İstek Akışı — Basit Proxy

```mermaid
sequenceDiagram
    participant C as İstemci
    participant D as Dispatcher
    participant P as Product Service

    C->>D: GET /api/products (Authorization: Bearer token)
    D->>D: JWT Token doğrulama
    D->>D: Yetki kontrolü (NoSQL'den)
    D->>D: İstek loglama
    D->>P: GET /products (X-Internal-Key header)
    P->>P: Internal key doğrulama
    P->>P: İş mantığı
    P-->>D: 200 OK + JSON
    D->>D: Yanıt loglama
    D-->>C: 200 OK + JSON
```

## İstek Akışı — Orchestration (Sipariş Oluşturma)

Birden fazla servisi içeren işlemler Dispatcher tarafından orchestrate edilir:

```mermaid
sequenceDiagram
    participant C as İstemci
    participant D as Dispatcher
    participant P as Product Service
    participant O as Order Service

    C->>D: POST /api/orders {items: [{productId, quantity}]}
    D->>D: Auth + Yetki kontrolü
    D->>P: GET /products/:id (stok kontrolü)
    P-->>D: {stock: 50, price: 100, name: "Laptop"}
    D->>P: PATCH /products/:id/stock {quantity: -2}
    P-->>D: 200 OK
    D->>O: POST /orders {items, totalAmount, userId}
    O-->>D: 201 Created {order}
    D-->>C: 201 Created {order}
```

## Katmanlı Mimari (Her Servis İçin)

```mermaid
graph TB
    Routes[Routes Layer] --> Controller[Controller Layer]
    Controller --> Service[Service Layer]
    Service --> Repository[Repository Layer]
    Repository --> Database[(MongoDB)]

    Middleware[Middleware] --> Routes
    Validation[Validation - Zod] --> Controller
```

| Katman | Sorumluluk |
|--------|------------|
| Routes | HTTP yönlendirme, middleware bağlama |
| Controller | Request/Response işleme, validasyon |
| Service | İş mantığı, business rules |
| Repository | Veritabanı işlemleri (CRUD) |
| Middleware | Auth, logging, error handling |

## İlgili Dokümanlar

- [Tech Stack](tech-stack.md)
- [Servisler](services/INDEX.md)
- [API](api/INDEX.md)
- [Veritabanı](database/INDEX.md)
- [ADR-004: Docker Network Isolation](../adr/adr-004-docker-network-isolation.md)
