import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function SecuritySettings() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Check requirements in real-time
  const requirements: PasswordRequirement[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "One number (0-9)", met: /[0-9]/.test(password) },
  ];

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const allRequirementsMet = requirements.every(r => r.met);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0]?.message || "Invalid password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      
      // Clear form after successful update
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Requirements */}
      <div className="rounded-lg border p-4 bg-muted/5">
        <h4 className="text-sm font-medium mb-3">Password Requirements</h4>
        <ul className="space-y-2">
          {requirements.map((req, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              {req.met ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                {req.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              placeholder="Enter new password"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-9"
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>
          {confirmPassword.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              {passwordsMatch ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Passwords match</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Passwords do not match</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            type="submit" 
            disabled={loading || !allRequirementsMet || !passwordsMatch}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
}
