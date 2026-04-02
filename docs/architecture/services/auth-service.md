# Auth Service

Kullanici kaydi, girisi ve profil goruntuleme islemlerini yoneten kimlik dogrulama servisi.

## Genel Bilgi

| Ozellik | Deger |
|---------|-------|
| Port | 3001 |
| Veritabani | MongoDB (auth_db) |
| Base Path | /auth |
| Bagimlilklar | bcrypt, jsonwebtoken, zod |

## Endpoint'ler

| Metot | Path | Aciklama | Durum Kodu | Yetki |
|-------|------|----------|------------|-------|
| POST | /auth/register | Kullanici kaydi | 201 | Public (Dispatcher uzerinden) |
| POST | /auth/login | Kullanici girisi | 200 | Public (Dispatcher uzerinden) |
| GET | /auth/profile | Profil goruntuleme | 200 | Protected (X-User-Id gerekli) |
| GET | /health | Saglik kontrolu | 200 | Public (X-Internal-Key bypass) |

## User Model

| Alan | Tip | Ozellik |
|------|-----|---------|
| email | String | unique, lowercase, trim |
| passwordHash | String | bcrypt hash (salt rounds: 10) |
| name | String | trim |
| role | String | enum: admin, customer (default: customer) |
| createdAt | Date | otomatik (timestamps) |
| updatedAt | Date | otomatik (timestamps) |

## Is Kurallari

### Register
- Yeni kullanici her zaman `role: customer` olarak kaydedilir (admin self-promotion yasak)
- Email tekrari kontrolu: ayni email varsa 409 Conflict
- Email case-insensitive: `TEST@test.com` ve `test@test.com` ayni kabul edilir
- Sifre bcrypt ile hash'lenir (salt rounds: 10)

### Login
- Email ile kullanici bulunur, bcrypt.compare ile sifre dogrulanir
- Gecersiz email veya sifre: ayni hata mesaji (401 Invalid credentials)
- Bilgi sizintisi onlemi: "email bulunamadi" ve "sifre yanlis" ayrimi yapilmaz

### Profile
- X-User-Id header'i Dispatcher tarafindan JWT'den cozulup inject edilir
- ObjectId format dogrulamasi yapilir (invalid format → 400)
- Yanit'ta passwordHash bulunmaz

## JWT Token

| Alan | Deger |
|------|-------|
| Payload | `{ userId, role, iat, exp }` |
| Algorithm | HS256 (default) |
| Expiry | 24h (JWT_EXPIRES_IN env) |
| Secret | JWT_SECRET env variable |

## Hata Kodlari

| HTTP | Error Code | Durum |
|------|------------|-------|
| 400 | VALIDATION_ERROR | Zod validation hatasi, eksik header, gecersiz ObjectId |
| 401 | UNAUTHORIZED | Gecersiz email/sifre |
| 403 | FORBIDDEN | X-Internal-Key eksik veya yanlis |
| 404 | NOT_FOUND | Kullanici bulunamadi (profile) |
| 409 | CONFLICT | Email zaten kayitli |
| 500 | INTERNAL_ERROR | Beklenmeyen sunucu hatasi |

## Mimari

```
Routes → Controller → Service → Repository → MongoDB
```

- **AuthController**: Request/response isleme, Zod validation, hata yonetimi
- **AuthService**: Is mantigi (register, login, profile), bcrypt, JWT
- **UserRepository**: MongoDB CRUD (Mongoose)
- **Interfaces**: IAuthService, IAuthController, IUserRepository (Dependency Inversion)

## Dispatcher ile Iliski

- Auth Service JWT uretir, Dispatcher bu JWT'yi dogrular
- JWT_SECRET her iki serviste de ayni olmali (env variable)
- Dispatcher, JWT'den `userId` ve `role` cikarip X-User-Id ve X-User-Role header'lari olarak inject eder
- Tum istekler X-Internal-Key ile korunur (InternalAuthMiddleware)
