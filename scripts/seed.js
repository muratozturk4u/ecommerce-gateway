const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { users, categories, products, orders } = require('./seed-data');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const SALT_ROUNDS = 10;

async function seedUsers(authDb) {
  console.log('Seeding users...');
  await authDb.collection('users').deleteMany({});

  const hashedUsers = await Promise.all(
    users.map(async (user) => {
      const passwordHash = await bcrypt.hash(user._plainPassword, SALT_ROUNDS);
      return {
        _id: user._id,
        email: user.email,
        passwordHash,
        name: user.name,
        role: user.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    })
  );

  await authDb.collection('users').insertMany(hashedUsers);
  const count = await authDb.collection('users').countDocuments();
  console.log(`  auth_db.users: ${count} records`);
  return count;
}

async function seedCategories(productDb) {
  console.log('Seeding categories...');
  await productDb.collection('categories').deleteMany({});

  const categoriesWithTimestamps = categories.map((cat) => ({
    ...cat,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  await productDb.collection('categories').insertMany(categoriesWithTimestamps);
  const count = await productDb.collection('categories').countDocuments();
  console.log(`  product_db.categories: ${count} records`);
  return count;
}

async function seedProducts(productDb) {
  console.log('Seeding products...');
  await productDb.collection('products').deleteMany({});

  const productsWithTimestamps = products.map((prod) => ({
    ...prod,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  await productDb.collection('products').insertMany(productsWithTimestamps);
  const count = await productDb.collection('products').countDocuments();
  console.log(`  product_db.products: ${count} records`);
  return count;
}

async function seedOrders(orderDb) {
  console.log('Seeding orders...');
  await orderDb.collection('orders').deleteMany({});

  const ordersWithTimestamps = orders.map((order) => ({
    ...order,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  await orderDb.collection('orders').insertMany(ordersWithTimestamps);
  const count = await orderDb.collection('orders').countDocuments();
  console.log(`  order_db.orders: ${count} records`);
  return count;
}

async function verify(authDb, productDb, orderDb, counts) {
  console.log('\n=== VERIFICATION ===');

  // Count checks
  if (counts.users !== 3) throw new Error(`Expected 3 users, got ${counts.users}`);
  if (counts.categories !== 4) throw new Error(`Expected 4 categories, got ${counts.categories}`);
  if (counts.products !== 14) throw new Error(`Expected 14 products, got ${counts.products}`);
  if (counts.orders !== 5) throw new Error(`Expected 5 orders, got ${counts.orders}`);
  console.log('  Record counts: OK');

  // bcrypt verification
  const admin = await authDb.collection('users').findOne({ email: 'admin@seed.com' });
  const isMatch = await bcrypt.compare('admin123', admin.passwordHash);
  if (!isMatch) throw new Error('Admin password hash verification failed');
  console.log('  bcrypt hash verification: OK');

  // Status distribution
  const statuses = await orderDb.collection('orders').distinct('status');
  if (statuses.length !== 5) throw new Error(`Expected 5 distinct statuses, got ${statuses.length}`);
  console.log('  Order status distribution: OK (5 unique statuses)');

  // Referential integrity: orders reference valid userIds
  const userIds = await authDb.collection('users').distinct('_id');
  const orderUserIds = await orderDb.collection('orders').distinct('userId');
  for (const uid of orderUserIds) {
    if (!userIds.some((id) => id.toString() === uid)) {
      throw new Error(`Order references non-existent userId: ${uid}`);
    }
  }
  console.log('  Referential integrity (userId): OK');

  // Referential integrity: products reference valid categoryIds
  const categoryIds = await productDb.collection('categories').distinct('_id');
  const productCategoryIds = await productDb.collection('products').distinct('categoryId');
  for (const cid of productCategoryIds) {
    if (!categoryIds.some((id) => id.toString() === cid.toString())) {
      throw new Error(`Product references non-existent categoryId: ${cid}`);
    }
  }
  console.log('  Referential integrity (categoryId): OK');
}

async function main() {
  console.log('=== SEED STARTING ===');
  console.log(`MongoDB URI: ${MONGODB_URI}`);

  const conn = await mongoose.connect(MONGODB_URI);
  const authDb = conn.connection.useDb('auth_db');
  const productDb = conn.connection.useDb('product_db');
  const orderDb = conn.connection.useDb('order_db');

  try {
    const userCount = await seedUsers(authDb);
    const categoryCount = await seedCategories(productDb);
    const productCount = await seedProducts(productDb);
    const orderCount = await seedOrders(orderDb);

    await verify(authDb, productDb, orderDb, {
      users: userCount,
      categories: categoryCount,
      products: productCount,
      orders: orderCount
    });

    console.log('\n=== SEED COMPLETED ===');
    console.log(`  auth_db.users:          ${userCount}`);
    console.log(`  product_db.categories:  ${categoryCount}`);
    console.log(`  product_db.products:   ${productCount}`);
    console.log(`  order_db.orders:        ${orderCount}`);
    console.log('======================');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
