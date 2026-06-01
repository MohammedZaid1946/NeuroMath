import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'neuromath_development_jwt_secret_token_1234567890_abcdefgh',
    { expiresIn: '30d' }
  );
};

// Helper to generate a unique Class Code for Teachers (e.g. NM-X9Y2)
const generateClassCode = async () => {
  let code;
  let codeExists = true;
  
  while (codeExists) {
    // Generate a 4-character random alphanumeric string
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omit similar characters (O, 0, I, 1)
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    code = `NM-${randomPart}`;
    
    // Verify uniqueness
    const user = await User.findOne({ classCode: code });
    if (!user) {
      codeExists = false;
    }
  }
  
  return code;
};

// @desc    Register a new student
// @route   POST /api/auth/register
// @access  Public
export const registerStudent = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists with this email' });
    }

    // Force role to student (do not allow setting admin or teacher in public register)
    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
    });

    if (user) {
      return res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        },
      });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register Student Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a teacher account (Admin only)
// @route   POST /api/auth/admin/create-teacher
// @access  Private/Admin
export const createTeacher = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide name, email, and password' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, error: 'A user already exists with this email' });
    }

    // Auto-generate a unique Class Code for this teacher
    const classCode = await generateClassCode();

    // Force role to teacher
    const teacher = await User.create({
      name,
      email,
      password,
      role: 'teacher',
      classCode,
    });

    if (teacher) {
      return res.status(201).json({
        success: true,
        message: 'Teacher account created successfully',
        data: {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          role: teacher.role,
          classCode: teacher.classCode,
          createdAt: teacher.createdAt,
        },
      });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid teacher data' });
    }
  } catch (error) {
    console.error('Create Teacher Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Auth user & get token (Unified Login)
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      return res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          classCode: user.classCode,
          token: generateToken(user._id),
        },
      });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('teacherId', 'name email');
    if (user) {
      return res.json({ success: true, data: user });
    } else {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    console.error('Get Profile Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all teachers (Admin only)
// @route   GET /api/auth/admin/teachers
// @access  Private/Admin
export const getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('-password').sort({ createdAt: -1 });
    return res.json({ success: true, data: teachers });
  } catch (error) {
    console.error('Get Teachers Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Join a classroom using a Class Code (Student only)
// @route   POST /api/auth/join-class
// @access  Private/Student
export const joinClass = async (req, res) => {
  const { classCode } = req.body;

  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only student accounts can join a classroom' });
    }

    if (!classCode) {
      return res.status(400).json({ success: false, error: 'Please provide the unique Class Code' });
    }

    // Find the teacher by Class Code
    const teacher = await User.findOne({
      classCode: classCode.toUpperCase().trim(),
      role: 'teacher',
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'No classroom found with this Class Code' });
    }

    // Link the student to this teacher
    req.user.teacherId = teacher._id;
    await req.user.save();

    // Fetch the updated populated user profile
    const updatedUser = await User.findById(req.user._id).select('-password').populate('teacherId', 'name email');

    return res.json({
      success: true,
      message: `Successfully joined ${teacher.name}'s classroom!`,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Join Class Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
