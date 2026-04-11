import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ClipboardList, Users, TrendingUp, Award, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;

      const results: Record<string, number> = {};

      if (profile.role === "Student") {
        const { count: attemptCount } = await supabase
          .from("test_attempts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id);
        results.attempts = attemptCount || 0;

        const { data: attempts } = await supabase
          .from("test_attempts")
          .select("percentage")
          .eq("user_id", profile.id);
        if (attempts && attempts.length > 0) {
          results.avgScore = Math.round(
            attempts.reduce((sum, a) => sum + Number(a.percentage), 0) / attempts.length
          );
        } else {
          results.avgScore = 0;
        }

        const { count: subjectCount } = await supabase
          .from("subjects")
          .select("*", { count: "exact", head: true });
        results.subjects = subjectCount || 0;

        const { count: testCount } = await supabase
          .from("tests")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);
        results.availableTests = testCount || 0;
      }

      if (profile.role === "Teacher") {
        const { count: subjectCount } = await supabase
          .from("subjects")
          .select("*", { count: "exact", head: true })
          .eq("created_by", profile.id);
        results.mySubjects = subjectCount || 0;

        const { count: testCount } = await supabase
          .from("tests")
          .select("*", { count: "exact", head: true })
          .eq("created_by", profile.id);
        results.myTests = testCount || 0;

        const { data: myTests } = await supabase
          .from("tests")
          .select("id")
          .eq("created_by", profile.id);
        if (myTests && myTests.length > 0) {
          const testIds = myTests.map((t) => t.id);
          const { count: attemptCount } = await supabase
            .from("test_attempts")
            .select("*", { count: "exact", head: true })
            .in("test_id", testIds);
          results.studentAttempts = attemptCount || 0;
        } else {
          results.studentAttempts = 0;
        }
      }

      if (profile.role === "Admin") {
        const { count: userCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });
        results.totalUsers = userCount || 0;

        const { count: pendingCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        results.pendingUsers = pendingCount || 0;

        const { count: subjectCount } = await supabase
          .from("subjects")
          .select("*", { count: "exact", head: true });
        results.totalSubjects = subjectCount || 0;

        const { count: testCount } = await supabase
          .from("tests")
          .select("*", { count: "exact", head: true });
        results.totalTests = testCount || 0;
      }

      setStats(results);
      setLoading(false);
    };

    fetchStats();
  }, [profile]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const studentCards = [
    { title: "Tests Taken", value: stats.attempts, icon: ClipboardList, color: "text-blue-600" },
    { title: "Average Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "text-green-600" },
    { title: "Available Subjects", value: stats.subjects, icon: BookOpen, color: "text-purple-600" },
    { title: "Available Tests", value: stats.availableTests, icon: Award, color: "text-amber-600" },
  ];

  const teacherCards = [
    { title: "My Subjects", value: stats.mySubjects, icon: BookOpen, color: "text-blue-600" },
    { title: "My Tests", value: stats.myTests, icon: ClipboardList, color: "text-green-600" },
    { title: "Student Attempts", value: stats.studentAttempts, icon: TrendingUp, color: "text-purple-600" },
  ];

  const adminCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
    { title: "Pending Approvals", value: stats.pendingUsers, icon: Clock, color: "text-amber-600" },
    { title: "Total Subjects", value: stats.totalSubjects, icon: BookOpen, color: "text-green-600" },
    { title: "Total Tests", value: stats.totalTests, icon: ClipboardList, color: "text-purple-600" },
  ];

  const cards =
    profile?.role === "Admin"
      ? adminCards
      : profile?.role === "Teacher"
        ? teacherCards
        : studentCards;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-welcome">
          Welcome, {profile?.full_name || "User"}
        </h1>
        <p className="text-muted-foreground">
          {profile?.role} Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title} data-testid={`card-${card.title.toLowerCase().replace(/\s/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
