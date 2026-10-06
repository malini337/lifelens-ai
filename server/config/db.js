// Connects Mongoose to MongoDB Atlas. The connection string is never printed.
const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('Check MONGO_URI, your database user/password, and that your IP address is allowed in Atlas > Network Access.');
    process.exit(1);
  }
}

module.exports = connectDB;
