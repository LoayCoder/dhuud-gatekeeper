import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = ['ar', 'ur'];

export function useRTL() {
  const { i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  
  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'text-end' : 'text-start',
    flexReverse: isRTL ? 'flex-row-reverse' : 'flex-row',
    startAlign: isRTL ? 'end' : 'start',
    endAlign: isRTL ? 'start' : 'end',
  } as const;
}
