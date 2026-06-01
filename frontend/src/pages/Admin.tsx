import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain, LogOut, Plus, Users, Shield, Mail, Key, UserCheck, Calendar, Activity } from "lucide-react";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  classCode?: string;
  createdAt: string;
}

export default function Admin() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setFetching(true);
      const res = await axiosInstance.get("/auth/admin/teachers");
      if (res.data.success) {
        setTeachers(res.data.data);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to load teachers roster.",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teacherName.trim() || !teacherEmail.trim() || !teacherPassword.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "All fields are required to create a teacher account.",
      });
      return;
    }

    if (teacherPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/admin/create-teacher", {
        name: teacherName,
        email: teacherEmail,
        password: teacherPassword,
      });

      if (res.data.success) {
        const createdTeacher = res.data.data;
        toast({
          title: "Teacher Account Created!",
          description: `Teacher ${teacherName} is registered. Class Code: ${createdTeacher?.classCode || "N/A"}`,
        });

        // Reset form
        setTeacherName("");
        setTeacherEmail("");
        setTeacherPassword("");
        
        // Reload roster
        loadTeachers();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to create teacher account.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">NeuroMath AI</h1>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] sm:text-xs py-0.5 px-1.5 flex-shrink-0">Admin</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border/50">
                <Shield className="w-4 h-4 text-primary" />
                {user?.email}
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        
        {/* Statistics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-card/40 backdrop-blur border-border/50 hover:border-primary/30 transition-all">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Teachers</p>
                <h3 className="text-3xl font-bold">{fetching ? "..." : teachers.length}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur border-border/50 hover:border-accent/30 transition-all">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-accent/10 rounded-2xl">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <h3 className="text-2xl font-bold text-success flex items-center gap-2">
                  <Activity className="w-5 h-5 text-success animate-pulse" /> Active
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur border-border/50 hover:border-success/30 transition-all">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-success/10 rounded-2xl">
                <UserCheck className="w-8 h-8 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Database</p>
                <h3 className="text-2xl font-bold text-foreground">Connected</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Create Teacher Form (Left) */}
          <div className="lg:col-span-5">
            <Card className="shadow-md bg-card/70 border border-border/50 sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Plus className="w-5 h-5 text-primary" />
                  Add New Teacher
                </CardTitle>
                <CardDescription>
                  Register a secure educator profile. Only Teachers can evaluate students and run diagnostic roadmaps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTeacher} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-muted-foreground" /> Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Dr. Sarah Jenkins"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      required
                      className="bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="sarah.jenkins@school.edu"
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      required
                      className="bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pass" className="flex items-center gap-2"><Key className="w-4 h-4 text-muted-foreground" /> Initial Password</Label>
                    <Input
                      id="pass"
                      type="password"
                      placeholder="••••••••"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <Button type="submit" className="w-full shadow-md mt-6" disabled={loading}>
                    {loading ? "Creating..." : "Register Teacher Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Teachers Roster List (Right) */}
          <div className="lg:col-span-7">
            <Card className="shadow-md bg-card/70 border border-border/50">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Teachers Roster
                </CardTitle>
                <CardDescription>
                  List of all registered educators authorized on this platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {fetching ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Activity className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                    Loading registered teachers...
                  </div>
                ) : teachers.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-40 mb-3" />
                    No teacher accounts exist yet. Create the first educator account on the left.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {teachers.map((teacher) => (
                      <div key={teacher._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="font-semibold text-foreground text-lg">{teacher.name}</h4>
                            {teacher.classCode && (
                              <Badge className="bg-primary/20 text-primary border-none text-xs font-bold font-mono">
                                {teacher.classCode}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            {teacher.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/50 border border-border/50 rounded-full px-3 py-1 self-start sm:self-auto">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          Joined: {new Date(teacher.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
