import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, Award, Target, Activity } from "lucide-react";

interface AttemptData {
  test_id: string;
  percentage: number;
  completed_at: string;
  tests?: { title: string };
}

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [passRate, setPassRate] = useState(0);
  const [passFailData, setPassFailData] = useState<{ name: string; value: number }[]>([]);
  const [scoreByTest, setScoreByTest] = useState<{ name: string; score: number }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; score: number }[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!profile) return;

      let query = supabase
        .from("test_attempts")
        .select("*, tests(title)")
        .order("completed_at", { ascending: true });

      if (profile.role === "Student") {
        query = query.eq("user_id", profile.id);
      } else if (profile.role === "Teacher") {
        const { data: myTests } = await supabase
          .from("tests")
          .select("id")
          .eq("created_by", profile.id);
        if (myTests && myTests.length > 0) {
          query = query.in("test_id", myTests.map((t) => t.id));
        } else {
          setLoading(false);
          return;
        }
      }

      const { data: attempts } = await query;

      if (!attempts || attempts.length === 0) {
        setLoading(false);
        return;
      }

      const typedAttempts = attempts as unknown as AttemptData[];

      setTotalAttempts(typedAttempts.length);

      const avg = typedAttempts.reduce((sum, a) => sum + a.percentage, 0) / typedAttempts.length;
      setAvgScore(Math.round(avg * 100) / 100);

      const testsWithPassingScore = await supabase
        .from("tests")
        .select("id, passing_score");
      const passingScoreMap: Record<string, number> = {};
      if (testsWithPassingScore.data) {
        testsWithPassingScore.data.forEach((t) => {
          passingScoreMap[t.id] = t.passing_score;
        });
      }

      let passed = 0;
      typedAttempts.forEach((a) => {
        const ps = passingScoreMap[a.test_id] || 60;
        if (a.percentage >= ps) passed++;
      });
      setPassRate(Math.round((passed / typedAttempts.length) * 100));

      setPassFailData([
        { name: "Passed", value: passed },
        { name: "Failed", value: typedAttempts.length - passed },
      ]);

      const testScores: Record<string, { total: number; count: number; name: string }> = {};
      typedAttempts.forEach((a) => {
        const name = a.tests?.title || "Unknown";
        if (!testScores[a.test_id]) {
          testScores[a.test_id] = { total: 0, count: 0, name };
        }
        testScores[a.test_id].total += a.percentage;
        testScores[a.test_id].count++;
      });
      setScoreByTest(
        Object.values(testScores).map((t) => ({
          name: t.name.length > 15 ? t.name.slice(0, 15) + "..." : t.name,
          score: Math.round(t.total / t.count),
        }))
      );

      const last7Days: Record<string, { total: number; count: number }> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        last7Days[key] = { total: 0, count: 0 };
      }
      typedAttempts.forEach((a) => {
        if (a.completed_at) {
          const key = a.completed_at.slice(0, 10);
          if (last7Days[key]) {
            last7Days[key].total += a.percentage;
            last7Days[key].count++;
          }
        }
      });
      setTrendData(
        Object.entries(last7Days).map(([date, val]) => ({
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          score: val.count > 0 ? Math.round(val.total / val.count) : 0,
        }))
      );

      setLoading(false);
    };

    fetchAnalytics();
  }, [profile]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="analytics-loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const COLORS = ["#2E7D32", "#D32F2F"];

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-attempts">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
            <Activity className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAttempts}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-avg-score">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgScore}%</div>
          </CardContent>
        </Card>
        <Card data-testid="card-pass-rate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
            <Target className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{passRate}%</div>
          </CardContent>
        </Card>
        <Card data-testid="card-best-score">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tests Taken</CardTitle>
            <Award className="w-5 h-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAttempts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="chart-pass-fail">
          <CardHeader>
            <CardTitle>Pass vs. Fail Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {passFailData.length > 0 && passFailData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {passFailData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-score-by-test">
          <CardHeader>
            <CardTitle>Average Score per Test</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreByTest.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreByTest}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="chart-trend">
          <CardHeader>
            <CardTitle>Performance Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#1976D2" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
