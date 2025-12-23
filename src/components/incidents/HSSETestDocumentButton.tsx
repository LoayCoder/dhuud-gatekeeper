import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { generateHSSETestDocument, downloadHSSETestDocument } from '@/lib/hsse-test-document';
import { toast } from 'sonner';

export function HSSETestDocumentButton() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateHSSETestDocument();
      downloadHSSETestDocument(blob);
      toast.success('Test document downloaded successfully');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isGenerating} variant="outline">
      {isGenerating ? (
        <Loader2 className="me-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="me-2 h-4 w-4" />
      )}
      Download HSSE Test Document
    </Button>
  );
}
