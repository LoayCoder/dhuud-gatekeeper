/**
 * GPS Capture Hook
 * Provides utilities for capturing GPS coordinates
 */

import { useState, useCallback } from 'react';

export interface GPSCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface UseGPSCaptureResult {
  coordinates: GPSCoordinates | null;
  isCapturing: boolean;
  error: string | null;
  captureGPS: () => Promise<GPSCoordinates | null>;
  clearCoordinates: () => void;
}

export function useGPSCapture(): UseGPSCaptureResult {
  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureGPS = useCallback(async (): Promise<GPSCoordinates | null> => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return null;
    }

    setIsCapturing(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GPSCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoordinates(coords);
          setIsCapturing(false);
          resolve(coords);
        },
        (err) => {
          let errorMessage = 'Failed to get location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          setError(errorMessage);
          setIsCapturing(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const clearCoordinates = useCallback(() => {
    setCoordinates(null);
    setError(null);
  }, []);

  return {
    coordinates,
    isCapturing,
    error,
    captureGPS,
    clearCoordinates,
  };
}

/**
 * Get current GPS coordinates without hook state
 * Useful for one-time captures during file upload
 */
export async function getCurrentGPS(): Promise<GPSCoordinates | null> {
  if (!navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
