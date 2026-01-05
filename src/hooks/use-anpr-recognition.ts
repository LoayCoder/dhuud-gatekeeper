import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface ANPRResult {
  plate: string | null;
  confidence: number;
  vehicle_color: string | null;
  vehicle_type: string | null;
}

export function useANPRRecognition() {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ANPRResult | null>(null);

  const recognizePlate = async (imageBase64: string): Promise<ANPRResult | null> => {
    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('anpr-recognize', {
        body: { image_base64: imageBase64 },
      });

      if (error) {
        console.error('[ANPR] Function error:', error);
        toast.error(t('security.anpr.error', 'Recognition failed'), {
          description: error.message,
        });
        return null;
      }

      if (!data.success) {
        toast.error(t('security.anpr.error', 'Recognition failed'), {
          description: data.error || 'Unknown error',
        });
        return null;
      }

      const recognitionResult: ANPRResult = {
        plate: data.plate || null,
        confidence: data.confidence || 0,
        vehicle_color: data.vehicle_color || null,
        vehicle_type: data.vehicle_type || null,
      };

      setResult(recognitionResult);

      if (recognitionResult.plate) {
        toast.success(t('security.anpr.recognized', 'Plate recognized'), {
          description: `${recognitionResult.plate} (${recognitionResult.confidence}%)`,
        });
      } else {
        toast.warning(t('security.anpr.noPlate', 'No plate detected'), {
          description: t('security.anpr.enterManually', 'Please enter the plate manually'),
        });
      }

      return recognitionResult;
    } catch (err) {
      console.error('[ANPR] Error:', err);
      toast.error(t('security.anpr.error', 'Recognition failed'));
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setIsProcessing(false);
  };

  return {
    recognizePlate,
    isProcessing,
    result,
    reset,
  };
}
