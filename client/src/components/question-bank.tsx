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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Database, 
  Plus, 
  Search, 
  Filter,
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
  Loader2,
  Copy,
  Settings,
  MoreVertical,
  FolderPlus,
  Archive,
  Tag,
  BarChart3,
  Share,
  Star,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bankManager } from "@/lib/bank-manager";
import type { 
  QuestionBank, 
  QuestionBankEntry, 
  CreateBankData, 
  BankSearchFilters,
  QuestionRequest,
  QuestionHistoryEntry
} from "@shared/schema";
import { createBankSchema } from "@shared/schema";

interface QuestionBankManagerProps {
  onLoadQuestions?: (questions: QuestionRequest) => void;
  onAddToBank?: (bank: QuestionBank) => void;
}

export function QuestionBankManager({ onLoadQuestions, onAddToBank }: QuestionBankManagerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<QuestionBank[]>([]);
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [currentView, setCurrentView] = useState<"grid" | "list">("grid");
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBankDetailOpen, setIsBankDetailOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Forms
  const createForm = useForm<CreateBankData>({
    resolver: zodResolver(createBankSchema),
    defaultValues: {
      name: "",
      description: "",
      subject: "",
      tags: [],
    },
  });

  const editForm = useForm<CreateBankData>({
    resolver: zodResolver(createBankSchema),
    defaultValues: {
      name: "",
      description: "",
      subject: "",
      tags: [],
    },
  });

  // Load banks when modal opens
  useEffect(() => {
    if (isOpen) {
      loadBanks();
    }
  }, [isOpen]);

  // Apply filters and search
  useEffect(() => {
    let filtered = banks;

    // Apply search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(bank =>
        bank.name.toLowerCase().includes(searchTerm) ||
        bank.description?.toLowerCase().includes(searchTerm) ||
        bank.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply subject filter
    if (subjectFilter !== "all") {
      filtered = filtered.filter(bank => bank.subject === subjectFilter);
    }

    setFilteredBanks(filtered);
  }, [banks, searchQuery, subjectFilter]);

  const loadBanks = () => {
    try {
      const loadedBanks = bankManager.getBanks();
      setBanks(loadedBanks);
    } catch (error) {
      toast({
        title: "Lỗi tải ngân hàng",
        description: error instanceof Error ? error.message : "Không thể tải ngân hàng",
        variant: "destructive"
      });
    }
  };

  const handleCreateBank = async (data: CreateBankData) => {
    try {
      const newBank = bankManager.createBank(data);
      loadBanks();
      setIsCreateModalOpen(false);
      createForm.reset();
      
      toast({
        title: "Tạo thành công!",
        description: `Ngân hàng "${data.name}" đã được tạo`,
      });

      if (onAddToBank) {
        onAddToBank(newBank);
      }
    } catch (error) {
      toast({
        title: "Lỗi tạo ngân hàng",
        description: error instanceof Error ? error.message : "Không thể tạo ngân hàng",
        variant: "destructive"
      });
    }
  };

  const handleEditBank = async (data: CreateBankData) => {
    if (!selectedBank) return;

    try {
      bankManager.updateBank(selectedBank.id, data);
      loadBanks();
      setIsEditModalOpen(false);
      setSelectedBank(null);
      editForm.reset();
      
      toast({
        title: "Cập nhật thành công!",
        description: `Ngân hàng "${data.name}" đã được cập nhật`,
      });
    } catch (error) {
      toast({
        title: "Lỗi cập nhật",
        description: error instanceof Error ? error.message : "Không thể cập nhật ngân hàng",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBank = async (bankId: string) => {
    try {
      const success = bankManager.deleteBank(bankId);
      if (success) {
        loadBanks();
        setShowDeleteConfirm(null);
        toast({
          title: "Đã xóa",
          description: "Ngân hàng đã được xóa",
        });
      } else {
        toast({
          title: "Lỗi",
          description: "Không thể xóa ngân hàng",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi xóa",
        description: error instanceof Error ? error.message : "Không thể xóa ngân hàng",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateBank = async (bankId: string) => {
    try {
      const duplicatedBank = bankManager.duplicateBank(bankId);
      loadBanks();
      toast({
        title: "Sao chép thành công!",
        description: `Đã tạo bản sao "${duplicatedBank.name}"`,
      });
    } catch (error) {
      toast({
        title: "Lỗi sao chép",
        description: error instanceof Error ? error.message : "Không thể sao chép ngân hàng",
        variant: "destructive"
      });
    }
  };

  const handleExportBank = (bank: QuestionBank) => {
    try {
      const exportData = bankManager.exportBanks([bank.id]);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank-${bank.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Xuất thành công!",
        description: `Ngân hàng "${bank.name}" đã được xuất`,
      });
    } catch (error) {
      toast({
        title: "Lỗi xuất",
        description: error instanceof Error ? error.message : "Không thể xuất ngân hàng",
        variant: "destructive"
      });
    }
  };

  const handleExportAll = () => {
    try {
      const exportData = bankManager.exportBanks();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-banks-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Xuất thành công!",
        description: "Tất cả ngân hàng đã được xuất",
      });
    } catch (error) {
      toast({
        title: "Lỗi xuất",
        description: error instanceof Error ? error.message : "Không thể xuất ngân hàng",
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
        
        const result = bankManager.importBanks(importData, true);
        
        if (result.success) {
          loadBanks();
          toast({
            title: "Import thành công",
            description: `Đã import ${result.importedCount} ngân hàng. ${result.errors.length > 0 ? `${result.errors.length} lỗi.` : ''}`,
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
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const openEditModal = (bank: QuestionBank) => {
    setSelectedBank(bank);
    editForm.reset({
      name: bank.name,
      description: bank.description || "",
      subject: bank.subject,
      tags: bank.tags,
    });
    setIsEditModalOpen(true);
  };

  const openBankDetail = (bank: QuestionBank) => {
    setSelectedBank(bank);
    setIsBankDetailOpen(true);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const uniqueSubjects = Array.from(new Set(banks.map(bank => bank.subject)));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2" data-testid="button-bank-manager">
            <Database className="w-4 h-4" />
            <span>Ngân hàng câu hỏi ({banks.length})</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col" data-testid="dialog-bank-manager">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Ngân hàng câu hỏi</span>
            </DialogTitle>
            <DialogDescription>
              Quản lý và tổ chức các bộ sưu tập câu hỏi theo chủ đề
            </DialogDescription>
          </DialogHeader>

          {/* Header Controls */}
          <div className="flex flex-col gap-4">
            {/* Search and Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm ngân hàng..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-banks"
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

            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setIsCreateModalOpen(true)} 
                className="flex items-center space-x-2"
                data-testid="button-create-bank"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Tạo ngân hàng</span>
              </Button>
              
              <Button onClick={handleExportAll} variant="outline" size="sm" data-testid="button-export-all">
                <Download className="w-4 h-4 mr-1" />
                Xuất tất cả
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="import-banks"
                  disabled={isImporting}
                />
                <Button 
                  onClick={() => document.getElementById('import-banks')?.click()}
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
            </div>
          </div>

          {/* Banks Grid/List */}
          <ScrollArea className="flex-1 max-h-[600px]">
            {filteredBanks.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-banks">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  {banks.length === 0 ? "Chưa có ngân hàng nào" : "Không tìm thấy kết quả"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {banks.length === 0 
                    ? "Tạo ngân hàng đầu tiên để bắt đầu tổ chức câu hỏi" 
                    : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                  }
                </p>
                {banks.length === 0 && (
                  <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-first-bank">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Tạo ngân hàng đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBanks.map((bank) => (
                  <Card key={bank.id} className="hover:shadow-md transition-shadow" data-testid={`bank-card-${bank.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <CardTitle className="text-base line-clamp-1" title={bank.name}>
                            {bank.name}
                          </CardTitle>
                          {bank.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2" title={bank.description}>
                              {bank.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {getSubjectLabel(bank.subject)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              {bank.metadata.totalSets} bộ
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Hash className="w-3 h-3 mr-1" />
                              {bank.metadata.totalQuestions} câu
                            </Badge>
                          </div>
                          {bank.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {bank.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {bank.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{bank.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(bank.lastModified)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => openBankDetail(bank)}
                          data-testid={`button-view-${bank.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Xem
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openEditModal(bank)}
                          data-testid={`button-edit-${bank.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Sửa
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDuplicateBank(bank.id)}
                          data-testid={`button-duplicate-${bank.id}`}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Sao chép
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleExportBank(bank)}
                          data-testid={`button-export-${bank.id}`}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Xuất
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setShowDeleteConfirm(bank.id)}
                          data-testid={`button-delete-${bank.id}`}
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

      {/* Create Bank Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-create-bank">
          <DialogHeader>
            <DialogTitle>Tạo ngân hàng mới</DialogTitle>
            <DialogDescription>
              Tạo một ngân hàng câu hỏi để tổ chức và quản lý câu hỏi theo chủ đề
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateBank)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên ngân hàng</FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: Toán 12 - Giải tích" {...field} data-testid="input-bank-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Môn học</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bank-subject">
                          <SelectValue placeholder="Chọn môn học" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="toan">Toán học</SelectItem>
                        <SelectItem value="ly">Vật lý</SelectItem>
                        <SelectItem value="hoa">Hóa học</SelectItem>
                        <SelectItem value="sinh">Sinh học</SelectItem>
                        <SelectItem value="van">Ngữ văn</SelectItem>
                        <SelectItem value="anh">Tiếng Anh</SelectItem>
                        <SelectItem value="su">Lịch sử</SelectItem>
                        <SelectItem value="dia">Địa lý</SelectItem>
                        <SelectItem value="gdcd">Giáo dục công dân</SelectItem>
                        <SelectItem value="tin">Tin học</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả (tùy chọn)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Mô tả ngắn về ngân hàng này..."
                        className="min-h-[80px]"
                        {...field} 
                        data-testid="textarea-bank-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Mô tả mục đích và nội dung của ngân hàng
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" data-testid="button-create-bank-submit">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Tạo ngân hàng
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Bank Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-bank">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa ngân hàng</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin ngân hàng câu hỏi
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditBank)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên ngân hàng</FormLabel>
                    <FormControl>
                      <Input placeholder="Tên ngân hàng" {...field} data-testid="input-edit-bank-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Môn học</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-bank-subject">
                          <SelectValue placeholder="Chọn môn học" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="toan">Toán học</SelectItem>
                        <SelectItem value="ly">Vật lý</SelectItem>
                        <SelectItem value="hoa">Hóa học</SelectItem>
                        <SelectItem value="sinh">Sinh học</SelectItem>
                        <SelectItem value="van">Ngữ văn</SelectItem>
                        <SelectItem value="anh">Tiếng Anh</SelectItem>
                        <SelectItem value="su">Lịch sử</SelectItem>
                        <SelectItem value="dia">Địa lý</SelectItem>
                        <SelectItem value="gdcd">Giáo dục công dân</SelectItem>
                        <SelectItem value="tin">Tin học</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Mô tả ngắn về ngân hàng này..."
                        className="min-h-[80px]"
                        {...field} 
                        data-testid="textarea-edit-bank-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" data-testid="button-edit-bank-submit">
                  <Save className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bank Detail Modal */}
      <Sheet open={isBankDetailOpen} onOpenChange={setIsBankDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl" data-testid="sheet-bank-detail">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>{selectedBank?.name}</span>
            </SheetTitle>
            <SheetDescription>
              {selectedBank && `${getSubjectLabel(selectedBank.subject)} • ${selectedBank.metadata.totalSets} bộ câu hỏi • ${selectedBank.metadata.totalQuestions} câu`}
            </SheetDescription>
          </SheetHeader>
          
          {selectedBank && (
            <div className="mt-6 space-y-6">
              {/* Bank Info */}
              <div className="space-y-4">
                {selectedBank.description && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Mô tả</h4>
                    <p className="text-sm text-muted-foreground">{selectedBank.description}</p>
                  </div>
                )}
                
                {selectedBank.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Thẻ</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedBank.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistics */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Thống kê</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Tổng câu hỏi</div>
                      <div className="font-medium">{selectedBank.metadata.totalQuestions}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Tổng bộ</div>
                      <div className="font-medium">{selectedBank.metadata.totalSets}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Tạo lúc</div>
                      <div className="font-medium">{formatDate(selectedBank.createdAt)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Sửa lần cuối</div>
                      <div className="font-medium">{formatDate(selectedBank.lastModified)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Question Sets */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Bộ câu hỏi ({selectedBank.entries.length})</h4>
                {selectedBank.entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có bộ câu hỏi nào</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-3">
                      {selectedBank.entries.map((entry) => (
                        <Card key={entry.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h5 className="font-medium text-sm">{entry.name}</h5>
                              <Badge variant="outline" className="text-xs">
                                {entry.questionCount} câu
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{entry.topic}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="text-xs">
                                  {entry.difficulty === 'easy' ? 'Dễ' : entry.difficulty === 'medium' ? 'TB' : 'Khó'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(entry.addedAt)}
                                </span>
                              </div>
                              <Button size="sm" variant="outline" className="h-6 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Xem
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span>Xác nhận xóa</span>
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa ngân hàng này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteConfirm && handleDeleteBank(showDeleteConfirm)}
              data-testid="button-confirm-delete"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa ngân hàng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}