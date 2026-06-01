import Question from '../models/Question.js';
import TestSession from '../models/TestSession.js';

// Pre-defined high-quality offline fallbacks for diagnostics (if Gemini key is missing or calls fail)
const FALLBACK_QUESTIONS = [
  {
    questionText: "Which number is larger: 58 or 85?",
    correctAnswer: "85",
    category: "Number Sense",
    difficulty: 1,
    generatedByGemini: false
  },
  {
    questionText: "What is the value of the 7 in the number 372?",
    correctAnswer: "70",
    category: "Place Value",
    difficulty: 2,
    generatedByGemini: false
  },
  {
    questionText: "If you have 15 apples and give 7 away, how many do you have left?",
    correctAnswer: "8",
    category: "Basic Arithmetic",
    difficulty: 1,
    generatedByGemini: false
  },
  {
    questionText: "Complete the pattern: 3, 6, 9, 12, __",
    correctAnswer: "15",
    category: "Pattern Recognition",
    difficulty: 2,
    generatedByGemini: false
  },
  {
    questionText: "If a triangle is folded in half, how many corners does it have now?",
    correctAnswer: "3",
    category: "Spatial Reasoning",
    difficulty: 3,
    generatedByGemini: false
  },
  {
    questionText: "Remember these numbers: 4, 9, 2. Add the first and last number together. What is the sum?",
    correctAnswer: "6",
    category: "Working Memory",
    difficulty: 2,
    generatedByGemini: false
  },
  {
    questionText: "Which is closer to 100: 89 or 112?",
    correctAnswer: "89",
    category: "Number Sense",
    difficulty: 2,
    generatedByGemini: false
  },
  {
    questionText: "What is 45 + 37?",
    correctAnswer: "82",
    category: "Basic Arithmetic",
    difficulty: 2,
    generatedByGemini: false
  },
  {
    questionText: "Complete the pattern: 2, 4, 8, 16, __",
    correctAnswer: "32",
    category: "Pattern Recognition",
    difficulty: 3,
    generatedByGemini: false
  },
  {
    questionText: "In the number 8,432, which digit is in the hundreds place?",
    correctAnswer: "4",
    category: "Place Value",
    difficulty: 3,
    generatedByGemini: false
  }
];

const FALLBACK_CONFIRMATORY = {
  "Number Sense": [
    { questionText: "Which is larger: 0.6 or 0.45?", correctAnswer: "0.6", category: "Number Sense", difficulty: 3 },
    { questionText: "What number represents three quarters?", correctAnswer: "0.75", category: "Number Sense", difficulty: 3 },
    { questionText: "Which number is smaller: -5 or -2?", correctAnswer: "-5", category: "Number Sense", difficulty: 2 },
    { questionText: "Estimate the sum of 98 and 104 to the nearest ten.", correctAnswer: "200", category: "Number Sense", difficulty: 2 },
    { questionText: "Arrange from smallest to largest: 1/2, 1/4, 3/4.", correctAnswer: "1/4, 1/2, 3/4", category: "Number Sense", difficulty: 3 }
  ],
  "Place Value": [
    { questionText: "Write forty-five hundredths as a decimal.", correctAnswer: "0.45", category: "Place Value", difficulty: 3 },
    { questionText: "In 7.89, what place value is the 9?", correctAnswer: "hundredths", category: "Place Value", difficulty: 3 },
    { questionText: "How many tens are in 230?", correctAnswer: "23", category: "Place Value", difficulty: 2 },
    { questionText: "What is 10 times 340?", correctAnswer: "3400", category: "Place Value", difficulty: 2 },
    { questionText: "What is 5,000 + 400 + 8?", correctAnswer: "5408", category: "Place Value", difficulty: 2 }
  ]
};

// Main API call wrapper supporting Gemini API and Lovable Gateway
async function callAI(systemPrompt, userPrompt) {
  let GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
  let LOVABLE_API_KEY = (process.env.LOVABLE_API_KEY || "").trim();

  // Robust Self-Correction:
  // If GEMINI_API_KEY starts with 'AQ.', it's actually a Lovable AI Gateway key
  if (GEMINI_API_KEY.startsWith("AQ.") && !LOVABLE_API_KEY) {
    console.log("Auto-detected Lovable AI key in GEMINI_API_KEY field. Swapping to Lovable AI Gateway...");
    LOVABLE_API_KEY = GEMINI_API_KEY;
    GEMINI_API_KEY = "";
  }
  // If LOVABLE_API_KEY starts with 'AIzaSy', it's actually an official Google Gemini API key
  else if (LOVABLE_API_KEY.startsWith("AIzaSy") && !GEMINI_API_KEY) {
    console.log("Auto-detected Google Gemini key in LOVABLE_API_KEY field. Swapping to official Google Gemini API...");
    GEMINI_API_KEY = LOVABLE_API_KEY;
    LOVABLE_API_KEY = "";
  }

  if (GEMINI_API_KEY) {
    try {
      console.log("Calling official Google Gemini API (gemini-2.5-flash)...");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nUser Request: ${userPrompt}` }]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
      } else {
        const errText = await response.text();
        console.warn(`Gemini API returned status ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.error("Failed to query official Gemini API:", err.message);
    }
  }

  if (LOVABLE_API_KEY) {
    try {
      console.log("Calling Lovable AI Gateway...");
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      } else {
        const errText = await response.text();
        console.warn(`Lovable AI Gateway returned status ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.error("Failed to query Lovable AI Gateway:", err.message);
    }
  }

  throw new Error("No active AI configurations or services responded.");
}

/**
 * Generates questions adaptive to age and history, utilising Mongoose cache as fallback
 */
export const generateQuestions = async (age, errorHistory = [], count = 10) => {
  try {
    const categories = ['Number Sense', 'Place Value', 'Basic Arithmetic', 'Pattern Recognition', 'Spatial Reasoning', 'Working Memory'];
    
    // Determine target difficulties based on student's age group
    let targetDifficulties = [2, 3]; // Default: Primary School (Ages 8-11)
    let ageSpecificPrompt = '';
    let targetDifficultyDescription = '';
    
    if (age <= 7) {
      targetDifficulties = [1, 2]; // Early Childhood (Ages 5-7)
      targetDifficultyDescription = "difficulty level 1 to 2 (easy/concrete)";
      ageSpecificPrompt = `
      - Keep questions highly concrete, visual, and extremely simple.
      - Use child-friendly items (e.g., apples, toys, blocks, balls).
      - Numbers must remain under 20.
      - Do NOT use abstract decimals, fractions, negative numbers, or large numbers.
      - Examples: 'If you have 4 apples and get 2 more, how many do you have?', 'Which number is smaller: 5 or 9?'`;
    } else if (age >= 8 && age <= 11) {
      targetDifficulties = [2, 3]; // Primary School (Ages 8-11)
      targetDifficultyDescription = "difficulty level 2 to 3 (medium/primary school)";
      ageSpecificPrompt = `
      - Questions should cover standard primary school concepts.
      - Cover place value up to hundreds, double-digit addition/subtraction, skip counting, and basic geometric shapes.
      - Keep word problems simple and clear.
      - Do NOT use advanced decimals, fractions, or negative numbers.
      - Examples: 'What is the value of the 7 in 372?', 'What is 45 + 37?', 'Complete the pattern: 3, 6, 9, 12, __'`;
    } else {
      targetDifficulties = [3, 4, 5]; // Middle School & Above (Ages 12+)
      targetDifficultyDescription = "difficulty level 3 to 5 (advanced/abstract)";
      ageSpecificPrompt = `
      - Questions must be abstract and appropriate for older students, middle schoolers, or high schoolers.
      - Include concepts like decimals, fractions, percentages, negative numbers, multi-step spatial reasoning, and working memory tasks.
      - Avoid trivial, childish, or overly simplistic questions.
      - Examples: 'Which is larger: 0.6 or 0.45?', 'Which number is smaller: -5 or -2?', 'Arrange in order: 1/4, 1/2, 3/4'`;
    }

    // Call Gemini API to generate questions with strict age-appropriate instructions FIRST
    const errorContext = errorHistory.length > 0
      ? `The student has struggled with: ${errorHistory.map(e => e.construct).join(', ')}. Adjust difficulty accordingly.`
      : '';
 
    const systemPrompt = `You are a dyscalculia diagnostic expert. Generate ${count} adaptive math question${count > 1 ? 's' : ''} specifically designed for a ${age}-year-old student.
    
    The target difficulty for this student's age group is: ${targetDifficultyDescription}.
    
    Strict Age-Appropriate Guidelines:
    ${ageSpecificPrompt}
    
    ${errorContext}
    
    Each question should test one of these mathematical constructs:
    - Number Sense (magnitude comparison, number line understanding)
    - Place Value (understanding tens, hundreds, etc.)
    - Basic Arithmetic (addition, subtraction appropriate for age)
    - Pattern Recognition
    - Spatial Reasoning
    - Working Memory (multi-step problems)
    
    Return ONLY a JSON array with this exact structure:
    [
      {
        "questionText": "Clear question text",
        "correctAnswer": "The correct answer",
        "construct": "Construct being tested (must be exactly one of: 'Number Sense', 'Place Value', 'Basic Arithmetic', 'Pattern Recognition', 'Spatial Reasoning', 'Working Memory')",
        "difficultyLevel": 1-5
      }
    ]
    
    Make sure questions vary in difficulty and test different constructs.`;

    try {
      console.log(`Calling AI API to generate ${count} adaptive questions for age ${age}...`);
      const rawResponse = await callAI(systemPrompt, `Generate ${count} diagnostic math questions for age ${age}.`);
      
      const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Failed to extract JSON array from Gemini response.");
      
      const generated = JSON.parse(jsonMatch[0]);
      
      // Cache the generated questions in the background
      for (const q of generated) {
        try {
          await Question.create({
            questionText: q.questionText,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            category: q.construct,
            difficulty: q.difficultyLevel || 2,
            generatedByGemini: true
          });
        } catch (cacheErr) {
          console.error("Error caching question in MongoDB:", cacheErr.message);
        }
      }

      return generated;
    } catch (apiError) {
      console.warn(`AI Question generation failed, falling back to local DB cache. Reason: ${apiError.message}`);

      // FALLBACK 1: Try local MongoDB cache matching the targeted difficulties
      const cachedQuestions = await Question.find({
        difficulty: { $in: targetDifficulties }
      });
      
      if (cachedQuestions.length >= count) {
        console.log(`Fallback Success: Found sufficient targeted questions (difficulties: ${targetDifficulties.join(', ')}) in local MongoDB cache for age ${age}!`);
        // Shuffle and pick
        const shuffled = cachedQuestions.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map(q => ({
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          construct: q.category,
          difficultyLevel: q.difficulty
        }));
      }

      // If local DB doesn't have enough, throw to trigger hardcoded offline fallbacks
      throw new Error("Local MongoDB cache has insufficient questions.");
    }
  } catch (error) {
    console.error("GeminiService: generateQuestions failed, returning high-quality offline fallbacks. Reason:", error.message);
    
    // FALLBACK 2: Returns our pre-defined high-quality offline fallback questions
    const shuffled = [...FALLBACK_QUESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(q => ({
      questionText: q.questionText,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      construct: q.category,
      difficultyLevel: q.difficulty
    }));
  }
};

/**
 * Generates 5 confirmatory questions focusing on a specific blocker, utilizing local cache as fallback
 */
export const generateConfirmatoryQuestions = async (age, blockerName) => {
  try {
    const systemPrompt = `You are a dyscalculia diagnostic expert. Generate 5 confirmatory test questions specifically targeting "${blockerName}" for a ${age}-year-old student.

These questions should deeply probe this specific deficit area to confirm the diagnosis.

Return ONLY a JSON array with 5 objects, each having this exact structure:
[
  {
    "questionText": "Clear question text",
    "correctAnswer": "The correct answer",
    "construct": "${blockerName}",
    "difficultyLevel": 1-5
  }
]`;

    try {
      console.log(`Calling AI API to generate 5 confirmatory questions for '${blockerName}' (age ${age})...`);
      const rawResponse = await callAI(systemPrompt, `Generate 5 confirmatory questions for ${blockerName}.`);
      const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Failed to extract JSON array from Gemini response.");

      const generated = JSON.parse(jsonMatch[0]);

      // Cache in database in background
      for (const q of generated) {
        try {
          await Question.create({
            questionText: q.questionText,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            category: q.construct,
            difficulty: q.difficultyLevel || 3,
            generatedByGemini: true
          });
        } catch (cacheErr) {
          console.error("Error caching confirmatory question:", cacheErr.message);
        }
      }

      return generated;
    } catch (apiError) {
      console.warn(`AI Confirmatory generation failed for '${blockerName}', falling back to local DB cache. Reason: ${apiError.message}`);

      // FALLBACK 1: Attempt cache check
      const cached = await Question.find({ category: blockerName });
      if (cached.length >= 5) {
        console.log(`Fallback Success: Found sufficient confirmatory questions for blocker '${blockerName}' in cache!`);
        const shuffled = cached.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 5).map(q => ({
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          construct: q.category,
          difficultyLevel: q.difficulty
        }));
      }

      throw new Error("Local MongoDB cache has insufficient confirmatory questions.");
    }
  } catch (error) {
    console.error(`GeminiService: generateConfirmatory failed for '${blockerName}', returning hardcoded fallbacks.`, error.message);
    
    // FALLBACK 2: Returns our pre-defined high-quality offline confirmatory fallbacks
    const fallbackList = FALLBACK_CONFIRMATORY[blockerName] || FALLBACK_CONFIRMATORY["Number Sense"];
    return fallbackList.map(q => ({
      questionText: q.questionText,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      construct: q.category,
      difficultyLevel: q.difficulty
    }));
  }
};

/**
 * Generates personalized remediation roadmap and diagnostic summary
 */
export const generateRoadmap = async (age, blockers, responses) => {
  const severity = blockers.length >= 3 ? "severe" : blockers.length >= 2 ? "moderate" : blockers.length >= 1 ? "mild" : "none";
  const blockerNames = blockers.map(b => b.blocker_name);

  try {
    const blockersText = blockers.map(b => `${b.blocker_name} (${b.error_count} errors)`).join(', ');
    
    // Format the individual responses with questions, student answers, correct answers, and results
    const responsesText = responses.map(r => 
      `Question ${r.questionNumber}: "${r.questionText}"
       - Student Answer: "${r.userAnswer}"
       - Correct Answer: "${r.correctAnswer}"
       - Result: ${r.isCorrect ? 'Correct' : 'Incorrect'}
       - Construct: ${r.construct}
       - Difficulty Level: ${r.difficultyLevel}`
    ).join('\n\n');

    const systemPrompt = `You are an expert dyscalculia remediation specialist. Based on the detailed diagnostic test results and student answers below, create a highly personalized 5-step remediation roadmap.
    
    Student Profile:
    - Age: ${age} years old
    - Detected Blockers: ${blockersText}
    - Total Test Responses: ${responses.length}
    
    Detailed Test Responses List:
    ${responsesText}
    
    Create a comprehensive, actionable 5-step roadmap customized exactly to the cognitive mistakes, patterns of errors, and constructs the student struggled with. Each step must include:
    1. A clear, actionable goal title
    2. Detailed execution plan (day-wise or weekly breakdown)
    3. Specific resource/tool recommendations (apps, websites, worksheets, manipulatives)

Return ONLY a JSON object with this exact structure:
{
  "overallSeverity": "none" | "mild" | "moderate" | "severe",
  "summary": "Brief assessment summary",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Actionable goal title",
      "executionPlan": "Detailed day-wise/weekly plan",
      "resources": ["Specific resource 1", "Specific resource 2"]
    },
    // ... 5 steps total
  ]
}`;

    console.log(`Calling AI API to generate dynamic remediation roadmap for age ${age} (${severity} severity)...`);
    const rawResponse = await callAI(systemPrompt, "Generate the personalized remediation roadmap.");
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to extract JSON object from Gemini response.");

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.warn("GeminiService: generateRoadmap failed. Reason:", error.message);

    // FALLBACK 1: Try to query local DB (completed sessions) to find a previously generated AI roadmap with the same overallSeverity
    try {
      console.log(`Searching MongoDB for a cached AI roadmap with severity '${severity}'...`);
      const matchedSession = await TestSession.findOne({
        status: 'completed',
        'analysisResult.overallSeverity': severity
      });

      if (matchedSession && matchedSession.analysisResult) {
        console.log(`Fallback Success: Found a cached AI roadmap with severity '${severity}' from Session ID: ${matchedSession._id}`);
        return matchedSession.analysisResult;
      }
    } catch (dbErr) {
      console.error("Error fetching cached roadmap from MongoDB:", dbErr.message);
    }

    // FALLBACK 2: Returns our pre-defined high-quality offline fallback roadmap
    console.log(`Falling back to hardcoded default offline roadmap for severity '${severity}'...`);
    return {
      overallSeverity: severity,
      summary: `The diagnostic test indicates a ${severity} likelihood of dyscalculia characteristics, specifically impacting ${blockerNames.length > 0 ? blockerNames.join(', ') : 'general arithmetic fluency'}. The student shows strengths in fully answered constructs but faces recurring cognitive blocks when dealing with direct applications.`,
      steps: [
        {
          stepNumber: 1,
          title: "Concrete Math Manipulatives",
          executionPlan: "Spend 15 minutes daily using physical objects (beads, blocks, coins) to visually represent number concepts and quantities, strengthening visual-spatial quantity association.",
          resources: ["Base-10 Blocks", "Cuisenaire Rods", "Toy Theater Virtual Manipulatives"]
        },
        {
          stepNumber: 2,
          title: "Place Value Visualisation",
          executionPlan: "Work on visual sorting cards dividing numbers into Hundreds, Tens, and Ones. Play placement value grid games 3 times a week.",
          resources: ["National Library of Virtual Manipulatives", "Number line grids"]
        },
        {
          stepNumber: 3,
          title: "Subitising Training",
          executionPlan: "Use dot cards or flashcards for 10 minutes daily. Train the student to recognize small groups of objects instantly without counting them individually.",
          resources: ["Dot Pattern Flashcards", "Subitize! online game"]
        },
        {
          stepNumber: 4,
          title: "Structured Math Games",
          executionPlan: "Play board games or digital math games that utilize linear number boards (like Chutes and Ladders) to reinforce sequential magnitude concepts.",
          resources: ["Prodigy Math", "Math Playground (Number Sense games)"]
        },
        {
          stepNumber: 5,
          title: "Positive Reinforcement & Multi-sensory Integration",
          executionPlan: "Encourage verbalizing mathematical logic ('speak the math'). Incorporate physical movement, clapping, and rhythm to learn arithmetic sequences.",
          resources: ["Dyscalculia Toolkit by Ronit Bird", "TouchMath educational guide"]
        }
      ]
    };
  }
};
