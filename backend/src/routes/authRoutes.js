import express from 'express';
import {
  registerStudent,
  createTeacher,
  login,
  getMe,
  getTeachers,
  joinClass,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public auth routes
router.post('/register', registerStudent);
router.post('/login', login);

// Protected routes (any role)
router.get('/me', protect, getMe);

// Student-only classroom routes
router.post('/join-class', protect, authorize('student'), joinClass);

// Admin-only routes
router.post('/admin/create-teacher', protect, authorize('admin'), createTeacher);
router.get('/admin/teachers', protect, authorize('admin'), getTeachers);

export default router;
