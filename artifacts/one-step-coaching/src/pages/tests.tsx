import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Test, Question, Subject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Clock,
  Award,
  Play,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trash2,
  AlertCircle,
} from "lucide-react";

type View = "list" | "create" | "take" | "result";

interface TestResult {
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>;
}

export default function TestsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const canCreate = profile?.role === "Teacher" || profile?.role === "Admin";

  const [view, setView] = useState<View>("list");
  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createDuration, setCreateDuration] = useState("30");
  const [createPassingScore, setCreatePassingScore] = useState("60");
  const [createSubject, setCreateSubject] = useState("");
  const [createQuestions, setCreateQuestions] = useState<Omit<Question, "id" | "test_id" | "created_at">[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qText, setQText] = useState("");
  const [qA, setQA] = useState("");
  const [qB, setQB] = useState("");
  const [qC, setQC] = useState("");
  const [qD, setQD] = useState("");
  const [qCorrect, setQCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [qPoints, setQPoints] = useState("1");

  const fetchTests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("tests").select("*").order("created_at", { ascending: false });
    setTests(data || []);
    setLoading(false);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase.from("subjects").select("*");
    setSubjects(data || []);
  }, []);

  useEffect(() => {
    fetchTests();
    fetchSubjects();
  }, [fetchTests, fetchSubjects]);

  useEffect(() => {
    if (view !== "take" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [view, timeLeft]);

  const startTest = async (test: Test) => {
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("test_id", test.id)
      .order("created_at");

    if (!data || data.length === 0) {
      toast({ title: "No questions", description: "This test has no questions yet.", variant: "destructive" });
      return;
    }

    setSelectedTest(test);
    setQuestions(data);
    setAnswers({});
    setTimeLeft(test.duration_minutes * 60);
    setView("take");
  };

  const handleSubmitTest = async () => {
    if (!selectedTest || !profile) return;

    let score = 0;
    let totalPoints = 0;

    for (const q of questions) {
      totalPoints += q.points;
      if (answers[q.id] === q.correct_option) {
        score += q.points;
      }
    }

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100 * 100) / 100 : 0;
    const passed = percentage >= selectedTest.passing_score;

    const { error } = await supabase.from("test_attempts").insert({
      test_id: selectedTest.id,
      user_id: profile.id,
      score,
      total_points: totalPoints,
      percentage,
      answers,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }

    setTestResult({ score, totalPoints, percentage, passed, answers });
    setView("result");
  };

  const handleCreateTest = async () => {
    if (!createTitle.trim() || createQuestions.length === 0) {
      toast({ title: "Error", description: "Title and at least 1 question are required", variant: "destructive" });
      return;
    }

    const duration = parseInt(createDuration);
    const passingScore = parseInt(createPassingScore);

    if (duration < 1 || duration > 180) {
      toast({ title: "Error", description: "Duration must be between 1 and 180 minutes", variant: "destructive" });
      return;
    }

    if (passingScore < 0 || passingScore > 100) {
      toast({ title: "Error", description: "Passing score must be between 0 and 100", variant: "destructive" });
      return;
    }

    const { data: testData, error: testError } = await supabase
      .from("tests")
      .insert({
        title: createTitle.trim(),
        description: createDesc.trim() || null,
        duration_minutes: duration,
        passing_score: passingScore,
        subject_id: createSubject || null,
        created_by: profile?.id,
      })
      .select()
      .single();

    if (testError) {
      toast({ title: "Error", description: testError.message, variant: "destructive" });
      return;
    }

    const questionsToInsert = createQuestions.map((q) => ({
      ...q,
      test_id: testData.id,
    }));

    const { error: qError } = await supabase.from("questions").insert(questionsToInsert);

    if (qError) {
      toast({ title: "Error", description: qError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Test created successfully" });
    setView("list");
    setCreateTitle("");
    setCreateDesc("");
    setCreateDuration("30");
    setCreatePassingScore("60");
    setCreateSubject("");
    setCreateQuestions([]);
    fetchTests();
  };

  const addQuestion = () => {
    if (!qText.trim() || !qA.trim() || !qB.trim() || !qC.trim() || !qD.trim()) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    setCreateQuestions([
      ...createQuestions,
      {
        question_text: qText.trim(),
        option_a: qA.trim(),
        option_b: qB.trim(),
        option_c: qC.trim(),
        option_d: qD.trim(),
        correct_option: qCorrect,
        points: parseInt(qPoints) || 1,
      },
    ]);
    setQText("");
    setQA("");
    setQB("");
    setQC("");
    setQD("");
    setQCorrect("A");
    setQPoints("1");
    setDialogOpen(false);
  };

  const handleDeleteTest = async (testId: string) => {
    const { error } = await supabase.from("tests").delete().eq("id", testId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Test deleted" });
      fetchTests();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading && view === "list") {
    return (
      <div className="space-y-4" data-testid="tests-loading">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (view === "take" && selectedTest) {
    const warningTime = timeLeft <= 300 && timeLeft > 0;

    return (
      <div className="space-y-6" data-testid="test-taking">
        <div className="flex items-center justify-between sticky top-16 bg-background py-3 z-10 border-b">
          <h2 className="text-lg font-bold">{selectedTest.title}</h2>
          <div className={`flex items-center gap-2 text-lg font-mono font-bold ${warningTime ? "text-destructive animate-pulse" : ""}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <Card key={q.id} data-testid={`card-question-${idx}`}>
              <CardContent className="p-6">
                <p className="font-medium mb-4">
                  {idx + 1}. {q.question_text}
                  <span className="text-muted-foreground text-sm ml-2">({q.points} pt{q.points > 1 ? "s" : ""})</span>
                </p>
                <RadioGroup
                  value={answers[q.id] || ""}
                  onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                >
                  {(["A", "B", "C", "D"] as const).map((opt) => (
                    <div key={opt} className="flex items-center gap-3 py-2">
                      <RadioGroupItem value={opt} id={`${q.id}-${opt}`} data-testid={`radio-${idx}-${opt}`} />
                      <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer flex-1">
                        {opt}. {q[`option_${opt.toLowerCase()}` as keyof Question] as string}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setView("list")} data-testid="button-cancel-test">
            Cancel
          </Button>
          <Button onClick={handleSubmitTest} data-testid="button-submit-test">
            Submit Test
          </Button>
        </div>
      </div>
    );
  }

  if (view === "result" && testResult && selectedTest) {
    return (
      <div className="max-w-2xl mx-auto space-y-6" data-testid="test-result">
        <Card>
          <CardContent className="p-8 text-center">
            {testResult.passed ? (
              <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
            ) : (
              <XCircle className="w-20 h-20 text-destructive mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2" data-testid="text-result-status">
              {testResult.passed ? "Congratulations! You Passed!" : "You Did Not Pass"}
            </h2>
            <p className="text-muted-foreground mb-6">{selectedTest.title}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-3xl font-bold text-primary" data-testid="text-score">{testResult.percentage}%</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{testResult.score}/{testResult.totalPoints}</p>
                <p className="text-sm text-muted-foreground">Points</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{selectedTest.passing_score}%</p>
                <p className="text-sm text-muted-foreground">Passing Score</p>
              </div>
            </div>

            <Progress value={testResult.percentage} className="mb-6" />

            <Button onClick={() => { setView("list"); setTestResult(null); }} data-testid="button-back-to-tests">
              Back to Tests
            </Button>
          </CardContent>
        </Card>

        <h3 className="text-lg font-bold">Review Answers</h3>
        {questions.map((q, idx) => {
          const userAnswer = testResult.answers[q.id];
          const isCorrect = userAnswer === q.correct_option;

          return (
            <Card key={q.id} className={isCorrect ? "border-primary/25" : "border-destructive/25"} data-testid={`review-question-${idx}`}>
              <CardContent className="p-4">
                <p className="font-medium mb-2">
                  {idx + 1}. {q.question_text}
                </p>
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const optText = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                  const isUserChoice = userAnswer === opt;
                  const isCorrectAnswer = q.correct_option === opt;

                  return (
                    <div
                      key={opt}
                      className={`flex items-center gap-2 py-1 px-2 rounded text-sm ${
                        isCorrectAnswer
                          ? "bg-primary/10 text-primary font-medium"
                          : isUserChoice
                            ? "bg-destructive/10 text-destructive"
                            : ""
                      }`}
                    >
                      {isCorrectAnswer && <CheckCircle className="w-4 h-4 text-primary" />}
                      {isUserChoice && !isCorrectAnswer && <XCircle className="w-4 h-4 text-destructive" />}
                      <span>{opt}. {optText}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="max-w-2xl mx-auto space-y-6" data-testid="test-create">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} data-testid="button-back-create">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold">Create New Test</h2>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Test Title</Label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Enter test title"
                maxLength={100}
                data-testid="input-test-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Optional description"
                maxLength={500}
                data-testid="input-test-desc"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={createDuration}
                  onChange={(e) => setCreateDuration(e.target.value)}
                  min={1}
                  max={180}
                  data-testid="input-test-duration"
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  value={createPassingScore}
                  onChange={(e) => setCreatePassingScore(e.target.value)}
                  min={0}
                  max={100}
                  data-testid="input-test-passing"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={createSubject} onValueChange={setCreateSubject}>
                <SelectTrigger data-testid="select-test-subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Questions ({createQuestions.length})</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" data-testid="button-add-question">
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Question</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Enter question"
                    maxLength={500}
                    data-testid="input-q-text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Option A</Label>
                    <Input value={qA} onChange={(e) => setQA(e.target.value)} data-testid="input-q-a" />
                  </div>
                  <div className="space-y-2">
                    <Label>Option B</Label>
                    <Input value={qB} onChange={(e) => setQB(e.target.value)} data-testid="input-q-b" />
                  </div>
                  <div className="space-y-2">
                    <Label>Option C</Label>
                    <Input value={qC} onChange={(e) => setQC(e.target.value)} data-testid="input-q-c" />
                  </div>
                  <div className="space-y-2">
                    <Label>Option D</Label>
                    <Input value={qD} onChange={(e) => setQD(e.target.value)} data-testid="input-q-d" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Correct Option</Label>
                    <Select value={qCorrect} onValueChange={(v) => setQCorrect(v as "A" | "B" | "C" | "D")}>
                      <SelectTrigger data-testid="select-q-correct">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={qPoints}
                      onChange={(e) => setQPoints(e.target.value)}
                      min={1}
                      data-testid="input-q-points"
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={addQuestion} data-testid="button-save-question">
                  Add Question
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {createQuestions.map((q, idx) => (
          <Card key={idx} data-testid={`card-created-q-${idx}`}>
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <p className="font-medium">{idx + 1}. {q.question_text}</p>
                <div className="grid grid-cols-2 gap-1 mt-2 text-sm text-muted-foreground">
                  <span>A: {q.option_a}</span>
                  <span>B: {q.option_b}</span>
                  <span>C: {q.option_c}</span>
                  <span>D: {q.option_d}</span>
                </div>
                <p className="text-sm mt-1">
                  Correct: <Badge variant="secondary">{q.correct_option}</Badge> | Points: {q.points}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCreateQuestions(createQuestions.filter((_, i) => i !== idx))}
                data-testid={`button-remove-q-${idx}`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {createQuestions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8" />
            <p>Add at least 1 question to create the test.</p>
          </div>
        )}

        <Button className="w-full" onClick={handleCreateTest} disabled={createQuestions.length === 0} data-testid="button-create-test">
          Create Test
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tests-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tests</h1>
        {canCreate && (
          <Button size="sm" className="gap-1" onClick={() => setView("create")} data-testid="button-new-test">
            <Plus className="w-4 h-4" /> Create Test
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.map((test) => (
          <Card key={test.id} data-testid={`card-test-${test.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{test.title}</CardTitle>
                  {test.description && <p className="text-sm text-muted-foreground mt-1">{test.description}</p>}
                </div>
                {canCreate && test.created_by === profile?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTest(test.id)}
                    data-testid={`button-delete-test-${test.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {test.duration_minutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" /> Pass: {test.passing_score}%
                </span>
                <Badge variant={test.is_active ? "default" : "secondary"}>
                  {test.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => startTest(test)}
                disabled={!test.is_active}
                data-testid={`button-start-test-${test.id}`}
              >
                <Play className="w-4 h-4" /> Take Test
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {tests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-tests">
          No tests available yet.
        </div>
      )}
    </div>
  );
}
