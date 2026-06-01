import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Please add the question text'],
    trim: true,
  },
  options: {
    type: [String],
    default: [], // Optional options (useful if multiple choice, otherwise text response)
  },
  correctAnswer: {
    type: String,
    required: [true, 'Please add the correct answer'],
    trim: true,
  },
  difficulty: {
    type: Number,
    required: [true, 'Please add difficulty level (1-5)'],
    min: 1,
    max: 5,
  },
  category: {
    type: String,
    required: [true, 'Please specify the category/construct tested'],
    trim: true, // E.g., 'Number Sense', 'Place Value', 'Basic Arithmetic', 'Pattern Recognition', 'Spatial Reasoning', 'Working Memory'
  },
  generatedByGemini: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Question = mongoose.model('Question', questionSchema);
export default Question;
