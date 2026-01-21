import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Globe, Sun, Moon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'fil', label: 'Filipino', dir: 'ltr' },
];

interface HeaderControlsProps {
  showLogout?: boolean;
  className?: string;
}

export function HeaderControls({ showLogout = false, className }: HeaderControlsProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { colorMode, setColorMode, resolvedMode } = useTheme();

  const handleLanguageChange = (langCode: string) => {
    const lang = LANGUAGES.find((l) => l.code === langCode);
    if (lang) {
      i18n.changeLanguage(langCode);
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = langCode;
    }
  };

  const toggleTheme = () => {
    if (resolvedMode === 'dark') {
      setColorMode('light');
    } else {
      setColorMode('dark');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: t('auth.loggedOut'),
      description: t('auth.loggedOutMessage'),
    });
    navigate('/invite');
  };

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Language Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            aria-label="Select language"
          >
            <Globe className="h-5 w-5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                'cursor-pointer',
                i18n.language === lang.code && 'bg-muted font-medium'
              )}
              dir={lang.dir}
            >
              {lang.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {resolvedMode === 'dark' ? (
          <Sun className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Moon className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>

      {/* Logout Button */}
      {showLogout && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={handleLogout}
          aria-label={t('auth.logout')}
        >
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
