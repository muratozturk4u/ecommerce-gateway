import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 50,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

// Seed data
const CUSTOMER_EMAIL = 'customer1@seed.com';
const CUSTOMER_PASSWORD = 'customer123';

// Yuksek stoklu urunler (siparis icin guvenli)
const HIGH_STOCK_PRODUCTS = [
  { id: 'eeeeeeeeeeeeeeeeeeeeee05', name: 'Keten Gomlek' },       // stock: 100
  { id: 'eeeeeeeeeeeeeeeeeeeeee06', name: 'Slim Fit Jean' },      // stock: 80
  { id: 'eeeeeeeeeeeeeeeeeeeeee08', name: 'Tutunamayanlar' },     // stock: 200
  { id: 'eeeeeeeeeeeeeeeeeeeeee0a', name: 'Sapiens' },            // stock: 150
  { id: 'eeeeeeeeeeeeeeeeeeeeee0b', name: 'Suc ve Ceza' },       // stock: 180
];

const PRODUCT_IDS = [
  'eeeeeeeeeeeeeeeeeeeeee01', 'eeeeeeeeeeeeeeeeeeeeee02',
  'eeeeeeeeeeeeeeeeeeeeee03', 'eeeeeeeeeeeeeeeeeeeeee04',
  'eeeeeeeeeeeeeeeeeeeeee05', 'eeeeeeeeeeeeeeeeeeeeee06',
  'eeeeeeeeeeeeeeeeeeeeee07', 'eeeeeeeeeeeeeeeeeeeeee08',
  'eeeeeeeeeeeeeeeeeeeeee09', 'eeeeeeeeeeeeeeeeeeeeee0a',
  'eeeeeeeeeeeeeeeeeeeeee0b', 'eeeeeeeeeeeeeeeeeeeeee0c',
  'eeeeeeeeeeeeeeeeeeeeee0d', 'eeeeeeeeeeeeeeeeeeeeee0e',
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

function loginCustomer() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
    { headers: getHeaders() }
  );
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    return body.data?.token;
  }
  return null;
}

// Agirlikli rastgele secim
// 30% list products, 20% product detail, 15% list categories,
// 10% category detail, 10% list orders, 10% create order, 5% profile
function pickAction() {
  const rand = Math.random() * 100;
  if (rand < 30) return 'list_products';
  if (rand < 50) return 'product_detail';
  if (rand < 65) return 'list_categories';
  if (rand < 75) return 'category_detail';
  if (rand < 85) return 'list_orders';
  if (rand < 95) return 'create_order';
  return 'profile';
}

export default function () {
  const token = loginCustomer();
  if (!token) {
    console.error('Login failed, skipping iteration');
    sleep(1);
    return;
  }

  const action = pickAction();

  switch (action) {
    case 'list_products': {
      const page = Math.ceil(Math.random() * 3);
      const res = http.get(`${BASE_URL}/api/products?page=${page}&limit=5`, {
        headers: getHeaders(token),
      });
      check(res, { 'list products 200': (r) => r.status === 200 });
      break;
    }
    case 'product_detail': {
      const id = randomItem(PRODUCT_IDS);
      const res = http.get(`${BASE_URL}/api/products/${id}`, {
        headers: getHeaders(token),
      });
      check(res, { 'product detail 200': (r) => r.status === 200 });
      break;
    }
    case 'list_categories': {
      const res = http.get(`${BASE_URL}/api/categories`, {
        headers: getHeaders(token),
      });
      check(res, { 'list categories 200': (r) => r.status === 200 });
      break;
    }
    case 'category_detail': {
      const id = randomItem(CATEGORY_IDS);
      const res = http.get(`${BASE_URL}/api/categories/${id}`, {
        headers: getHeaders(token),
      });
      check(res, { 'category detail 200': (r) => r.status === 200 });
      break;
    }
    case 'list_orders': {
      const res = http.get(`${BASE_URL}/api/orders`, {
        headers: getHeaders(token),
      });
      check(res, { 'list orders 200': (r) => r.status === 200 });
      break;
    }
    case 'create_order': {
      const product = randomItem(HIGH_STOCK_PRODUCTS);
      const res = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({
          items: [{ productId: product.id, quantity: 1 }],
          shippingAddress: { street: 'Load Test Cad.', city: 'Ankara', zip: '06000' },
        }),
        { headers: getHeaders(token) }
      );
      check(res, {
        'create order success': (r) => r.status === 201 || r.status === 400,
      });
      break;
    }
    case 'profile': {
      const res = http.get(`${BASE_URL}/api/auth/profile`, {
        headers: getHeaders(token),
      });
      check(res, { 'profile 200': (r) => r.status === 200 });
      break;
    }
  }

  sleep(0.5);
}
