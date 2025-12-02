import { useTranslation } from 'react-i18next';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { colorMode, setColorMode, resolvedMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {resolvedMode === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">{t('common.toggleTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setColorMode('light')}>
          <Sun className="me-2 h-4 w-4" />
          {t('common.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setColorMode('dark')}>
          <Moon className="me-2 h-4 w-4" />
          {t('common.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setColorMode('system')}>
          <Monitor className="me-2 h-4 w-4" />
          {t('common.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
