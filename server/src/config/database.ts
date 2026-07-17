import mongoose from 'mongoose';

let _mongoServer: any = null;

async function startInMemoryMongo(): Promise<string> {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  _mongoServer = await MongoMemoryServer.create();
  const uri = _mongoServer.getUri();
  console.log('Using in-memory MongoDB at:', uri);
  return uri;
}

export async function connectDatabase(): Promise<void> {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/passco';

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected successfully');
    return;
  } catch {
    console.log('Local MongoDB not available, starting in-memory MongoDB...');
  }

  try {
    uri = await startInMemoryMongo();
    await mongoose.connect(uri);
    console.log('In-memory MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to start in-memory MongoDB:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (_mongoServer) {
    await _mongoServer.stop();
  }
}
