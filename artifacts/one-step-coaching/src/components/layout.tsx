import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  Users,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import coachingLogo from "@assets/coaching_logo_1775981898565.png";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Student", "Teacher", "Admin"] },
    { href: "/content", label: "Content", icon: BookOpen, roles: ["Student", "Teacher", "Admin"] },
    { href: "/tests", label: "Tests", icon: ClipboardList, roles: ["Student", "Teacher", "Admin"] },
    { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["Student", "Teacher", "Admin"] },
    { href: "/admin", label: "Admin", icon: Users, roles: ["Admin"] },
  ];

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(profile?.role || "")
  );

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen bg-background" data-testid="layout">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <img
                src={coachingLogo}
                alt="One Step Coaching Classes logo"
                className="h-10 w-10 rounded-full object-cover shadow-sm ring-1 ring-primary/15"
                data-testid="img-nav-logo"
              />
              <span className="font-bold text-lg hidden sm:inline" data-testid="text-brand">One Step Coaching</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
            {visibleItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location.startsWith(item.href) ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">{profile?.full_name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="menu-profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} data-testid="menu-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden border-t bg-card p-2" data-testid="nav-mobile">
            {visibleItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location.startsWith(item.href) ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 mb-1"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
