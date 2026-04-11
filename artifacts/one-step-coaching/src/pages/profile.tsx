import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Phone, Shield, Calendar, Camera, Save, Key } from "lucide-react";

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [uploading, setUploading] = useState(false);

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      toast({ title: "Error", description: "Name cannot be empty", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName.trim() })
      .eq("id", profile?.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Name updated successfully" });
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast({ title: "Error", description: "Password must contain at least 1 letter and 1 number", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPw(false);
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "File too large (max 2MB)", variant: "destructive" });
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast({ title: "Error", description: "Only JPG and PNG files are allowed", variant: "destructive" });
      return;
    }

    setUploading(true);
    const filePath = `profiles/${profile?.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("coaching-assets")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload Error", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("coaching-assets").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", profile?.id);

    if (updateError) {
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Profile picture updated" });
      await refreshProfile();
    }
    setUploading(false);
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="profile-page">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card data-testid="card-profile-info">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-80"
                data-testid="button-upload-avatar"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleUploadAvatar} />
              </label>
            </div>
            <div>
              <h2 className="text-xl font-bold" data-testid="text-profile-name">{profile?.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{profile?.role}</Badge>
                <Badge className={statusColors[profile?.status || "pending"]}>{profile?.status}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span data-testid="text-email">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Mobile:</span>
              <span data-testid="text-mobile">{profile?.mobile_number}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Role:</span>
              <span data-testid="text-role">{profile?.role}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined:</span>
              <span data-testid="text-joined">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ""}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-update-name">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" /> Update Display Name
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Full Name</Label>
            <Input
              id="displayName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              data-testid="input-display-name"
            />
          </div>
          <Button onClick={handleUpdateName} disabled={saving} className="gap-2" data-testid="button-save-name">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Name
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-change-password">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPw">Current Password</Label>
            <Input
              id="currentPw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPw">New Password</Label>
            <Input
              id="newPw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 letter, 1 number"
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPw">Confirm New Password</Label>
            <Input
              id="confirmPw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPw} className="gap-2" data-testid="button-change-password">
            {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
