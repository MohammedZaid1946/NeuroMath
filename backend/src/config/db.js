import mongoose from 'mongoose';
import User from '../models/User.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/neuromath');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Seed default Admin user if none exists
    await seedAdminUser();
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const seedAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('No Admin user found. Seeding default Admin user...');
      
      const adminData = {
        name: 'Admin',
        email: 'admin@neuromath.ai',
        password: 'Admin@NeuroMath123',
        role: 'admin',
      };
      
      const admin = await User.create(adminData);
      console.log(`Default Admin user seeded successfully!`);
      console.log(`Email: ${admin.email}`);
      console.log(`Password: Admin@NeuroMath123`);
    } else {
      console.log('Admin user already exists in the database.');
    }
  } catch (error) {
    console.error(`Error seeding Admin user: ${error.message}`);
  }
};

export default connectDB;
