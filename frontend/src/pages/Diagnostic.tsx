import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, Loader2, ArrowRight, Play } from "lucide-react";

interface Question {
  questionText: string;
  correctAnswer: string;
  category: string;
  difficulty: number;
}

export default function Diagnostic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<"age" | "main-test" | "confirmatory" | "roadmap">("age");
  const [age, setAge] = useState<number | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [roadmap, setRoadmap] = useState<any>(null);

  // Resume Test Session on mount
  useEffect(() => {
    const resumeSession = async () => {
      try {
        setInitializing(true);
        const res = await axiosInstance.get("/tests/current");
        
        if (res.data.success && res.data.data) {
          const session = res.data.data;
          console.log("Resuming active test session:", session._id);
          
          setTestId(session._id);
          setAge(session.ageAtTest);
          setQuestions(session.questionsList);
          setResponses(session.responses);
          setCurrentQuestion(session.currentQuestionIndex);
          
          // Determine the active stage
          if (session.currentQuestionIndex >= session.totalQuestions) {
            // Already completed but not submitted?
            await handleSubmitAssessment(session._id);
          } else if (session.currentQuestionIndex >= 10) {
            setStage("confirmatory");
          } else {
            setStage("main-test");
          }
          
          toast({
            title: "Welcome back!",
            description: `Resuming your math assessment exactly where you left off.`,
          });
        }
      } catch (error: any) {
        console.error("Could not load current test session:", error);
      } finally {
        setInitializing(false);
      }
    };

    resumeSession();
  }, []);

  const handleAgeSubmit = async () => {
    if (!age || age < 5) {
      toast({
        variant: "destructive",
        title: "Invalid Age",
        description: "Please enter an age of 5 or above.",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Start a new test session in the backend
      const res = await axiosInstance.post("/tests/start", { age });
      if (res.data.success) {
        const session = res.data.data;
        setTestId(session._id);
        setQuestions(session.questionsList);
        setResponses(session.responses);
        setCurrentQuestion(0);
        setStage("main-test");
        
        toast({
          title: "Assessment Started!",
          description: "Answer the questions as best as you can. Good luck!",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Initiation Failed",
        description: error.response?.data?.error || "Could not start the assessment.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!userAnswer.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Answer",
        description: "Please type in your answer before submitting.",
      });
      return;
    }

    if (!testId) return;

    setLoading(true);
    try {
      const question = questions[currentQuestion];
      const isCorrect = userAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
      const questionNum = currentQuestion + 1;

      // 1. Autosave response in MongoDB
      const res = await axiosInstance.post("/tests/save-progress", {
        testSessionId: testId,
        questionNumber: questionNum,
        questionText: question.questionText,
        userAnswer: userAnswer.trim(),
        correctAnswer: question.correctAnswer,
        isCorrect,
        construct: question.category,
        difficultyLevel: question.difficulty,
      });

      if (res.data.success) {
        const session = res.data.data;
        
        // Update states based on backend session response
        setQuestions(session.questionsList);
        setResponses(session.responses);
        setUserAnswer("");
        
        // Alert if confirmatory stage was injected at Question 10
        if (questionNum === 10 && session.totalQuestions > 10) {
          toast({
            title: "Deficit Indicator Detected",
            description: `We've identified potential challenges with ${session.blockers[0].blocker_name}. Let's do 5 quick confirmatory questions.`,
          });
          setStage("confirmatory");
        }

        const nextIndex = currentQuestion + 1;
        
        // Check if we reached the end of the assessment
        if (nextIndex >= session.totalQuestions) {
          console.log("End of assessment reached. Running final evaluation...");
          await handleSubmitAssessment(testId);
        } else {
          // Increment index to show the next question
          setCurrentQuestion(nextIndex);
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.response?.data?.error || "Failed to submit your response.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssessment = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/tests/submit", { testSessionId: sessionId });
      if (res.data.success) {
        const session = res.data.data.session;
        setRoadmap(session.analysisResult);
        setStage("roadmap");
        
        toast({
          title: "Assessment Completed!",
          description: "Your personalized math roadmap has been generated successfully.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Evaluation Failed",
        description: error.response?.data?.error || "Failed to analyze your assessment.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing assessment runner...</p>
        </div>
      </div>
    );
  }

  // Calculate Progress Percentage
  const totalLength = questions.length || 10;
  const progress = stage === "main-test" 
    ? (responses.length / 10) * 100
    : stage === "confirmatory"
    ? ((responses.length - 10) / (totalLength - 10)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 flex items-center justify-center">
      <div className="container max-w-2xl mx-auto py-8">
        
        {/* Stage 1: Enter Age */}
        {stage === "age" && (
          <Card className="shadow-xl bg-card/75 border border-border/50 backdrop-blur-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Brain className="w-12 h-12 text-primary animate-pulse-glow" />
                </div>
              </div>
              <CardTitle className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-glow">
                NeuroMath AI Diagnostic
              </CardTitle>
              <CardDescription>
                Let's customize your mathematics diagnostic. Enter your age to start the adaptive assessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="text-base font-semibold">Student's Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="5"
                  max="100"
                  placeholder="E.g., 8"
                  value={age || ""}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="bg-background/50 border-border/50 focus:border-primary/50 text-lg py-6"
                />
              </div>
              <Button onClick={handleAgeSubmit} className="w-full text-base py-6 shadow-md hover:shadow-lg transition-all" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                Begin Assessment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stage 2: Assessment Test Interface */}
        {(stage === "main-test" || stage === "confirmatory") && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground bg-card/40 backdrop-blur border border-border/40 rounded-full px-4 py-1.5 shadow-sm">
                <span className="font-semibold flex items-center gap-1.5 text-primary">
                  <Brain className="w-4 h-4 text-primary animate-pulse" />
                  {stage === "main-test" ? "Core Assessment" : "Confirmatory Stage"}
                </span>
                <span className="font-semibold text-foreground">
                  Question {stage === "main-test" ? currentQuestion + 1 : currentQuestion - 9} of{" "}
                  {stage === "main-test" ? 10 : totalLength - 10}
                </span>
              </div>
              <Progress value={progress} className="h-2.5 shadow-sm" />
            </div>

            <Card className="shadow-xl bg-card/75 border border-border/50 backdrop-blur-md">
              <CardHeader className="pb-6">
                <CardDescription className="text-primary font-semibold text-xs tracking-wider uppercase">
                  Testing Area: {questions[currentQuestion]?.category}
                </CardDescription>
                <CardTitle className="text-2xl font-bold leading-relaxed text-foreground/90 mt-2">
                  {questions[currentQuestion]?.questionText}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="answer" className="text-sm font-semibold">Your Numeric/Text Answer</Label>
                  <Input
                    id="answer"
                    type="text"
                    placeholder="Type your answer here..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !loading && handleAnswerSubmit()}
                    autoFocus
                    className="bg-background/50 border-border/50 focus:border-primary/50 text-lg py-6"
                  />
                </div>
                <Button onClick={handleAnswerSubmit} className="w-full text-base py-6 shadow-md hover:shadow-lg transition-all" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Submit Answer"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stage 3: Assessment Completed Roadmap */}
        {stage === "roadmap" && roadmap && (
          <div className="space-y-6">
            <Card className="shadow-2xl border-success/35 bg-card/70 backdrop-blur-md">
              <CardHeader className="bg-success/10 border-b border-success/20 py-6 rounded-t-2xl">
                <div className="flex items-center gap-3.5">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                  <div>
                    <CardTitle className="text-2xl font-extrabold text-foreground">Assessment Complete!</CardTitle>
                    <CardDescription className="text-success-foreground font-semibold">
                      Your personalized remediation action roadmap is ready.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                
                {/* Summary Banner */}
                <div className="space-y-2 bg-success/5 border border-success/20 p-5 rounded-2xl">
                  <h3 className="font-extrabold text-lg flex items-center gap-2">
                    Overall Deficit Level: 
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      roadmap.overallSeverity === "severe" ? "bg-destructive text-destructive-foreground" :
                      roadmap.overallSeverity === "moderate" ? "bg-warning text-warning-foreground" :
                      roadmap.overallSeverity === "mild" ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground"
                    }`}>
                      {roadmap.overallSeverity}
                    </span>
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{roadmap.summary}</p>
                </div>

                {/* 5-Step Action Steps */}
                <div className="space-y-4">
                  <h3 className="font-extrabold text-xl flex items-center gap-2 border-b border-border pb-2">
                    <Brain className="w-5 h-5 text-primary" />
                    5-Step Classroom Action Roadmap
                  </h3>
                  <div className="space-y-4">
                    {roadmap.steps.map((step: any) => (
                      <Card key={step.stepNumber} className="border-l-4 border-l-primary bg-background/50 hover:bg-background/80 transition-all border border-border/40">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                              {step.stepNumber}
                            </span>
                            {step.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="font-bold text-xs text-muted-foreground uppercase tracking-wide mb-1">Weekly Plan</p>
                            <p className="text-sm text-foreground/80 leading-relaxed">{step.executionPlan}</p>
                          </div>
                          <div>
                            <p className="font-bold text-xs text-muted-foreground uppercase tracking-wide mb-1">Recommended Learning Resources</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {step.resources.map((resource: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="bg-primary/5 border-primary/20 text-primary text-xs">
                                  {resource}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Printable and Navigation controls */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/50">
                  <Button onClick={() => window.print()} variant="outline" className="flex-1 py-6 font-semibold">
                    Print Action Report
                  </Button>
                  <Button onClick={() => navigate("/dashboard")} className="flex-1 py-6 font-semibold flex items-center justify-center gap-2">
                    Go to My Dashboard <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
