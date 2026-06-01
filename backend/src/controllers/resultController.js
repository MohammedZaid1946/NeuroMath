import Result from '../models/Result.js';
import TestSession from '../models/TestSession.js';
import User from '../models/User.js';

// @desc    Get past test results history for a student
// @route   GET /api/results/student/:id
// @access  Private (Student/Teacher/Admin)
export const getStudentResults = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Students can only view their own history
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ success: false, error: 'Not authorized to view other students\' history' });
    }

    const results = await Result.find({ studentId })
      .populate('testSessionId')
      .sort({ generatedAt: -1 });

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Get Student Results Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all students' assessment results (Teacher/Admin only)
// @route   GET /api/results/teacher/all
// @access  Private (Teacher/Admin)
export const getTeacherAllResults = async (req, res) => {
  try {
    let query = {};

    // If the logged-in user is a Teacher, isolate results to only their joined students
    if (req.user.role === 'teacher') {
      const students = await User.find({ teacherId: req.user._id }).select('_id');
      const studentIds = students.map(s => s._id);
      
      // Only find results belonging to those students
      query = { studentId: { $in: studentIds } };
    }

    // Find results, populate student user details and test session details
    const results = await Result.find(query)
      .populate('studentId', 'name email')
      .populate('testSessionId')
      .sort({ generatedAt: -1 });

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Get Teacher All Results Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get detailed diagnostic results for a specific student (Teacher/Admin only)
// @route   GET /api/results/teacher/student/:id
// @access  Private (Teacher/Admin)
export const getTeacherStudentResults = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Verify student exists
    const student = await User.findById(studentId).select('name email role teacherId');
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // If logged in as a Teacher, verify that this student is joined to their classroom
    if (req.user.role === 'teacher') {
      if (!student.teacherId || student.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, error: 'Not authorized to view diagnostics of a student outside your classroom' });
      }
    }

    const results = await Result.find({ studentId })
      .populate('testSessionId')
      .sort({ generatedAt: -1 });

    return res.json({
      success: true,
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
        },
        results,
      },
    });
  } catch (error) {
    console.error('Get Teacher Student Results Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
