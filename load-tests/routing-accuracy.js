import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

/*
  Route Coverage Matrix (20 route from DEFAULT_ROUTE_RULES):
  ============================================================
  #  | Path                      | Method | AuthLevel  | Test
  -- | ------------------------- | ------ | ---------- | ----
  1  | /health                   | GET    | public     | No token -> 200
  2  | /api/auth/register        | POST   | public     | No token -> 201
  3  | /api/auth/login           | POST   | public     | No token -> 200
  4  | /api/auth/profile         | GET    | protected  | Token -> 200, No token -> 401
  5  | /api/products             | GET    | protected  | Token -> 200, No token -> 401
  6  | /api/products/:id         | GET    | protected  | Token -> 200, No token -> 401
  7  | /api/products             | POST   | admin      | Admin -> 201, Customer -> 403, No token -> 401
  8  | /api/products/:id         | PUT    | admin      | Admin -> 200, Customer -> 403
  9  | /api/products/:id         | DELETE | admin      | Admin -> 204, Customer -> 403
  10 | /api/categories           | GET    | protected  | Token -> 200, No token -> 401
  11 | /api/categories/:id       | GET    | protected  | Token -> 200, No token -> 401
  12 | /api/categories           | POST   | admin      | Admin -> 201, Customer -> 403
  13 | /api/categories/:id       | PUT    | admin      | Admin -> 200, Customer -> 403
  14 | /api/categories/:id       | DELETE | admin      | Admin -> 204, Customer -> 403
  15 | /api/orders               | POST   | protected  | Token -> 201
  16 | /api/orders               | GET    | protected  | Token -> 200, No token -> 401
  17 | /api/orders/:id           | GET    | protected  | Token -> 200, No token -> 401
  18 | /api/orders/:id/status    | PATCH  | protected  | Token -> 200
  19 | /api/logs                 | GET    | admin      | Admin -> 200, Customer -> 403
  20 | /api/metrics              | GET    | public     | No token -> 200
*/

// Seed data -- BU ID'LERI SILME
const SEED_PRODUCT_IDS = [
  'eeeeeeeeeeeeeeeeeeeeee01', 'eeeeeeeeeeeeeeeeeeeeee02',
  'eeeeeeeeeeeeeeeeeeeeee03', 'eeeeeeeeeeeeeeeeeeeeee04',
  'eeeeeeeeeeeeeeeeeeeeee05', 'eeeeeeeeeeeeeeeeeeeeee06',
  'eeeeeeeeeeeeeeeeeeeeee07', 'eeeeeeeeeeeeeeeeeeeeee08',
  'eeeeeeeeeeeeeeeeeeeeee09', 'eeeeeeeeeeeeeeeeeeeeee0a',
  'eeeeeeeeeeeeeeeeeeeeee0b', 'eeeeeeeeeeeeeeeeeeeeee0c',
  'eeeeeeeeeeeeeeeeeeeeee0d', 'eeeeeeeeeeeeeeeeeeeeee0e',
];
const SEED_CATEGORY_IDS = [
  'dddddddddddddddddddddd01', 'dddddddddddddddddddddd02',
  'dddddddddddddddddddddd03', 'dddddddddddddddddddddd04',
];
const SEED_ORDER_IDS = [
  'ffffffffffffffffffffff01', 'ffffffffffffffffffffff02',
  'ffffffffffffffffffffff03', 'ffffffffffffffffffffff04',
  'ffffffffffffffffffffff05',
];

const ADMIN_EMAIL = 'admin@seed.com';
const ADMIN_PASSWORD = 'admin123';
const CUSTOMER_EMAIL = 'customer1@seed.com';
const CUSTOMER_PASSWORD = 'customer123';

function getHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function login(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: getHeaders() }
  );
  if (res.status === 200) {
    return JSON.parse(res.body).data?.token;
  }
  return null;
}

export default function () {
  // Login olarak token al
  const adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const customerToken = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

  if (!adminToken || !customerToken) {
    console.error('Login failed -- admin or customer token is null');
    return;
  }

  // ===== PUBLIC ENDPOINTS (token gerektirmez) =====

  group('PUBLIC: Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { '[1] GET /health -> 200': (r) => r.status === 200 });
  });

  group('PUBLIC: Register', () => {
    const uniqueEmail = `accuracy_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ email: uniqueEmail, password: 'test123456', name: 'Accuracy Test' }),
      { headers: getHeaders() }
    );
    check(res, { '[2] POST /api/auth/register -> 201': (r) => r.status === 201 });
  });

  group('PUBLIC: Login', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
      { headers: getHeaders() }
    );
    check(res, { '[3] POST /api/auth/login -> 200': (r) => r.status === 200 });
  });

  group('PUBLIC: Metrics', () => {
    const res = http.get(`${BASE_URL}/api/metrics`);
    check(res, { '[20] GET /api/metrics -> 200': (r) => r.status === 200 });
  });

  // ===== PROTECTED ENDPOINTS (customer token ile) =====

  group('PROTECTED: Profile with token', () => {
    const res = http.get(`${BASE_URL}/api/auth/profile`, { headers: getHeaders(customerToken) });
    check(res, { '[4] GET /api/auth/profile + token -> 200': (r) => r.status === 200 });
  });

  group('PROTECTED: Profile without token', () => {
    const res = http.get(`${BASE_URL}/api/auth/profile`);
    check(res, { '[4] GET /api/auth/profile no token -> 401': (r) => r.status === 401 });
  });

  group('PROTECTED: List Products with token', () => {
    const res = http.get(`${BASE_URL}/api/products`, { headers: getHeaders(customerToken) });
    check(res, { '[5] GET /api/products + token -> 200': (r) => r.status === 200 });
  });

  group('PROTECTED: List Products without token', () => {
    const res = http.get(`${BASE_URL}/api/products`);
    check(res, { '[5] GET /api/products no token -> 401': (r) => r.status === 401 });
  });

  group('PROTECTED: Product Detail with token', () => {
    const res = http.get(`${BASE_URL}/api/products/${SEED_PRODUCT_IDS[0]}`, {
      headers: getHeaders(customerToken),
    });
    check(res, { '[6] GET /api/products/:id + token -> 200': (r) => r.status === 200 });
  });

  group('PROTECTED: Product Detail without token', () => {
    const res = http.get(`${BASE_URL}/api/products/${SEED_PRODUCT_IDS[0]}`);
    check(res, { '[6] GET /api/products/:id no token -> 401': (r) => r.status === 401 });
  });

  group('PROTECTED: List Categories with token', () => {
    const res = http.get(`${BASE_URL}/api/categories`, { headers: getHeaders(customerToken) });
    check(res, { '[10] GET /api/categories + token -> 200': (r) => r.status === 200 });
  });

  group('PROTECTED: List Categories without token', () => {
    const res = http.get(`${BASE_URL}/api/categories`);
    check(res, { '[10] GET /api/categories no token -> 401': (r) => r.status === 401 });
  });

  group('PROTECTED: Category Detail with token', () => {
    const res = http.get(`${BASE_URL}/api/categories/${SEED_CATEGORY_IDS[0]}`, {
      headers: getHeaders(customerToken),
    });
    check(res, { '[11] GET /api/categories/:id + token -> 200': (r) => r.status === 200 });
  });

  group('PROTECTED: Category Detail without token', () => {
    const res = http.get(`${BASE_URL}/api/categories/${SEED_CATEGORY_IDS[0]}`);
    check(res, { '[11] GET /api/categories/:id no token -> 401': (r) => r.status === 401 });
  });

  group('PROTECTED: List Orders with token', () => {
    const res = http.get(`${BASE_URL}/api/orders`, { headers: getHeaders(customerToken) });
    check(res, { '[16] GET /api/orders + token -> 200': (r) => r.status === 200 });
  });

  group('PROTECTED: List Orders without token', () => {
    const res = http.get(`${BASE_URL}/api/orders`);
    check(res, { '[16] GET /api/orders no token -> 401': (r) => r.status === 401 });
  });

  group('PROTECTED: Order Detail with token', () => {
    const res = http.get(`${BASE_URL}/api/orders/${SEED_ORDER_IDS[0]}`, {
      headers: getHeaders(customerToken),
    });
    // customer1 bu siparisi gorebilmeli (customer1'in siparisi)
    check(res, { '[17] GET /api/orders/:id + token -> 200': (r) => r.status === 200 });
  });

  group('PROTECTED: Order Detail without token', () => {
    const res = http.get(`${BASE_URL}/api/orders/${SEED_ORDER_IDS[0]}`);
    check(res, { '[17] GET /api/orders/:id no token -> 401': (r) => r.status === 401 });
  });

  // ===== ADMIN ENDPOINTS =====

  // -- Test kaynaklari olustur (sonra sil) --
  let testProductId = null;
  let testCategoryId = null;

  group('ADMIN: Create Category (admin)', () => {
    const res = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify({ name: `TestCat_${Date.now()}`, description: 'Accuracy test category' }),
      { headers: getHeaders(adminToken) }
    );
    check(res, { '[12] POST /api/categories admin -> 201': (r) => r.status === 201 });
    if (res.status === 201) {
      testCategoryId = JSON.parse(res.body).data?._id;
    }
  });

  group('ADMIN: Create Category (customer -> 403)', () => {
    const res = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify({ name: `Forbidden_${Date.now()}`, description: 'Should fail' }),
      { headers: getHeaders(customerToken) }
    );
    check(res, { '[12] POST /api/categories customer -> 403': (r) => r.status === 403 });
  });

  group('ADMIN: Create Product (admin)', () => {
    const catId = testCategoryId || SEED_CATEGORY_IDS[0];
    const res = http.post(
      `${BASE_URL}/api/products`,
      JSON.stringify({
        name: `TestProduct_${Date.now()}`,
        description: 'Accuracy test product',
        price: 100,
        stock: 10,
        categoryId: catId,
      }),
      { headers: getHeaders(adminToken) }
    );
    check(res, { '[7] POST /api/products admin -> 201': (r) => r.status === 201 });
    if (res.status === 201) {
      testProductId = JSON.parse(res.body).data?._id;
    }
  });

  group('ADMIN: Create Product (customer -> 403)', () => {
    const res = http.post(
      `${BASE_URL}/api/products`,
      JSON.stringify({
        name: 'Forbidden Product',
        description: 'Should fail',
        price: 50,
        stock: 5,
        categoryId: SEED_CATEGORY_IDS[0],
      }),
      { headers: getHeaders(customerToken) }
    );
    check(res, { '[7] POST /api/products customer -> 403': (r) => r.status === 403 });
  });

  group('ADMIN: Create Product (no token -> 401)', () => {
    const res = http.post(
      `${BASE_URL}/api/products`,
      JSON.stringify({
        name: 'No Auth Product',
        description: 'Should fail',
        price: 50,
        stock: 5,
        categoryId: SEED_CATEGORY_IDS[0],
      }),
      { headers: getHeaders() }
    );
    check(res, { '[7] POST /api/products no token -> 401': (r) => r.status === 401 });
  });

  // PUT product
  if (testProductId) {
    group('ADMIN: Update Product (admin)', () => {
      const res = http.put(
        `${BASE_URL}/api/products/${testProductId}`,
        JSON.stringify({ name: `Updated_${Date.now()}`, price: 200 }),
        { headers: getHeaders(adminToken) }
      );
      check(res, { '[8] PUT /api/products/:id admin -> 200': (r) => r.status === 200 });
    });

    group('ADMIN: Update Product (customer -> 403)', () => {
      const res = http.put(
        `${BASE_URL}/api/products/${testProductId}`,
        JSON.stringify({ name: 'Forbidden Update', price: 300 }),
        { headers: getHeaders(customerToken) }
      );
      check(res, { '[8] PUT /api/products/:id customer -> 403': (r) => r.status === 403 });
    });
  }

  // PUT category
  if (testCategoryId) {
    group('ADMIN: Update Category (admin)', () => {
      const res = http.put(
        `${BASE_URL}/api/categories/${testCategoryId}`,
        JSON.stringify({ name: `UpdatedCat_${Date.now()}`, description: 'Updated' }),
        { headers: getHeaders(adminToken) }
      );
      check(res, { '[13] PUT /api/categories/:id admin -> 200': (r) => r.status === 200 });
    });

    group('ADMIN: Update Category (customer -> 403)', () => {
      const res = http.put(
        `${BASE_URL}/api/categories/${testCategoryId}`,
        JSON.stringify({ name: 'Forbidden Update', description: 'Fail' }),
        { headers: getHeaders(customerToken) }
      );
      check(res, { '[13] PUT /api/categories/:id customer -> 403': (r) => r.status === 403 });
    });
  }

  // DELETE product (once urun sil, sonra kategori -- ters sirada category restrict hatasi olabilir)
  if (testProductId) {
    group('ADMIN: Delete Product (customer -> 403)', () => {
      const res = http.del(`${BASE_URL}/api/products/${testProductId}`, null, {
        headers: getHeaders(customerToken),
      });
      check(res, { '[9] DELETE /api/products/:id customer -> 403': (r) => r.status === 403 });
    });

    group('ADMIN: Delete Product (admin)', () => {
      const res = http.del(`${BASE_URL}/api/products/${testProductId}`, null, {
        headers: getHeaders(adminToken),
      });
      check(res, { '[9] DELETE /api/products/:id admin -> 204': (r) => r.status === 204 });
    });
  }

  // DELETE category
  if (testCategoryId) {
    group('ADMIN: Delete Category (customer -> 403)', () => {
      const res = http.del(`${BASE_URL}/api/categories/${testCategoryId}`, null, {
        headers: getHeaders(customerToken),
      });
      check(res, { '[14] DELETE /api/categories/:id customer -> 403': (r) => r.status === 403 });
    });

    group('ADMIN: Delete Category (admin)', () => {
      const res = http.del(`${BASE_URL}/api/categories/${testCategoryId}`, null, {
        headers: getHeaders(adminToken),
      });
      check(res, { '[14] DELETE /api/categories/:id admin -> 204': (r) => r.status === 204 });
    });
  }

  // Create Order (protected, customer token ile)
  group('PROTECTED: Create Order', () => {
    const res = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify({
        items: [{ productId: SEED_PRODUCT_IDS[7], quantity: 1 }],
        shippingAddress: { street: 'Accuracy Cad.', city: 'Bursa', zip: '16000' },
      }),
      { headers: getHeaders(customerToken) }
    );
    check(res, { '[15] POST /api/orders + token -> 201': (r) => r.status === 201 });
  });

  // PATCH order status (pending -> cancelled, customer1'in order1'i pending durumda)
  group('PROTECTED: Update Order Status', () => {
    const res = http.patch(
      `${BASE_URL}/api/orders/${SEED_ORDER_IDS[0]}/status`,
      JSON.stringify({ status: 'cancelled' }),
      { headers: getHeaders(customerToken) }
    );
    check(res, { '[18] PATCH /api/orders/:id/status + token -> 200': (r) => r.status === 200 });
  });

  // Admin logs
  group('ADMIN: View Logs (admin)', () => {
    const res = http.get(`${BASE_URL}/api/logs`, { headers: getHeaders(adminToken) });
    check(res, { '[19] GET /api/logs admin -> 200': (r) => r.status === 200 });
  });

  group('ADMIN: View Logs (customer -> 403)', () => {
    const res = http.get(`${BASE_URL}/api/logs`, { headers: getHeaders(customerToken) });
    check(res, { '[19] GET /api/logs customer -> 403': (r) => r.status === 403 });
  });
}
