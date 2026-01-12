import { useTranslation } from 'react-i18next';
import { Phone, MessageCircle, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHSSEContact } from '@/hooks/use-hsse-contact';
import { useCachedProfile } from '@/hooks/use-cached-profile';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface HSSEContactCompactProps {
  className?: string;
}

export function HSSEContactCompact({ className }: HSSEContactCompactProps) {
  const { t } = useTranslation();
  const { data: profile, isLoading: profileLoading } = useCachedProfile();
  const { data: contact, isLoading: contactLoading } = useHSSEContact(
    profile?.assigned_branch_id || null,
    profile?.assigned_site_id || null
  );

  const isLoading = profileLoading || contactLoading;

  const formatWhatsAppNumber = (phone: string | null) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '966' + cleaned.slice(1);
    } else if (!cleaned.startsWith('966') && !cleaned.startsWith('1') && cleaned.length <= 10) {
      cleaned = '966' + cleaned;
    }
    return cleaned;
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'HS';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (roleCode: string) => {
    const roleMap: Record<string, string> = {
      hsse_officer: t('roles.hsseOfficer', 'HSSE Officer'),
      hsse_expert: t('roles.hsseExpert', 'HSSE Expert'),
      hsse_manager: t('roles.hsseManager', 'HSSE Manager'),
    };
    return roleMap[roleCode] || roleCode;
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50', className)}>
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  const whatsappUrl = `https://wa.me/${formatWhatsAppNumber(contact.phone_number)}`;
  const telUrl = `tel:${contact.phone_number}`;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm',
        className
      )}
    >
      <Dialog>
        <DialogTrigger asChild>
          <button className="flex items-center gap-3 flex-1 min-w-0 text-start hover:opacity-80 transition-opacity">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={contact.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                {getInitials(contact.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{contact.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t('home.yourHSSEContact')}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 rtl:rotate-180" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('home.contactInfo')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={contact.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                  {getInitials(contact.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-lg font-semibold">{contact.full_name}</p>
                <Badge variant="secondary" className="mt-1">
                  {getRoleLabel(contact.role_code)}
                </Badge>
              </div>
            </div>

            {contact.phone_number && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('common.phone')}</p>
                <p className="font-medium" dir="ltr">{contact.phone_number}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {contact.phone_number && (
                <>
                  <Button asChild className="flex-1" variant="outline">
                    <a href={telUrl}>
                      <Phone className="h-4 w-4 me-2" />
                      {t('home.call')}
                    </a>
                  </Button>
                  <Button asChild className="flex-1 bg-success hover:bg-success/90">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 me-2" />
                      {t('home.whatsapp')}
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick action buttons */}
      {contact.phone_number && (
        <div className="flex gap-2 shrink-0">
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <a href={telUrl} aria-label={t('home.call')}>
              <Phone className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild size="icon" className="h-9 w-9 bg-success hover:bg-success/90">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={t('home.whatsapp')}>
              <MessageCircle className="h-4 w-4" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
