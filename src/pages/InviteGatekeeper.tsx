import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTheme, TenantBrandingData } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
const inviteSchema = z.object({
  code: z.string().min(1, 'Invitation code is required')
});
export default function InviteGatekeeper() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    applyTenantBranding,
    setInvitationData,
    tenantName,
    activeLogoUrl,
    isLoading: themeLoading
  } = useTheme();
  useEffect(() => {
    // Check if already logged in, redirect to dashboard
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);
  const handleInviteValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate input
      inviteSchema.parse({
        code
      });
      setLoading(true);

      // Fetch invitation securely via RPC (works for anonymous users)
      const {
        data: result,
        error: inviteError
      } = await supabase.rpc('lookup_invitation', {
        lookup_code: code.trim()
      });
      if (inviteError) {
        throw new Error('Failed to validate invitation code');
      }
      if (!result) {
        toast({
          title: 'Invalid Code',
          description: 'This invitation code is invalid, expired, or has already been used.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      const inviteData = result as unknown as TenantBrandingData & {
        email: string;
        tenant_id: string;
      };

      // Apply full tenant branding from the RPC result
      applyTenantBranding(inviteData);

      // Store invitation data in context
      setInvitationData(inviteData.email, code.trim(), inviteData.tenant_id);

      // Check if user already exists
      const {
        data: checkData,
        error: checkError
      } = await supabase.functions.invoke('check-user-exists', {
        body: {
          email: inviteData.email
        }
      });
      if (checkError) {
        console.error('Error checking user existence:', checkError);
        throw new Error('Failed to verify user status');
      }

      // Redirect based on user existence
      if (checkData.exists) {
        toast({
          title: 'Welcome Back',
          description: 'Please sign in with your existing account.'
        });
        navigate('/login');
      } else {
        toast({
          title: 'Welcome',
          description: 'Please complete your registration.'
        });
        navigate('/signup');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to validate invitation code',
          variant: 'destructive'
        });
      }
      setLoading(false);
    }
  };
  return <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-6 flex items-center justify-center">
            {themeLoading ? <Skeleton className="h-16 w-40 sm:h-20 sm:w-48 md:h-24 md:w-56" /> : activeLogoUrl ? <img src={activeLogoUrl} alt={tenantName} className="h-16 w-auto max-w-[200px] sm:h-20 sm:max-w-[240px] md:h-24 md:max-w-[280px] object-fill" /> : <Shield className="h-16 w-16 sm:h-20 sm:w-20 text-primary" />}
          </div>
          <h1 className="text-4xl font-bold">{themeLoading ? <Skeleton className="h-10 w-48 mx-auto" /> : tenantName}</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Enter your invitation code to continue
          </p>
        </div>

        {/* Loading Skeleton */}
        {loading && <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-14 w-full" />
            </div>
            <Skeleton className="h-14 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
          </div>}

        {/* Invitation Code Form */}
        {!loading && <form onSubmit={handleInviteValidation} className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-base">
                Invitation Code
              </Label>
              <Input id="code" type="text" placeholder="Enter your code" value={code} onChange={e => setCode(e.target.value)} required className="h-14 text-lg" />
            </div>

            <Button type="submit" className="h-14 w-full text-lg">
              Continue
            </Button>
          </form>}

        {/* Login Link */}
        <div className="text-center">
          <Button type="button" variant="link" onClick={() => navigate('/login')} className="text-sm">
            Already have an account? Log in
          </Button>
        </div>

        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Protected by Zero Trust Security</span>
        </div>
      </div>
    </div>;
}