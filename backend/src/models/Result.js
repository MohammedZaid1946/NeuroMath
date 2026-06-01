import mongoose from 'mongoose';

const resultBlockerSchema = new mongoose.Schema({
  blocker_name: { type: String, required: true },
  error_count: { type: Number, required: true }
});

const resultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  testSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSession',
    required: true,
  },
  dyscalculiaProbability: {
    type: Number,
    required: true, // E.g., 0-100 percentage
  },
  finalClassification: {
    type: String,
    enum: ['severe', 'moderate', 'mild', 'none'],
    required: true,
  },
  strengths: {
    type: [String],
    default: [],
  },
  weaknesses: {
    type: [String],
    default: [],
  },
  blockers: {
    type: [resultBlockerSchema],
    default: [],
  },
  recommendations: {
    type: [String],
    default: [],
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const Result = mongoose.model('Result', resultSchema);
export default Result;
