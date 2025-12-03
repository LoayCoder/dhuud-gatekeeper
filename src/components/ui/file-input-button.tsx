import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Upload } from 'lucide-react';

interface FileInputButtonProps {
  accept?: string;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const FileInputButton = React.forwardRef<HTMLInputElement, FileInputButtonProps>(
  ({ accept, disabled, onChange, className }, ref) => {
    const { t } = useTranslation();
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleClick = () => {
      inputRef.current?.click();
    };

    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onChange}
          disabled={disabled}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={disabled}
          className="w-full gap-2 ltr:flex-row rtl:flex-row-reverse"
        >
          <Upload className="h-4 w-4" />
          {t('adminBranding.assets.favicon.chooseFile')}
        </Button>
      </div>
    );
  }
);

FileInputButton.displayName = 'FileInputButton';
