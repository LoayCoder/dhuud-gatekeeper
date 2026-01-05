import { useTranslation } from 'react-i18next';
import { Phone, MessageCircle, User, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useHSSEContact } from '@/hooks/use-hsse-contact';
import { useCachedProfile } from '@/hooks/use-cached-profile';

export function HSSEContactCard() {
  const { t } = useTranslation();
  const { data: profile, isLoading: profileLoading } = useCachedProfile();
  const { data: contact, isLoading: contactLoading } = useHSSEContact(
    profile?.assigned_branch_id || null
  );

  const isLoading = profileLoading || contactLoading;

  // Format phone number for WhatsApp link
  const formatWhatsAppNumber = (phone: string | null) => {
    if (!phone) return '';
    // Remove spaces, dashes, and add country code if not present
    let cleaned = phone.replace(/[\s-]/g, '');
    if (!cleaned.startsWith('+')) {
      // Assume Saudi Arabia if no country code
      cleaned = '+966' + cleaned.replace(/^0/, '');
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
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!contact) {
    return (
      <Card>
        <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          {t('home.yourHSSEContact')}
        </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('home.noContactAssigned')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const whatsappUrl = `https://wa.me/${formatWhatsAppNumber(contact.phone_number)}`;
  const telUrl = `tel:${contact.phone_number}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          {t('home.yourHSSEContact')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full text-start">
              <div className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact.avatar_url || undefined} />
                  <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {getInitials(contact.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{contact.full_name}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {getRoleLabel(contact.role_code)}
                  </Badge>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
              </div>
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
                  <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xl">
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
          <div className="flex gap-2 mt-4">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <a href={telUrl}>
                <Phone className="h-4 w-4 me-2" />
                {t('home.call')}
              </a>
            </Button>
            <Button asChild size="sm" className="flex-1 bg-success hover:bg-success/90">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 me-2" />
                {t('home.whatsapp')}
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
