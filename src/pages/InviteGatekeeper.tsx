import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const inviteSchema = z.object({
  code: z.string().min(1, 'Invitation code is required'),
});

export default function InviteGatekeeper() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setPrimaryColor, setTenantName, setLogoUrl, setInvitationData } = useTheme();

  useEffect(() => {
    // Check if already logged in, redirect to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  const handleInviteValidation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input
      inviteSchema.parse({ code });

      setLoading(true);

      // Fetch invitation from database
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('*, tenants(*)')
        .eq('code', code.trim())
        .eq('used', false)
        .maybeSingle();

      if (inviteError) {
        throw new Error('Failed to validate invitation code');
      }

      if (!invitation) {
        toast({
          title: 'Invalid Code',
          description: 'This invitation code is invalid or has already been used.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if invitation has expired
      const expiresAt = new Date(invitation.expires_at);
      if (expiresAt < new Date()) {
        toast({
          title: 'Expired Code',
          description: 'This invitation code has expired.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Apply tenant branding
      if (invitation.tenants) {
        setPrimaryColor(invitation.tenants.brand_color);
        setTenantName(invitation.tenants.name);
        setLogoUrl(invitation.tenants.logo_url);
      }

      // Store invitation data in context
      setInvitationData(invitation.email, code.trim());

      // Check if user already exists
      const { data: checkData, error: checkError } = await supabase.functions.invoke(
        'check-user-exists',
        {
          body: { email: invitation.email },
        }
      );

      if (checkError) {
        console.error('Error checking user existence:', checkError);
        throw new Error('Failed to verify user status');
      }

      // Redirect based on user existence
      if (checkData.exists) {
        toast({
          title: 'Welcome Back',
          description: 'Please sign in with your existing account.',
        });
        navigate('/login');
      } else {
        toast({
          title: 'Welcome',
          description: 'Please complete your registration.',
        });
        navigate('/signup');
      }
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
          description: err instanceof Error ? err.message : 'Failed to validate invitation code',
          variant: 'destructive',
        });
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">Dhuud Platform</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Enter your invitation code to continue
          </p>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-14 w-full" />
            </div>
            <Skeleton className="h-14 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
          </div>
        )}

        {/* Invitation Code Form */}
        {!loading && (
          <form onSubmit={handleInviteValidation} className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-base">
                Invitation Code
              </Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter your code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="h-14 text-lg"
              />
            </div>

            <Button type="submit" className="h-14 w-full text-lg">
              Continue
            </Button>
          </form>
        )}

        {/* Login Link */}
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={() => navigate('/login')}
            className="text-sm"
          >
            Already have an account? Log in
          </Button>
        </div>

        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Protected by Zero Trust Security</span>
        </div>
      </div>
    </div>
  );
}
