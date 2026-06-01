import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please enter an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please enter a password'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student',
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  classCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcryptjs and auto-generate class codes for teachers
userSchema.pre('save', async function (next) {
  // 1. Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // 2. Generate class code if user is a teacher and doesn't have one
  if (this.role === 'teacher' && !this.classCode) {
    let code;
    let codeExists = true;
    
    while (codeExists) {
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omit similar characters (O, 0, I, 1)
      let randomPart = '';
      for (let i = 0; i < 4; i++) {
        randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      code = `NM-${randomPart}`;
      
      // Use constructor to find existing user with this code without circular references
      const user = await this.constructor.findOne({ classCode: code });
      if (!user) {
        codeExists = false;
      }
    }
    
    this.classCode = code;
  }

  next();
});

const User = mongoose.model('User', userSchema);
export default User;
