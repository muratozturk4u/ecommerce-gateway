const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { users, categories } = require('./seed-data');

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

async function main() {
  console.log('=== SEED STARTING ===');
  console.log(`MongoDB URI: ${MONGODB_URI}`);

  const conn = await mongoose.connect(MONGODB_URI);
  const authDb = conn.connection.useDb('auth_db');
  const productDb = conn.connection.useDb('product_db');

  try {
    const userCount = await seedUsers(authDb);
    const categoryCount = await seedCategories(productDb);

    // Verification
    console.log('\n=== VERIFICATION ===');

    if (userCount !== 3) throw new Error(`Expected 3 users, got ${userCount}`);
    if (categoryCount !== 4) throw new Error(`Expected 4 categories, got ${categoryCount}`);

    // bcrypt verification
    const admin = await authDb.collection('users').findOne({ email: 'admin@seed.com' });
    const isMatch = await bcrypt.compare('admin123', admin.passwordHash);
    if (!isMatch) throw new Error('Admin password hash verification failed');
    console.log('  bcrypt hash verification: OK');

    console.log('\n=== SEED COMPLETED (Phase 1/2) ===');
    console.log(`  auth_db.users:          ${userCount}`);
    console.log(`  product_db.categories:  ${categoryCount}`);
    console.log('=================================');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
