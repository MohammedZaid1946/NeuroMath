import mongoose from 'mongoose';

const questionItemSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: { type: [String], default: [] },
  correctAnswer: { type: String, required: true },
  difficulty: { type: Number, required: true },
  category: { type: String, required: true },
  generatedByGemini: { type: Boolean, default: true }
});

const responseItemSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true },
  questionText: { type: String, required: true },
  userAnswer: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  construct: { type: String, required: true },
  difficultyLevel: { type: Number, required: true }
});

const blockerItemSchema = new mongoose.Schema({
  blocker_name: { type: String, required: true },
  error_count: { type: Number, required: true },
  is_confirmed: { type: Boolean, default: false }
});

const testSessionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ageAtTest: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    default: 10,
  },
  score: {
    type: Number,
    default: 0,
  },
  questionsList: {
    type: [questionItemSchema],
    default: [],
  },
  responses: {
    type: [responseItemSchema],
    default: [],
  },
  blockers: {
    type: [blockerItemSchema],
    default: [],
  },
  analysisResult: {
    type: mongoose.Schema.Types.Mixed, // Stores the complete remediation roadmap & severity summary
  },
}, {
  timestamps: true,
});

const TestSession = mongoose.model('TestSession', testSessionSchema);
export default TestSession;
