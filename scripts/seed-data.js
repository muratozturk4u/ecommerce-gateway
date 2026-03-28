const { Types } = require('mongoose');

// === DETERMINISTIC OBJECT IDs ===

const IDS = {
  // Users
  admin:     new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
  customer1: new Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
  customer2: new Types.ObjectId('cccccccccccccccccccccccc'),

  // Categories
  elektronik: new Types.ObjectId('dddddddddddddddddddddd01'),
  giyim:      new Types.ObjectId('dddddddddddddddddddddd02'),
  kitap:      new Types.ObjectId('dddddddddddddddddddddd03'),
  evYasam:    new Types.ObjectId('dddddddddddddddddddddd04'),

  // Products - Elektronik
  iphone:     new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee01'),
  macbook:    new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee02'),
  samsung:    new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee03'),
  ipad:       new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee04'),

  // Products - Giyim
  gomlek:     new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee05'),
  jean:       new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee06'),
  ayakkabi:   new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee07'),

  // Products - Kitap
  tutunamayanlar: new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee08'),
  cleanCode:      new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee09'),
  sapiens:        new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee0a'),
  sucVeCeza:      new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee0b'),

  // Products - Ev & Yasam
  lamba:    new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee0c'),
  nevresim: new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee0d'),
  kahve:    new Types.ObjectId('eeeeeeeeeeeeeeeeeeeeee0e'),

  // Orders
  order1: new Types.ObjectId('ffffffffffffffffffffff01'),
  order2: new Types.ObjectId('ffffffffffffffffffffff02'),
  order3: new Types.ObjectId('ffffffffffffffffffffff03'),
  order4: new Types.ObjectId('ffffffffffffffffffffff04'),
  order5: new Types.ObjectId('ffffffffffffffffffffff05')
};

// === USERS (auth_db.users) ===

const users = [
  {
    _id: IDS.admin,
    email: 'admin@seed.com',
    name: 'Admin User',
    role: 'admin',
    _plainPassword: 'admin123'
  },
  {
    _id: IDS.customer1,
    email: 'customer1@seed.com',
    name: 'Ahmet Yilmaz',
    role: 'customer',
    _plainPassword: 'customer123'
  },
  {
    _id: IDS.customer2,
    email: 'customer2@seed.com',
    name: 'Ayse Demir',
    role: 'customer',
    _plainPassword: 'customer123'
  }
];

// === CATEGORIES (product_db.categories) ===

const categories = [
  { _id: IDS.elektronik, name: 'Elektronik', description: 'Telefon, bilgisayar, tablet ve aksesuar' },
  { _id: IDS.giyim, name: 'Giyim', description: 'Kadin, erkek ve cocuk giyim' },
  { _id: IDS.kitap, name: 'Kitap', description: 'Roman, akademik ve cocuk kitaplari' },
  { _id: IDS.evYasam, name: 'Ev & Yasam', description: 'Mobilya, dekorasyon ve ev gerecleri' }
];

// === PRODUCTS (product_db.products) ===

const products = [
  // Elektronik (4)
  { _id: IDS.iphone, name: 'iPhone 15 Pro', description: 'Apple iPhone 15 Pro 256GB Titanium', price: 64999, stock: 25, categoryId: IDS.elektronik, isActive: true },
  { _id: IDS.macbook, name: 'MacBook Air M3', description: 'Apple MacBook Air 13" M3 chip 8GB RAM', price: 49999, stock: 15, categoryId: IDS.elektronik, isActive: true },
  { _id: IDS.samsung, name: 'Samsung Galaxy S24', description: 'Samsung Galaxy S24 Ultra 256GB', price: 44999, stock: 30, categoryId: IDS.elektronik, isActive: true },
  { _id: IDS.ipad, name: 'iPad Air', description: 'Apple iPad Air M2 11" 128GB', price: 27999, stock: 20, categoryId: IDS.elektronik, isActive: true },

  // Giyim (3)
  { _id: IDS.gomlek, name: 'Keten Gomlek', description: 'Erkek keten slim fit gomlek', price: 499, stock: 100, categoryId: IDS.giyim, isActive: true },
  { _id: IDS.jean, name: 'Slim Fit Jean', description: 'Erkek slim fit mavi jean pantolon', price: 699, stock: 80, categoryId: IDS.giyim, isActive: true },
  { _id: IDS.ayakkabi, name: 'Spor Ayakkabi', description: 'Unisex hafif spor ayakkabi', price: 1299, stock: 60, categoryId: IDS.giyim, isActive: true },

  // Kitap (4)
  { _id: IDS.tutunamayanlar, name: 'Tutunamayanlar', description: 'Oguz Atay - Tutunamayanlar', price: 89, stock: 200, categoryId: IDS.kitap, isActive: true },
  { _id: IDS.cleanCode, name: 'Clean Code', description: 'Robert C. Martin - Temiz Kod Sanati', price: 249, stock: 50, categoryId: IDS.kitap, isActive: true },
  { _id: IDS.sapiens, name: 'Sapiens', description: 'Yuval Noah Harari - Insan Turunun Kisa Tarihi', price: 129, stock: 150, categoryId: IDS.kitap, isActive: true },
  { _id: IDS.sucVeCeza, name: 'Suc ve Ceza', description: 'Fyodor Dostoyevski - Suc ve Ceza', price: 69, stock: 180, categoryId: IDS.kitap, isActive: true },

  // Ev & Yasam (3)
  { _id: IDS.lamba, name: 'Masa Lambasi', description: 'LED masa lambasi ayarlanabilir isik', price: 349, stock: 45, categoryId: IDS.evYasam, isActive: true },
  { _id: IDS.nevresim, name: 'Nevresim Takimi', description: 'Cift kisilik pamuklu nevresim takimi', price: 599, stock: 70, categoryId: IDS.evYasam, isActive: true },
  { _id: IDS.kahve, name: 'Kahve Makinesi', description: 'Otomatik espresso ve filtre kahve makinesi', price: 2499, stock: 35, categoryId: IDS.evYasam, isActive: true }
];

// === ORDERS (order_db.orders) ===

const defaultAddress = { street: 'Ornek Cad. No: 42', city: 'Istanbul', zip: '34000' };

const orders = [
  {
    _id: IDS.order1,
    userId: IDS.customer1.toString(),
    items: [
      { productId: IDS.iphone.toString(), productName: 'iPhone 15 Pro', quantity: 1, unitPrice: 64999, totalPrice: 64999 }
    ],
    totalAmount: 64999,
    status: 'pending',
    shippingAddress: defaultAddress
  },
  {
    _id: IDS.order2,
    userId: IDS.customer1.toString(),
    items: [
      { productId: IDS.gomlek.toString(), productName: 'Keten Gomlek', quantity: 2, unitPrice: 499, totalPrice: 998 },
      { productId: IDS.jean.toString(), productName: 'Slim Fit Jean', quantity: 1, unitPrice: 699, totalPrice: 699 }
    ],
    totalAmount: 1697,
    status: 'confirmed',
    shippingAddress: defaultAddress
  },
  {
    _id: IDS.order3,
    userId: IDS.customer2.toString(),
    items: [
      { productId: IDS.cleanCode.toString(), productName: 'Clean Code', quantity: 1, unitPrice: 249, totalPrice: 249 },
      { productId: IDS.sapiens.toString(), productName: 'Sapiens', quantity: 2, unitPrice: 129, totalPrice: 258 }
    ],
    totalAmount: 507,
    status: 'shipped',
    shippingAddress: defaultAddress
  },
  {
    _id: IDS.order4,
    userId: IDS.customer2.toString(),
    items: [
      { productId: IDS.macbook.toString(), productName: 'MacBook Air M3', quantity: 1, unitPrice: 49999, totalPrice: 49999 },
      { productId: IDS.ipad.toString(), productName: 'iPad Air', quantity: 1, unitPrice: 27999, totalPrice: 27999 }
    ],
    totalAmount: 77998,
    status: 'delivered',
    shippingAddress: defaultAddress
  },
  {
    _id: IDS.order5,
    userId: IDS.customer1.toString(),
    items: [
      { productId: IDS.kahve.toString(), productName: 'Kahve Makinesi', quantity: 1, unitPrice: 2499, totalPrice: 2499 }
    ],
    totalAmount: 2499,
    status: 'cancelled',
    shippingAddress: defaultAddress
  }
];

module.exports = { IDS, users, categories, products, orders };
