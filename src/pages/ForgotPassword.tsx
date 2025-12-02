import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      resetSchema.parse({ email });
      setLoading(true);

      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: 'Check Your Email',
        description: 'We sent you a password reset link. Please check your inbox.',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to send reset email',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-muted-foreground">
            {emailSent
              ? 'Check your email for the reset link'
              : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12"
              />
            </div>

            <Button type="submit" className="h-12 w-full text-lg" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/login')}
                className="text-sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-sm">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/login')}
              className="h-12 w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </div>
        )}

        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Protected by Zero Trust Security</span>
        </div>
      </div>
    </div>
  );
}
