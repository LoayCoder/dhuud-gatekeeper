import { useTranslation } from 'react-i18next';
import { Globe, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
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

export function HeaderControls() {
  const { i18n } = useTranslation();
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

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="flex items-center gap-1">
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
    </div>
  );
}
