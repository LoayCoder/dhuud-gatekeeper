export type LabelSizeKey = 'small' | 'medium' | 'large' | 'xlarge' | 'custom';

export interface LabelSizeSpec {
  key: LabelSizeKey;
  widthMM: number;
  heightMM: number;
  label: string;
  description: string;
}

export const LABEL_SIZES: LabelSizeSpec[] = [
  { key: 'small', widthMM: 30, heightMM: 20, label: '30×20mm', description: 'assets.labelSettings.smallDescription' },
  { key: 'medium', widthMM: 50, heightMM: 25, label: '50×25mm', description: 'assets.labelSettings.mediumDescription' },
  { key: 'large', widthMM: 70, heightMM: 30, label: '70×30mm', description: 'assets.labelSettings.largeDescription' },
  { key: 'xlarge', widthMM: 100, heightMM: 50, label: '100×50mm', description: 'assets.labelSettings.xlargeDescription' },
  { key: 'custom', widthMM: 50, heightMM: 30, label: 'assets.labelSettings.customSize', description: 'assets.labelSettings.customDescription' },
];

export interface LabelContentSettings {
  showAssetName: boolean;
  showZone: boolean;
  showCategory: boolean;
  showSerialNumber: boolean;
  showDepartment: boolean;
  customText: string;
}

export interface LabelSettings {
  size: LabelSizeKey;
  customWidthMM: number;
  customHeightMM: number;
  content: LabelContentSettings;
}

export const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  size: 'small',
  customWidthMM: 50,
  customHeightMM: 30,
  content: {
    showAssetName: false,
    showZone: true,
    showCategory: false,
    showSerialNumber: false,
    showDepartment: false,
    customText: '',
  },
};

export const LABEL_SETTINGS_STORAGE_KEY = 'asset-label-settings';

export function getLabelSizeSpec(key: LabelSizeKey, customWidth?: number, customHeight?: number): LabelSizeSpec {
  if (key === 'custom' && customWidth && customHeight) {
    return {
      key: 'custom',
      widthMM: customWidth,
      heightMM: customHeight,
      label: `${customWidth}×${customHeight}mm`,
      description: 'assets.labelSettings.customDescription',
    };
  }
  return LABEL_SIZES.find(s => s.key === key) || LABEL_SIZES[0];
}

export function loadLabelSettings(): LabelSettings {
  try {
    const stored = localStorage.getItem(LABEL_SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as LabelSettings;
    }
  } catch (e) {
    console.error('Failed to load label settings:', e);
  }
  return DEFAULT_LABEL_SETTINGS;
}

export function saveLabelSettings(settings: LabelSettings): void {
  try {
    localStorage.setItem(LABEL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save label settings:', e);
  }
}
