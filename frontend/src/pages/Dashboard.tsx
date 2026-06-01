import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Brain, LogOut, Plus, User, Users, Trash2, Play, Calendar, CheckCircle, BarChart3, AlertCircle, ArrowRight, Mail, Key } from "lucide-react";

interface Blocker {
  blocker_name: string;
  error_count: number;
}

interface TestSession {
  _id: string;
  ageAtTest: number;
  status: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  startedAt: string;
  updatedAt: string;
}

interface Result {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  testSessionId: string;
  dyscalculiaProbability: number;
  finalClassification: "none" | "mild" | "moderate" | "severe";
  strengths: string[];
  weaknesses: string[];
  blockers: Blocker[];
  recommendations: string[];
  generatedAt: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  
  // Student specific state
  const [activeSession, setActiveSession] = useState<TestSession | null>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [classCodeInput, setClassCodeInput] = useState("");
  const [joiningClass, setJoiningClass] = useState(false);
  
  // Teacher specific state
  const [allResults, setAllResults] = useState<Result[]>([]);

  const handleJoinClass = async () => {
    if (!classCodeInput.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter the Class Code.",
      });
      return;
    }

    setJoiningClass(true);
    try {
      const res = await axiosInstance.post("/auth/join-class", {
        classCode: classCodeInput,
      });

      if (res.data.success) {
        toast({
          title: "Classroom Linked!",
          description: res.data.message,
        });
        
        // Save new user profile locally
        localStorage.setItem("user", JSON.stringify(res.data.data));
        
        // Reload to let AuthContext capture updated user profile
        window.location.reload();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.response?.data?.error || "Could not link to classroom.",
      });
    } finally {
      setJoiningClass(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    if (user.role === "student") {
      loadStudentData();
    } else if (user.role === "teacher") {
      loadTeacherData();
    }
  }, [user]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch current active session
      const sessionRes = await axiosInstance.get("/tests/current");
      if (sessionRes.data.success) {
        setActiveSession(sessionRes.data.data);
      }
      
      // 2. Fetch past results
      const resultsRes = await axiosInstance.get(`/results/student/${user?._id}`);
      if (resultsRes.data.success) {
        setStudentResults(resultsRes.data.data);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: error.response?.data?.error || "Failed to load assessment data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/results/teacher/all");
      if (res.data.success) {
        setAllResults(res.data.data);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: error.response?.data?.error || "Failed to load classroom results.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnfinished = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this unfinished assessment? All temporary progress will be permanently lost.")) {
      return;
    }
    
    try {
      const res = await axiosInstance.delete(`/tests/unfinished/${sessionId}`);
      if (res.data.success) {
        toast({
          title: "Assessment Deleted",
          description: "Unfinished test session was cleared successfully.",
        });
        setActiveSession(null);
        loadStudentData();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.response?.data?.error || "Could not delete unfinished session.",
      });
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Brain className="w-7 h-7 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold truncate">
                <span className="sm:hidden">NeuroMath AI</span>
                <span className="hidden sm:inline">NeuroMath AI Dashboard</span>
              </h1>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border/50">
                <User className="w-4 h-4 text-primary" />
                {user?.name} ({user?.role === "student" ? "Student" : "Teacher"})
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-shrink-0">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* ================= STUDENT DASHBOARD ================= */}
        {user?.role === "student" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {user.name}!</h2>
                <p className="text-muted-foreground">Track your progress and run mathematical diagnostic tests.</p>
              </div>
              {!activeSession && (
                <Button size="lg" onClick={() => navigate("/diagnostic")} className="shadow-md hover:shadow-lg transition-all animate-bounce-subtle">
                  <Play className="w-5 h-5 mr-2" /> Start Diagnostic Assessment
                </Button>
              )}
            </div>

            {/* Classroom Connection Card */}
            <Card className="border-border/50 bg-card/45 backdrop-blur-sm shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Classroom Connection
                </CardTitle>
                <CardDescription>
                  Link your account to your teacher's classroom to share your diagnostic progress and roadmaps.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {(user as any)?.teacherId ? (
                  <div className="flex items-center gap-3 bg-success/10 border border-success/20 rounded-xl p-4">
                    <CheckCircle className="w-6 h-6 text-success" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Successfully linked to your classroom!</p>
                      <p className="text-xs text-muted-foreground">
                        Teacher: <strong className="text-foreground">{(user as any).teacherId.name}</strong> ({(user as any).teacherId.email})
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Enter your 7-character Class Code (e.g. NM-H3K9)..."
                        value={classCodeInput}
                        onChange={(e) => setClassCodeInput(e.target.value)}
                        className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 font-mono"
                      />
                    </div>
                    <Button onClick={handleJoinClass} disabled={joiningClass} className="shadow-md">
                      {joiningClass ? "Linking..." : "Link Classroom"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unfinished Test Session Panel */}
            {activeSession && (
              <Card className="border-warning/30 bg-warning/5 backdrop-blur-sm shadow-md">
                <CardHeader>
                  <CardTitle className="text-warning flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Unfinished Assessment Found!
                  </CardTitle>
                  <CardDescription>
                    You exited in the middle of a test. You can resume exactly where you left off or delete this test.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-sm">Started: <strong className="text-foreground">{new Date(activeSession.startedAt).toLocaleDateString()}</strong></p>
                    <p className="text-sm">Progress: <strong className="text-foreground">Question {activeSession.currentQuestionIndex} of {activeSession.totalQuestions}</strong></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => navigate("/diagnostic")} className="bg-warning hover:bg-warning/90 text-background font-semibold shadow-md">
                      <Play className="w-4 h-4 mr-2" /> Continue Test
                    </Button>
                    <Button variant="destructive" onClick={() => handleDeleteUnfinished(activeSession._id)} className="shadow-md">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Past Diagnostic Results */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Assessment History
              </h3>
              
              {studentResults.length === 0 ? (
                <Card className="border-dashed border-border/60 p-8 text-center bg-card/10">
                  <CardContent className="space-y-4 py-8">
                    <Brain className="w-16 h-16 text-muted-foreground opacity-40 mx-auto" />
                    <div>
                      <h4 className="text-lg font-semibold">No assessments completed yet</h4>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                        Click the 'Start Diagnostic Assessment' button above to generate your customized mathematics analysis report.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {studentResults.map((result) => (
                    <Card key={result._id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all">
                      <CardHeader className="border-b border-border/30 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="space-y-1">
                            <CardTitle className="text-lg font-bold">Diagnostic Test Report</CardTitle>
                            <CardDescription className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-primary" />
                              {new Date(result.generatedAt).toLocaleString()}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm font-semibold capitalize bg-primary/10 border-primary/20 text-primary">
                              Severity: {result.finalClassification}
                            </Badge>
                            <Badge className={`text-sm font-bold ${
                              result.finalClassification === "severe" ? "bg-destructive text-destructive-foreground" :
                              result.finalClassification === "moderate" ? "bg-warning text-warning-foreground" :
                              result.finalClassification === "mild" ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground"
                            }`}>
                              Likelihood Score: {result.dyscalculiaProbability}%
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Strengths */}
                          <div className="bg-success/5 border border-success/20 rounded-xl p-4 space-y-2">
                            <h4 className="font-semibold text-success flex items-center gap-2">
                              ✓ Verified Strengths
                            </h4>
                            {result.strengths.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">None identified in this test.</p>
                            ) : (
                              <ul className="list-disc list-inside text-sm space-y-1 text-foreground/80">
                                {result.strengths.map((s: string, i: number) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          
                          {/* Deficits / Weaknesses */}
                          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2">
                            <h4 className="font-semibold text-destructive flex items-center gap-2">
                              ⚠ Critical Deficits
                            </h4>
                            {result.weaknesses.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">None identified in this test.</p>
                            ) : (
                              <ul className="list-disc list-inside text-sm space-y-1 text-foreground/80">
                                {result.weaknesses.map((w: string, i: number) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Roadmap Steps */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-base">Your Remediation Roadmap:</h4>
                          <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {result.testSessionId?.analysisResult?.steps?.map((step: any) => (
                              <div key={step.stepNumber} className="bg-card border border-border/50 rounded-lg p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-primary/20 text-primary border-none">Step {step.stepNumber}</Badge>
                                </div>
                                <h5 className="font-bold text-sm text-foreground">{step.title}</h5>
                                <p className="text-xs text-muted-foreground line-clamp-3">{step.executionPlan}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TEACHER DASHBOARD ================= */}
        {user?.role === "teacher" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Classroom Roster</h2>
                  {(user as any)?.classCode && (
                    <Badge className="bg-primary/20 text-primary border-none text-sm font-bold font-mono py-1 px-3">
                      Class Code: {(user as any).classCode}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">Monitor student diagnostics, cognitive blockers, and personalized roadmaps.</p>
              </div>
            </div>

            {allResults.length === 0 ? (
              <Card className="border-dashed border-border/60 p-12 text-center bg-card/10">
                <CardContent className="space-y-4">
                  <Users className="w-16 h-16 text-muted-foreground opacity-45 mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold">No assessment records found</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1">
                      No student has completed a diagnostic assessment yet. Instruct your student users to register and run the assessment from their student accounts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {allResults.map((result) => (
                  <Card key={result._id} className="hover:shadow-md transition-all border-border/50 bg-card/45 backdrop-blur-sm">
                    <CardHeader className="border-b border-border/30 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <Badge variant="outline" className="mb-2 bg-primary/10 border-primary/20 text-primary">Student Profile</Badge>
                          <CardTitle className="text-xl font-bold text-foreground">{result.studentId?.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1.5 mt-1">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            {result.studentId?.email}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            Test Date: {new Date(result.generatedAt).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.finalClassification === "severe" ? "destructive" : "secondary"} className="capitalize font-semibold">
                              Severity: {result.finalClassification}
                            </Badge>
                            <Badge className="bg-primary/20 text-primary border-none font-bold">
                              Likelihood: {result.dyscalculiaProbability}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      
                      {/* Grid cards for Strengths and Weaknesses */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Identified Strengths</span>
                          <div className="bg-success/5 border border-success/20 rounded-xl p-4 min-h-[100px]">
                            {result.strengths.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">None recorded.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {result.strengths.map((s, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-success/10 border-success/20 text-success">{s}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Critical Deficits</span>
                          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 min-h-[100px]">
                            {result.weaknesses.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">None recorded.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {result.weaknesses.map((w, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-destructive/10 border-destructive/20 text-destructive">{w}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Blocker details */}
                      {result.blockers.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Detected Cognitive Blockers</span>
                          <Card className="border-border/50 bg-background/50">
                            <CardContent className="p-4 flex flex-wrap gap-4">
                              {result.blockers.map((blocker, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-card px-3 py-1.5 rounded-lg border border-border/50">
                                  <span className="text-sm font-semibold">{blocker.blocker_name}</span>
                                  <Badge className="bg-destructive text-destructive-foreground text-xs">{blocker.error_count} Errors</Badge>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Remediation Action Plan */}
                      <div className="space-y-3">
                        <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">5-Step Remediation Action Plan</span>
                        <div className="space-y-3">
                          {result.recommendations.map((rec, idx) => (
                            <div key={idx} className="flex gap-3 items-start bg-card/60 p-3 rounded-lg border border-border/30">
                              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary font-bold text-xs rounded-full flex items-center justify-center border border-primary/20">
                                {idx + 1}
                              </span>
                              <p className="text-sm text-foreground/90">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
