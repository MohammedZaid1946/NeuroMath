import express from 'express';
import {
  startTest,
  getCurrentTest,
  saveProgress,
  submitTest,
  deleteUnfinishedTest,
} from '../controllers/testController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All test routes are protected and restricted to student role
router.use(protect);
router.use(authorize('student'));

router.post('/start', startTest);
router.get('/current', getCurrentTest);
router.post('/save-progress', saveProgress);
router.post('/submit', submitTest);
router.delete('/unfinished/:id', deleteUnfinishedTest);

export default router;
