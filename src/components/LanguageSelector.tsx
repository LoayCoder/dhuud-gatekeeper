import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'fil', label: 'Filipino', nativeLabel: 'Filipino' },
];

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const { profile, refreshProfile } = useAuth();

  const handleLanguageChange = async (langCode: string) => {
    // Change language immediately
    i18n.changeLanguage(langCode);

    // Save to localStorage for persistence
    localStorage.setItem('i18nextLng', langCode);

    // If user is authenticated, save to database
    if (profile?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ preferred_language: langCode })
          .eq('id', profile.id);
        
        // Refresh profile to sync state
        await refreshProfile();
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t('common.changeLanguage')} className="h-8 w-8">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t('common.changeLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem 
            key={lang.code} 
            onClick={() => handleLanguageChange(lang.code)}
            className={i18n.language === lang.code ? "bg-accent" : ""}
          >
            <span className="me-2">{lang.nativeLabel}</span>
            {lang.code !== 'en' && lang.code !== 'fil' && (
              <span className="text-muted-foreground text-xs">({lang.label})</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
