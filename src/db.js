import mongoose from 'mongoose';

export async function connectDb({ mongoUri, mongoDb }) {
  if (!mongoUri || !mongoDb) throw new Error('MONGO_URI / MONGO_DB missing');
  const uri = mongoUri.endsWith('/') ? mongoUri.slice(0, -1) : mongoUri;
  const full = uri.includes('mongodb://') || uri.includes('mongodb+srv://') ? uri : `mongodb://${uri}`;
  await mongoose.connect(full, { dbName: mongoDb });
  console.log('[DB] connected');
}
