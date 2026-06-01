import TestSession from '../models/TestSession.js';
import Result from '../models/Result.js';
import * as geminiService from '../services/geminiService.js';

// @desc    Start a new diagnostic test session
// @route   POST /api/tests/start
// @access  Private (Student)
export const startTest = async (req, res) => {
  const { age } = req.body;

  try {
    if (!age || age < 5) {
      return res.status(400).json({ success: false, error: 'Please provide a valid student age (5+)' });
    }

    // Check if there's already an active test session for this student
    const activeSession = await TestSession.findOne({
      studentId: req.user._id,
      status: 'in_progress',
    });

    if (activeSession) {
      return res.json({
        success: true,
        message: 'Resuming active session',
        data: activeSession,
      });
    }

    console.log(`Starting new test session for student: ${req.user.name}, age: ${age}`);

    // Generate initial 10 questions using the adaptive service
    const questions = await geminiService.generateQuestions(age, [], 10);

    const session = await TestSession.create({
      studentId: req.user._id,
      ageAtTest: age,
      status: 'in_progress',
      currentQuestionIndex: 0,
      totalQuestions: 10,
      questionsList: questions.map(q => ({
        questionText: q.questionText,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        difficulty: q.difficultyLevel || 2,
        category: q.construct,
      })),
      responses: [],
      blockers: [],
    });

    return res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Start Test Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get the current active test session for logged-in student
// @route   GET /api/tests/current
// @access  Private (Student)
export const getCurrentTest = async (req, res) => {
  try {
    const session = await TestSession.findOne({
      studentId: req.user._id,
      status: 'in_progress',
    });

    return res.json({
      success: true,
      data: session || null,
    });
  } catch (error) {
    console.error('Get Current Test Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Autosave student progress & trigger blockers / confirmatory questions
// @route   POST /api/tests/save-progress
// @access  Private (Student)
export const saveProgress = async (req, res) => {
  const {
    testSessionId,
    questionNumber,
    questionText,
    userAnswer,
    correctAnswer,
    isCorrect,
    construct,
    difficultyLevel,
  } = req.body;

  try {
    const session = await TestSession.findById(testSessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Test session not found' });
    }

    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this session' });
    }

    // Check if this question number has already been answered to avoid duplicates
    const responseExists = session.responses.some(r => r.questionNumber === questionNumber);

    if (!responseExists) {
      session.responses.push({
        questionNumber,
        questionText,
        userAnswer,
        correctAnswer,
        isCorrect,
        construct,
        difficultyLevel,
      });
    } else {
      // Update existing response
      const idx = session.responses.findIndex(r => r.questionNumber === questionNumber);
      session.responses[idx] = {
        questionNumber,
        questionText,
        userAnswer,
        correctAnswer,
        isCorrect,
        construct,
        difficultyLevel,
      };
    }

    // Update current index (index is 0-based, so after answering question #N, index is N)
    session.currentQuestionIndex = questionNumber;
    session.updatedAt = Date.now();

    // Check if we just completed Question 10 (end of main test)
    if (questionNumber === 10) {
      console.log('Main test complete. Running rule-based blocker detection...');

      // Count errors per construct
      const constructErrors = {};
      session.responses.forEach(r => {
        if (!r.isCorrect) {
          constructErrors[r.construct] = (constructErrors[r.construct] || 0) + 1;
        }
      });

      // Detect blockers (2+ errors in the same construct)
      const detectedBlockers = [];
      Object.entries(constructErrors).forEach(([name, count]) => {
        if (count >= 2) {
          detectedBlockers.push({
            blocker_name: name,
            error_count: count,
            is_confirmed: false,
          });
        }
      });

      session.blockers = detectedBlockers;

      if (detectedBlockers.length > 0) {
        console.log(`Blockers detected: ${detectedBlockers.map(b => b.blocker_name).join(', ')}`);
        console.log('Generating confirmatory questions focusing on primary blocker...');

        const primaryBlocker = detectedBlockers[0].blocker_name;
        
        try {
          const confirmatoryQuestions = await geminiService.generateConfirmatoryQuestions(
            session.ageAtTest,
            primaryBlocker
          );

          // Append 5 confirmatory questions to the session
          const startingIndex = session.questionsList.length;
          confirmatoryQuestions.forEach((q, i) => {
            session.questionsList.push({
              questionText: q.questionText,
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              difficulty: q.difficultyLevel || 3,
              category: q.construct,
            });
          });

          session.totalQuestions = startingIndex + confirmatoryQuestions.length; // usually 15
        } catch (apiErr) {
          console.error('Failed to generate confirmatory questions via Gemini, continuing with 10 questions.', apiErr.message);
        }
      } else {
        console.log('No blockers detected. Session will complete at 10 questions.');
      }
    }

    await session.save();

    return res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Save Progress Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Submit final diagnostic responses and trigger AI engine roadmap
// @route   POST /api/tests/submit
// @access  Private (Student)
export const submitTest = async (req, res) => {
  const { testSessionId } = req.body;

  try {
    const session = await TestSession.findById(testSessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Test session not found' });
    }

    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to submit this session' });
    }

    console.log(`Submitting test session: ${testSessionId} for student: ${req.user.name}`);

    // Mark as completed
    session.status = 'completed';
    session.completedAt = Date.now();

    // Calculate score
    const correctCount = session.responses.filter(r => r.isCorrect).length;
    session.score = correctCount;

    // Confirm blockers if they have confirmatory errors
    if (session.blockers.length > 0) {
      session.blockers.forEach(b => {
        b.is_confirmed = true;
      });
    }

    // Generate comprehensive remediation roadmap via Gemini
    const roadmap = await geminiService.generateRoadmap(
      session.ageAtTest,
      session.blockers,
      session.responses
    );

    session.analysisResult = roadmap;
    await session.save();

    // Calculate dyscalculia probability based on severity
    let probability = 10; // None
    if (roadmap.overallSeverity === 'severe') probability = 85;
    else if (roadmap.overallSeverity === 'moderate') probability = 55;
    else if (roadmap.overallSeverity === 'mild') probability = 30;

    // Determine strengths & weaknesses based on category accuracies
    const categoryStats = {};
    session.responses.forEach(r => {
      if (!categoryStats[r.construct]) {
        categoryStats[r.construct] = { total: 0, correct: 0 };
      }
      categoryStats[r.construct].total += 1;
      if (r.isCorrect) {
        categoryStats[r.construct].correct += 1;
      }
    });

    const strengths = [];
    const weaknesses = [];

    Object.entries(categoryStats).forEach(([cat, stats]) => {
      const accuracy = stats.correct / stats.total;
      if (accuracy >= 0.8) {
        strengths.push(cat);
      } else if (accuracy <= 0.4) {
        weaknesses.push(cat);
      }
    });

    // Create primary Result object in the database
    const result = await Result.create({
      studentId: req.user._id,
      testSessionId: session._id,
      dyscalculiaProbability: probability,
      finalClassification: roadmap.overallSeverity,
      strengths,
      weaknesses: weaknesses.length > 0 ? weaknesses : (session.blockers.length > 0 ? session.blockers.map(b => b.blocker_name) : []),
      blockers: session.blockers.map(b => ({
        blocker_name: b.blocker_name,
        error_count: b.error_count
      })),
      recommendations: roadmap.steps.map(s => `Step ${s.stepNumber} [${s.title}]: ${s.executionPlan} (Resources: ${s.resources.join(', ')})`),
    });

    return res.json({
      success: true,
      message: 'Assessment completed and analyzed successfully!',
      data: {
        session,
        result,
      },
    });
  } catch (error) {
    console.error('Submit Test Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete an unfinished test session and responses
// @route   DELETE /api/tests/unfinished/:id
// @access  Private (Student)
export const deleteUnfinishedTest = async (req, res) => {
  try {
    const session = await TestSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Test session not found' });
    }

    if (session.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this session' });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({ success: false, error: 'Only in-progress test sessions can be deleted' });
    }

    // Delete session from database
    await TestSession.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Incomplete test session deleted successfully',
    });
  } catch (error) {
    console.error('Delete Unfinished Test Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
