import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Unlock, Shield, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const inviteSchema = z.object({
  code: z.string().min(1, 'Invitation code is required'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function Register() {
  const [step, setStep] = useState<'locked' | 'unlocked'>('locked');
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setPrimaryColor, setTenantName, setLogoUrl } = useTheme();
  const navigate = useNavigate();

  const validateInviteCode = async () => {
    try {
      // Validate input
      inviteSchema.parse({ code: inviteCode });
      
      setLoading(true);

      // Query invitation
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('*, tenants(*)')
        .eq('code', inviteCode.toUpperCase())
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !invitation) {
        toast({
          title: 'Invalid Code',
          description: 'The invitation code is invalid or has expired.',
          variant: 'destructive',
        });
        return;
      }

      // Apply tenant branding
      setPrimaryColor(invitation.tenants.brand_color);
      setTenantName(invitation.tenants.name);
      setLogoUrl(invitation.tenants.logo_url);
      setEmail(invitation.email);

      // Unlock the form
      setStep('unlocked');

      toast({
        title: 'Code Accepted',
        description: `Welcome to ${invitation.tenants.name}!`,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input
      signupSchema.parse({ email, password });
      
      setLoading(true);

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // Mark invitation as used
      await supabase
        .from('invitations')
        .update({ used: true })
        .eq('code', inviteCode.toUpperCase());

      toast({
        title: 'Account Created',
        description: 'Your account has been created successfully!',
      });

      navigate('/');
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
          description: err instanceof Error ? err.message : 'Failed to create account',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md transition-smooth">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {step === 'locked' ? (
              <Lock className="h-8 w-8 text-primary" />
            ) : (
              <Unlock className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-3xl font-bold">
            {step === 'locked' ? 'Zero Trust Access' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {step === 'locked'
              ? 'Enter your invitation code to proceed'
              : 'Complete your registration'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'locked' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invitation Code</Label>
                <Input
                  id="invite-code"
                  placeholder="XXXX-XXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="text-center font-semibold tracking-wider"
                  disabled={loading}
                />
              </div>

              <Button
                onClick={validateInviteCode}
                className="w-full"
                disabled={loading || !inviteCode}
              >
                {loading ? 'Validating...' : 'Unlock'}
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Protected by Zero Trust Security</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Code Verified</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate('/login')}
                  className="text-sm"
                >
                  Already have an account? Sign in
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
