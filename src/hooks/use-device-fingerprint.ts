import { useMemo } from 'react';

interface DeviceInfo {
  fingerprint: string;
  platform: string;
  browser: string;
  userAgent: string;
}

function getBrowserName(userAgent: string): string {
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function getPlatformName(): string {
  const platform = navigator.platform?.toLowerCase() || '';
  const userAgent = navigator.userAgent?.toLowerCase() || '';
  
  if (platform.includes('mac')) return 'macOS';
  if (platform.includes('win')) return 'Windows';
  if (platform.includes('linux')) return 'Linux';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
  if (userAgent.includes('android')) return 'Android';
  return 'Unknown';
}

function generateFingerprint(): string {
  const components = [
    navigator.userAgent || '',
    navigator.language || '',
    `${screen.width}x${screen.height}`,
    screen.colorDepth?.toString() || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.hardwareConcurrency?.toString() || '0',
    navigator.platform || '',
    new Date().getTimezoneOffset().toString(),
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to base36 for shorter string
  return Math.abs(hash).toString(36) + '_' + btoa(str.slice(0, 32)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
}

export function useDeviceFingerprint(): DeviceInfo {
  return useMemo(() => ({
    fingerprint: generateFingerprint(),
    platform: getPlatformName(),
    browser: getBrowserName(navigator.userAgent),
    userAgent: navigator.userAgent,
  }), []);
}

export function getDeviceFingerprint(): DeviceInfo {
  return {
    fingerprint: generateFingerprint(),
    platform: getPlatformName(),
    browser: getBrowserName(navigator.userAgent),
    userAgent: navigator.userAgent,
  };
}
