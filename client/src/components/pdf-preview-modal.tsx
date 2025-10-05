import { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Eye, 
  FileText, 
  Settings, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pdfGenerator, type PDFGenerationOptions } from '@/lib/pdf-generator';
import type { QuestionRequest } from '@shared/schema';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionRequest;
}

export function PDFPreviewModal({ isOpen, onClose, questions }: PDFPreviewModalProps) {
  const [previewContent, setPreviewContent] = useState<HTMLElement | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [options, setOptions] = useState<PDFGenerationOptions>({
    includeAnswers: true,
    includeExplanations: true,
    paperSize: 'A4',
    orientation: 'portrait'
  });
  
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Generate preview when modal opens
  useEffect(() => {
    if (isOpen && questions.generatedQuestions?.length) {
      generatePreview();
    }
  }, [isOpen, questions, options]);

  const generatePreview = async () => {
    if (!questions.generatedQuestions?.length) return;

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      const content = await pdfGenerator.generatePDFPreview(questions, options);
      setPreviewContent(content);
    } catch (error) {
      console.error('Preview generation failed:', error);
      setPreviewError('Không thể tạo xem trước. Vui lòng thử lại.');
      toast({
        title: "Lỗi xem trước",
        description: "Không thể tạo xem trước PDF. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleDownload = async () => {
    if (!questions.generatedQuestions?.length) return;

    setIsDownloading(true);

    try {
      await pdfGenerator.downloadPDF(questions, options);
      toast({
        title: "Tải xuống thành công!",
        description: "File PDF đã được tải về thiết bị của bạn.",
      });
      onClose();
    } catch (error) {
      console.error('PDF download failed:', error);
      toast({
        title: "Lỗi tải xuống",
        description: error instanceof Error ? error.message : "Không thể tải PDF. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const updateOptions = (key: keyof PDFGenerationOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPreviewContent(null);
      setPreviewError(null);
      setIsGeneratingPreview(false);
      setIsDownloading(false);
    }
  }, [isOpen]);

  const getQuestionCount = () => questions.generatedQuestions?.length || 0;
  const getAnswerCount = () => questions.generatedQuestions?.filter(q => q.correctAnswer).length || 0;
  const getExplanationCount = () => questions.generatedQuestions?.filter(q => q.explanation).length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col" data-testid="pdf-preview-modal">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2" data-testid="modal-title">
            <FileText className="w-5 h-5" />
            <span>Xem trước PDF</span>
          </DialogTitle>
          <DialogDescription>
            Xem trước nội dung PDF trước khi tải xuống. Bạn có thể tùy chỉnh các tùy chọn bên dưới.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Preview Panel */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span className="font-medium">Xem trước</span>
              </div>
              {isGeneratingPreview && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tạo xem trước...</span>
                </div>
              )}
            </div>

            <div className="flex-1 border rounded-lg bg-gray-50 min-h-0 max-h-[60vh] overflow-auto">
              <div className="p-4" data-testid="preview-content">
                  {isGeneratingPreview ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Đang tạo xem trước PDF...</p>
                      </div>
                    </div>
                  ) : previewError ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-3">
                        <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
                        <p className="text-sm text-destructive">{previewError}</p>
                        <Button variant="outline" size="sm" onClick={generatePreview}>
                          Thử lại
                        </Button>
                      </div>
                    </div>
                  ) : previewContent ? (
                    <div 
                      ref={previewRef}
                      className="bg-white shadow-sm"
                      style={{ 
                        transform: 'scale(0.7)', 
                        transformOrigin: 'top left',
                        width: '142.86%' // Compensate for scale
                      }}
                      dangerouslySetInnerHTML={{ __html: previewContent.innerHTML }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-3">
                        <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Chưa có nội dung xem trước</p>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Hủy
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={isDownloading || isGeneratingPreview || !previewContent}
            data-testid="button-download"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Tải xuống PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}