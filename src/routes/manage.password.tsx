import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/manage/password")({
  component: PasswordPage,
});

function PasswordPage() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pwd !== confirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    setPwd(""); setConfirm("");
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Change Password</h1>
      <form onSubmit={submit} className="bg-card border border-border/60 rounded-xl p-6 max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">New password</label>
          <input type="password" required value={pwd} onChange={e => setPwd(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Confirm new password</label>
          <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <button disabled={saving} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {saving ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
