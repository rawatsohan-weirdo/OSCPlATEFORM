import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import coachingLogo from "@assets/coaching_logo_1775981898565.png";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[a-zA-Z]/.test(pw)) return "Password must contain at least 1 letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least 1 number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: "Error", description: "Full name is required", variant: "destructive" });
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) {
      toast({ title: "Error", description: pwError, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, {
      full_name: fullName.trim(),
      mobile_number: mobile.trim(),
      role,
    });

    if (error) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="register-success">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2" data-testid="text-success-title">Registration Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Please check your email for a verification link. After verifying, an admin will review and approve your account.
            </p>
            <Link href="/login">
              <Button data-testid="button-go-login">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="register-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src={coachingLogo}
              alt="One Step Coaching Classes logo"
              className="h-24 w-24 rounded-full object-cover shadow-md ring-2 ring-primary/15"
              data-testid="img-register-logo"
            />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-register-title">Create Account</CardTitle>
          <CardDescription>Join One Step Coaching Platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                autoComplete="name"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                required
                data-testid="input-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                autoComplete="tel"
                placeholder="+1234567890"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={20}
                required
                data-testid="input-mobile"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regEmail">Email</Label>
              <Input
                id="regEmail"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-reg-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regPassword">Password</Label>
              <Input
                id="regPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Min 8 chars, 1 letter, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-reg-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student" data-testid="option-student">Student</SelectItem>
                  <SelectItem value="Teacher" data-testid="option-teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Register
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
