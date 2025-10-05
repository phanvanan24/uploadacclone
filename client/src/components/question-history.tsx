import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  History, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  Eye, 
  Calendar, 
  BookOpen, 
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { historyManager } from "@/lib/history-manager";
import type { QuestionHistoryEntry, QuestionRequest, InsertQuestionRequest } from "@shared/schema";

interface QuestionHistoryProps {
  onLoadQuestions?: (questions: QuestionRequest) => void;
  onLoadToForm?: (formData: InsertQuestionRequest) => void;
}

export function QuestionHistory({ onLoadQuestions, onLoadToForm }: QuestionHistoryProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<QuestionHistoryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<QuestionHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<QuestionHistoryEntry | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load history entries when modal opens
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  // Apply filters and search
  useEffect(() => {
    let filtered = historyEntries;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = historyManager.searchHistory(searchQuery);
    }

    // Apply subject filter
    if (subjectFilter !== "all") {
      filtered = filtered.filter(entry => entry.subject === subjectFilter);
    }

    setFilteredEntries(filtered);
  }, [historyEntries, searchQuery, subjectFilter]);

  const loadHistory = () => {
    try {
      const entries = historyManager.getHistoryEntries();
      setHistoryEntries(entries);
    } catch (error) {
      toast({
        title: "Lỗi tải lịch sử",
        description: error instanceof Error ? error.message : "Không thể tải lịch sử",
        variant: "destructive"
      });
    }
  };

  const handleLoadQuestions = (entry: QuestionHistoryEntry) => {
    if (onLoadQuestions) {
      const questionRequest: QuestionRequest = {
        id: entry.id,
        subject: entry.subject,
        difficulty: entry.difficulty,
        topic: entry.topic,
        requirements: entry.requirements ?? null,
        questionTypes: entry.questionTypes,
        questionCount: entry.questionCount,
        generatedQuestions: entry.generatedQuestions,
        createdAt: new Date(entry.createdAt),
      };
      onLoadQuestions(questionRequest);
      setIsOpen(false);
      toast({
        title: "Đã tải câu hỏi",
        description: `Đã tải ${entry.generatedQuestions.length} câu hỏi từ lịch sử`,
      });
    }
  };

  const handleLoadToForm = (entry: QuestionHistoryEntry) => {
    if (onLoadToForm) {
      const formData: InsertQuestionRequest = {
        subject: entry.subject,
        difficulty: entry.difficulty as "easy" | "medium" | "hard",
        topic: entry.topic,
        requirements: entry.requirements,
        questionTypes: entry.questionTypes as ("multiple_choice" | "true_false" | "essay")[],
        questionCount: entry.questionCount,
      };
      onLoadToForm(formData);
      setIsOpen(false);
      toast({
        title: "Đã tải vào form",
        description: "Dữ liệu đã được tải vào form để chỉnh sửa",
      });
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      const success = historyManager.deleteHistoryEntry(entryId);
      if (success) {
        loadHistory();
        toast({
          title: "Đã xóa",
          description: "Mục lịch sử đã được xóa",
        });
      } else {
        toast({
          title: "Lỗi",
          description: "Không thể xóa mục này",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi xóa",
        description: error instanceof Error ? error.message : "Không thể xóa mục",
        variant: "destructive"
      });
    }
  };

  const handleClearAll = async () => {
    try {
      historyManager.clearAllHistory();
      loadHistory();
      setShowClearConfirm(false);
      toast({
        title: "Đã xóa tất cả",
        description: "Toàn bộ lịch sử đã được xóa",
      });
    } catch (error) {
      toast({
        title: "Lỗi xóa",
        description: error instanceof Error ? error.message : "Không thể xóa lịch sử",
        variant: "destructive"
      });
    }
  };

  const handleEditName = (entry: QuestionHistoryEntry) => {
    setEditingNameId(entry.id);
    setEditNameValue(entry.customName || "");
  };

  const handleSaveName = async () => {
    if (editingNameId) {
      try {
        historyManager.updateCustomName(editingNameId, editNameValue);
        loadHistory();
        setEditingNameId(null);
        toast({
          title: "Đã lưu",
          description: "Tên tùy chỉnh đã được cập nhật",
        });
      } catch (error) {
        toast({
          title: "Lỗi lưu",
          description: error instanceof Error ? error.message : "Không thể lưu tên",
          variant: "destructive"
        });
      }
    }
  };

  const handleExport = () => {
    try {
      const exportData = historyManager.exportHistory();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questiongen-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Đã xuất",
        description: "Lịch sử đã được xuất thành file JSON",
      });
    } catch (error) {
      toast({
        title: "Lỗi xuất",
        description: error instanceof Error ? error.message : "Không thể xuất lịch sử",
        variant: "destructive"
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        const result = historyManager.importHistory(importData, true);
        
        if (result.success) {
          loadHistory();
          toast({
            title: "Import thành công",
            description: `Đã import ${result.importedCount} mục. ${result.errors.length > 0 ? `${result.errors.length} lỗi.` : ''}`,
          });
          
          if (result.errors.length > 0) {
            console.warn("Import errors:", result.errors);
          }
        } else {
          toast({
            title: "Import thất bại",
            description: result.errors.join(", "),
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Lỗi import",
          description: error instanceof Error ? error.message : "File không hợp lệ",
          variant: "destructive"
        });
      } finally {
        setIsImporting(false);
        // Reset file input
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const getSubjectLabel = (subject: string) => {
    const labels: Record<string, string> = {
      'toan': 'Toán học',
      'ly': 'Vật lý',
      'hoa': 'Hóa học',
      'sinh': 'Sinh học',
      'van': 'Ngữ văn',
      'anh': 'Tiếng Anh',
      'su': 'Lịch sử',
      'dia': 'Địa lý',
      'gdcd': 'Giáo dục công dân',
      'tin': 'Tin học'
    };
    return labels[subject] || subject;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      'easy': 'Dễ',
      'medium': 'Trung bình', 
      'hard': 'Khó'
    };
    return labels[difficulty] || difficulty;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      'easy': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      'hard': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const uniqueSubjects = Array.from(new Set(historyEntries.map(entry => entry.subject)));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2" data-testid="button-history">
            <History className="w-4 h-4" />
            <span>Lịch sử ({historyEntries.length})</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col" data-testid="dialog-history">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <History className="w-5 h-5" />
              <span>Lịch sử câu hỏi</span>
            </DialogTitle>
            <DialogDescription>
              Quản lý và tải lại các câu hỏi đã tạo trước đây
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 py-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo chủ đề, môn học..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-history"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger data-testid="select-filter-subject">
                  <SelectValue placeholder="Lọc môn học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả môn học</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {getSubjectLabel(subject)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={handleExport} variant="outline" size="sm" data-testid="button-export">
              <Download className="w-4 h-4 mr-1" />
              Xuất
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-history"
                disabled={isImporting}
              />
              <Button 
                onClick={() => document.getElementById('import-history')?.click()}
                variant="outline" 
                size="sm"
                disabled={isImporting}
                data-testid="button-import"
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Import
              </Button>
            </div>
            {historyEntries.length > 0 && (
              <Button 
                onClick={() => setShowClearConfirm(true)}
                variant="outline" 
                size="sm"
                className="text-destructive hover:text-destructive"
                data-testid="button-clear-all"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Xóa tất cả
              </Button>
            )}
          </div>

          {/* History List */}
          <ScrollArea className="flex-1 max-h-[500px]">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-history">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  {historyEntries.length === 0 ? "Chưa có lịch sử" : "Không tìm thấy kết quả"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {historyEntries.length === 0 
                    ? "Các câu hỏi được tạo sẽ tự động lưu vào lịch sử" 
                    : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow" data-testid={`history-entry-${entry.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          {editingNameId === entry.id ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                placeholder="Nhập tên tùy chỉnh..."
                                className="max-w-sm"
                                data-testid={`input-edit-name-${entry.id}`}
                              />
                              <Button size="sm" onClick={handleSaveName} data-testid={`button-save-name-${entry.id}`}>
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingNameId(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <CardTitle className="text-base flex items-center space-x-2">
                              <span>{entry.customName || entry.topic}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditName(entry)}
                                className="h-6 w-6 p-0"
                                data-testid={`button-edit-name-${entry.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </CardTitle>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {getSubjectLabel(entry.subject)}
                            </Badge>
                            <Badge className={`text-xs ${getDifficultyColor(entry.difficulty)}`}>
                              {getDifficultyLabel(entry.difficulty)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              {entry.generatedQuestions.length} câu
                            </Badge>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(entry.createdAt)}
                            </div>
                            {entry.savedAt && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                <Save className="w-3 h-3 mr-1" />
                                Đã lưu
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {!entry.customName && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Chủ đề: {entry.topic}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleLoadQuestions(entry)}
                          data-testid={`button-load-${entry.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Tải câu hỏi
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleLoadToForm(entry)}
                          data-testid={`button-load-form-${entry.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Tải vào form
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setIsPreviewOpen(true);
                          }}
                          data-testid={`button-preview-${entry.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Xem trước
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                          data-testid={`button-delete-${entry.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-preview">
          <DialogHeader>
            <DialogTitle>Xem trước câu hỏi</DialogTitle>
            <DialogDescription>
              {selectedEntry && `${getSubjectLabel(selectedEntry.subject)} - ${selectedEntry.topic}`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            {selectedEntry?.generatedQuestions.map((question) => (
              <div key={question.id} className="mb-6 p-4 border rounded-lg" data-testid={`preview-question-${question.id}`}>
                <div className="font-medium mb-2">
                  Câu {question.id}: <span dangerouslySetInnerHTML={{ __html: question.question }} />
                </div>
                {question.options && (
                  <div className="space-y-1 pl-4 mb-2">
                    {question.options.map((option, index) => (
                      <div key={index} className="text-sm">
                        {String.fromCharCode(65 + index)}. <span dangerouslySetInnerHTML={{ __html: option }} />
                      </div>
                    ))}
                  </div>
                )}
                {question.correctAnswer && (
                  <div className="text-sm text-green-600 font-medium">
                    Đáp án: {question.correctAnswer}
                  </div>
                )}
                {question.explanation && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Giải thích: <span dangerouslySetInnerHTML={{ __html: question.explanation }} />
                  </div>
                )}
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent data-testid="dialog-clear-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span>Xác nhận xóa</span>
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa toàn bộ lịch sử? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleClearAll} data-testid="button-confirm-clear">
              Xóa tất cả
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}