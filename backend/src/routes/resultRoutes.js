import express from 'express';
import {
  getStudentResults,
  getTeacherAllResults,
  getTeacherStudentResults,
} from '../controllers/resultController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All result routes require authentication
router.use(protect);

// Students, Teachers, and Admins can query student results (controller enforces student self-view only)
router.get('/student/:id', getStudentResults);

// Teacher and Admin only endpoints
router.get('/teacher/all', authorize('teacher', 'admin'), getTeacherAllResults);
router.get('/teacher/student/:id', authorize('teacher', 'admin'), getTeacherStudentResults);

export default router;
