import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — NOVAIN SOCKS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? ""));
  }, [user?.id]);

  async function saveProfile() {
    const { error } = await supabase.from("profiles").update({ username }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  }
  async function changePassword() {
    if (!password) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setPassword(""); toast.success("Password updated");
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your account details and security." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <div className="font-semibold">Account</div>
          <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
          <Button className="gradient-primary" onClick={saveProfile}>Save profile</Button>
        </div>
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <div className="font-semibold">Security</div>
          <div><Label>New password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" /></div>
          <Button variant="outline" onClick={changePassword}>Update password</Button>
          <p className="text-xs text-muted-foreground pt-2">Two-factor authentication is on our roadmap.</p>
        </div>
      </div>
    </>
  );
}
