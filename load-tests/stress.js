import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.15'],
  },
};

const CUSTOMER_EMAIL = 'customer1@seed.com';
const CUSTOMER_PASSWORD = 'customer123';

const HIGH_STOCK_PRODUCTS = [
  'eeeeeeeeeeeeeeeeeeeeee05',
  'eeeeeeeeeeeeeeeeeeeeee08',
  'eeeeeeeeeeeeeeeeeeeeee0a',
  'eeeeeeeeeeeeeeeeeeeeee0b',
];

const PRODUCT_IDS = [
  'eeeeeeeeeeeeeeeeeeeeee01', 'eeeeeeeeeeeeeeeeeeeeee02',
  'eeeeeeeeeeeeeeeeeeeeee03', 'eeeeeeeeeeeeeeeeeeeeee05',
  'eeeeeeeeeeeeeeeeeeeeee08', 'eeeeeeeeeeeeeeeeeeeeee0a',
];

const CATEGORY_IDS = [
  'dddddddddddddddddddddd01', 'dddddddddddddddddddddd02',
  'dddddddddddddddddddddd03', 'dddddddddddddddddddddd04',
];

function getHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Setup: tek seferlik login, tum VU'lar bu token'i kullanir
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
    { headers: getHeaders() }
  );

  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${res.body}`);
  }

  const body = JSON.parse(res.body);
  return { token: body.data.token };
}

export default function (data) {
  const token = data.token;
  const rand = Math.random() * 100;

  if (rand < 35) {
    // List products
    const res = http.get(`${BASE_URL}/api/products?page=1&limit=10`, {
      headers: getHeaders(token),
    });
    check(res, { 'list products ok': (r) => r.status === 200 });
  } else if (rand < 55) {
    // Product detail
    const id = randomItem(PRODUCT_IDS);
    const res = http.get(`${BASE_URL}/api/products/${id}`, {
      headers: getHeaders(token),
    });
    check(res, { 'product detail ok': (r) => r.status === 200 });
  } else if (rand < 70) {
    // List categories
    const res = http.get(`${BASE_URL}/api/categories`, {
      headers: getHeaders(token),
    });
    check(res, { 'list categories ok': (r) => r.status === 200 });
  } else if (rand < 80) {
    // Category detail
    const id = randomItem(CATEGORY_IDS);
    const res = http.get(`${BASE_URL}/api/categories/${id}`, {
      headers: getHeaders(token),
    });
    check(res, { 'category detail ok': (r) => r.status === 200 });
  } else if (rand < 90) {
    // List orders
    const res = http.get(`${BASE_URL}/api/orders`, {
      headers: getHeaders(token),
    });
    check(res, { 'list orders ok': (r) => r.status === 200 });
  } else {
    // Create order (stok tukenmesi mumkun, 400/409 kabul edilir)
    const productId = randomItem(HIGH_STOCK_PRODUCTS);
    const res = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify({
        items: [{ productId: productId, quantity: 1 }],
        shippingAddress: { street: 'Stress Cad.', city: 'Izmir', zip: '35000' },
      }),
      { headers: getHeaders(token) }
    );
    check(res, {
      'create order accepted': (r) =>
        r.status === 201 || r.status === 400 || r.status === 409,
    });
  }

  sleep(0.3);
}
