import mongoose from 'mongoose';
import { createApp } from './app';
import { Config } from './config';

const start = async (): Promise<void> => {
  await mongoose.connect(Config.MONGODB_URI);
  console.log(`Connected to MongoDB: ${Config.MONGODB_URI}`);

  const app = createApp();
  app.listen(Config.PORT, () => {
    console.log(`${Config.SERVICE_NAME} running on port ${Config.PORT}`);
  });
};

start().catch((error: Error) => {
  console.error(`Failed to start ${Config.SERVICE_NAME}:`, error);
  process.exit(1);
});
