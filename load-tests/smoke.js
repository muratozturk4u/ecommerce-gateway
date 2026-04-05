import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

// Seed data bilgileri
const ADMIN_EMAIL = 'admin@seed.com';
const ADMIN_PASSWORD = 'admin123';
const CUSTOMER_EMAIL = 'customer1@seed.com';
const CUSTOMER_PASSWORD = 'customer123';

// Seed urun ID'leri (yuksek stoklu urunler)
const PRODUCT_ID_GOMLEK = 'eeeeeeeeeeeeeeeeeeeeee05';    // stock: 100
const PRODUCT_ID_TUTUNAMAYANLAR = 'eeeeeeeeeeeeeeeeeeeeee08'; // stock: 200
const CATEGORY_ID_ELEKTRONIK = 'dddddddddddddddddddddd01';

function getHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export default function () {
  let customerToken;

  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
    });
  });

  group('Register (unique user)', () => {
    const uniqueEmail = `smoke_${Date.now()}_${__VU}_${__ITER}@test.com`;
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        email: uniqueEmail,
        password: 'test123456',
        name: 'Smoke Test User',
      }),
      { headers: getHeaders() }
    );
    check(res, {
      'register status 201': (r) => r.status === 201,
    });
  });

  group('Login (seed customer)', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: CUSTOMER_EMAIL,
        password: CUSTOMER_PASSWORD,
      }),
      { headers: getHeaders() }
    );
    check(res, {
      'login status 200': (r) => r.status === 200,
      'login returns token': (r) => {
        const body = JSON.parse(r.body);
        customerToken = body.data?.token;
        return !!customerToken;
      },
    });
  });

  group('List Products', () => {
    const res = http.get(`${BASE_URL}/api/products`, {
      headers: getHeaders(customerToken),
    });
    check(res, {
      'products status 200': (r) => r.status === 200,
      'products has data': (r) => JSON.parse(r.body).data?.length > 0,
    });
  });

  group('List Categories', () => {
    const res = http.get(`${BASE_URL}/api/categories`, {
      headers: getHeaders(customerToken),
    });
    check(res, {
      'categories status 200': (r) => r.status === 200,
      'categories has data': (r) => JSON.parse(r.body).data?.length > 0,
    });
  });

  group('Product Detail', () => {
    const res = http.get(`${BASE_URL}/api/products/${PRODUCT_ID_GOMLEK}`, {
      headers: getHeaders(customerToken),
    });
    check(res, {
      'product detail status 200': (r) => r.status === 200,
    });
  });

  group('Create Order', () => {
    const res = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify({
        items: [
          { productId: PRODUCT_ID_TUTUNAMAYANLAR, quantity: 1 },
        ],
        shippingAddress: {
          street: 'Test Cad. No: 1',
          city: 'Istanbul',
          zip: '34000',
        },
      }),
      { headers: getHeaders(customerToken) }
    );
    check(res, {
      'order status 201': (r) => r.status === 201,
    });
  });

  group('List Orders', () => {
    const res = http.get(`${BASE_URL}/api/orders`, {
      headers: getHeaders(customerToken),
    });
    check(res, {
      'orders status 200': (r) => r.status === 200,
    });
  });

  group('Metrics Endpoint', () => {
    const res = http.get(`${BASE_URL}/api/metrics`);
    check(res, {
      'metrics status 200': (r) => r.status === 200,
      'metrics has content': (r) => r.body.includes('http_requests_total'),
    });
  });

  sleep(1);
}
