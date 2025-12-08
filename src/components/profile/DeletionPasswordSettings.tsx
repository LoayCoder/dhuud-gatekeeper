import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Check, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeletionPassword } from '@/hooks/use-deletion-password';

export function DeletionPasswordSettings() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { isLoading, isConfigured, checkStatus, setPassword } = useDeletionPassword();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleSubmit = async () => {
    setError(null);
    
    // Validate password length
    if (newPassword.length < 6) {
      setError(t('profile.deletionPassword.minLength'));
      return;
    }
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError(t('profile.deletionPassword.passwordMismatch'));
      return;
    }
    
    const success = await setPassword(newPassword);
    if (success) {
      setDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    }
    setDialogOpen(open);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">{t('profile.deletionPassword.title')}</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {t('profile.deletionPassword.description')}
      </p>
      
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{t('common.status')}:</span>
          {isConfigured === null ? (
            <Badge variant="outline">{t('common.loading')}</Badge>
          ) : isConfigured ? (
            <Badge variant="default" className="gap-1">
              <Check className="h-3 w-3" />
              {t('profile.deletionPassword.configured')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <X className="h-3 w-3" />
              {t('profile.deletionPassword.notConfigured')}
            </Badge>
          )}
        </div>
        
        <Button onClick={() => setDialogOpen(true)} variant="outline">
          {isConfigured 
            ? t('profile.deletionPassword.changePassword') 
            : t('profile.deletionPassword.setPassword')
          }
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {isConfigured 
                ? t('profile.deletionPassword.changePassword') 
                : t('profile.deletionPassword.setPassword')
              }
            </DialogTitle>
            <DialogDescription>
              {t('profile.deletionPassword.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('profile.deletionPassword.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••"
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('profile.deletionPassword.minLength')}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('profile.deletionPassword.confirmPassword')}</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
