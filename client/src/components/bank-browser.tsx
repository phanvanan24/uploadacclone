import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Search, 
  Eye, 
  Plus,
  Calendar, 
  BookOpen, 
  FileText,
  Hash,
  Tag,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Star,
  Clock,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bankManager } from "@/lib/bank-manager";
import type { 
  QuestionBank, 
  QuestionBankEntry, 
  BankSearchFilters
} from "@shared/schema";

interface BankBrowserProps {
  mode?: "select" | "browse";
  onSelectBank?: (bank: QuestionBank) => void;
  onSelectBankEntry?: (bank: QuestionBank, entry: QuestionBankEntry) => void;
  triggerButton?: React.ReactNode;
  selectedBankId?: string;
  filterSubject?: string;
}

type SortOption = "name" | "date" | "questions" | "sets";
type SortDirection = "asc" | "desc";

export function BankBrowser({ 
  mode = "browse", 
  onSelectBank, 
  onSelectBankEntry, 
  triggerButton, 
  selectedBankId,
  filterSubject 
}: BankBrowserProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<QuestionBank[]>([]);
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>(filterSubject || "all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentView, setCurrentView] = useState<"banks" | "entries">("banks");

  // Load banks when component opens
  useEffect(() => {
    if (isOpen) {
      loadBanks();
    }
  }, [isOpen]);

  // Apply filters, search, and sorting
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

    // Apply tag filter
    if (tagFilter !== "all") {
      filtered = filtered.filter(bank => bank.tags.includes(tagFilter));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
        case "questions":
          comparison = a.metadata.totalQuestions - b.metadata.totalQuestions;
          break;
        case "sets":
          comparison = a.metadata.totalSets - b.metadata.totalSets;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    setFilteredBanks(filtered);
  }, [banks, searchQuery, subjectFilter, tagFilter, sortBy, sortDirection]);

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

  const handleSelectBank = (bank: QuestionBank) => {
    if (mode === "select" && onSelectBank) {
      onSelectBank(bank);
      setIsOpen(false);
    } else {
      setSelectedBank(bank);
      setCurrentView("entries");
    }
  };

  const handleSelectEntry = (bank: QuestionBank, entry: QuestionBankEntry) => {
    if (onSelectBankEntry) {
      onSelectBankEntry(bank, entry);
      setIsOpen(false);
    }
  };

  const handleBackToBanks = () => {
    setSelectedBank(null);
    setCurrentView("banks");
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

  const uniqueSubjects = Array.from(new Set(banks.map(bank => bank.subject)));
  const uniqueTags = Array.from(new Set(banks.flatMap(bank => bank.tags))).sort();

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(option);
      setSortDirection("desc");
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="flex items-center space-x-2" data-testid="button-browse-banks">
      <Database className="w-4 h-4" />
      <span>Duyệt ngân hàng</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col" data-testid="dialog-bank-browser">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>
              {currentView === "banks" ? "Duyệt ngân hàng câu hỏi" : `${selectedBank?.name} - Bộ câu hỏi`}
            </span>
          </DialogTitle>
          <DialogDescription>
            {currentView === "banks" 
              ? "Chọn ngân hàng câu hỏi để xem chi tiết hoặc sử dụng"
              : `${selectedBank?.metadata.totalSets} bộ câu hỏi • ${selectedBank?.metadata.totalQuestions} câu hỏi`
            }
          </DialogDescription>
        </DialogHeader>

        {currentView === "banks" ? (
          <>
            {/* Search and Filters */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm ngân hàng theo tên, mô tả, hoặc thẻ..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-banks"
                />
              </div>

              {/* Filters and Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Subject Filter */}
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger data-testid="select-filter-subject">
                      <SelectValue placeholder="Môn học" />
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

                  {/* Tag Filter */}
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger data-testid="select-filter-tag">
                      <SelectValue placeholder="Thẻ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả thẻ</SelectItem>
                      {uniqueTags.map(tag => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* View Mode Toggle */}
                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 rounded-r-none border-r"
                      onClick={() => setViewMode("grid")}
                      data-testid="button-grid-view"
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 rounded-l-none"
                      onClick={() => setViewMode("list")}
                      data-testid="button-list-view"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Sort Controls */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSort("name")}
                    className={sortBy === "name" ? "bg-accent" : ""}
                    data-testid="button-sort-name"
                  >
                    Tên {sortBy === "name" && (sortDirection === "asc" ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />)}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSort("date")}
                    className={sortBy === "date" ? "bg-accent" : ""}
                    data-testid="button-sort-date"
                  >
                    Ngày {sortBy === "date" && (sortDirection === "asc" ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />)}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSort("questions")}
                    className={sortBy === "questions" ? "bg-accent" : ""}
                    data-testid="button-sort-questions"
                  >
                    Câu hỏi {sortBy === "questions" && (sortDirection === "asc" ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />)}
                  </Button>
                </div>
              </div>
            </div>

            {/* Banks List */}
            <ScrollArea className="flex-1 max-h-[500px]">
              {filteredBanks.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-banks">
                  <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Database className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-2">
                    {banks.length === 0 ? "Chưa có ngân hàng nào" : "Không tìm thấy kết quả"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {banks.length === 0 
                      ? "Tạo ngân hàng đầu tiên để bắt đầu tổ chức câu hỏi" 
                      : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc"
                    }
                  </p>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                  {filteredBanks.map((bank) => (
                    <Card 
                      key={bank.id} 
                      className={`cursor-pointer hover:shadow-md transition-all ${
                        selectedBankId === bank.id ? "ring-2 ring-primary" : ""
                      } ${viewMode === "list" ? "flex items-center" : ""}`}
                      onClick={() => handleSelectBank(bank)}
                      data-testid={`bank-card-${bank.id}`}
                    >
                      {viewMode === "grid" ? (
                        <>
                          <CardHeader className="pb-3">
                            <div className="space-y-2">
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
                                  {bank.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      <Tag className="w-3 h-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                  {bank.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{bank.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(bank.lastModified)}
                              </div>
                              <Button size="sm" variant="outline" className="h-6 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Xem
                              </Button>
                            </div>
                          </CardContent>
                        </>
                      ) : (
                        <div className="flex items-center p-4 w-full">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-sm">{bank.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {getSubjectLabel(bank.subject)}
                              </Badge>
                            </div>
                            {bank.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{bank.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{bank.metadata.totalSets} bộ</span>
                              <span>{bank.metadata.totalQuestions} câu</span>
                              <span>{formatDate(bank.lastModified)}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          /* Bank Entries View */
          <>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleBackToBanks} data-testid="button-back-to-banks">
                ← Quay lại ngân hàng
              </Button>
              {selectedBank && (
                <div className="text-sm text-muted-foreground">
                  {getSubjectLabel(selectedBank.subject)} • {selectedBank.metadata.totalSets} bộ • {selectedBank.metadata.totalQuestions} câu
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[500px]">
              {selectedBank?.entries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-2">Chưa có bộ câu hỏi nào</h3>
                  <p className="text-sm text-muted-foreground">
                    Ngân hàng này chưa có bộ câu hỏi nào
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedBank?.entries.map((entry) => (
                    <Card 
                      key={entry.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => selectedBank && handleSelectEntry(selectedBank, entry)}
                      data-testid={`entry-card-${entry.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium text-sm">{entry.name}</h4>
                              <p className="text-xs text-muted-foreground">{entry.topic}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {entry.questionCount} câu
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Badge className={`text-xs ${getDifficultyColor(entry.difficulty)}`}>
                                {getDifficultyLabel(entry.difficulty)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(entry.addedAt)}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {entry.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {entry.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {entry.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{entry.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <Button size="sm" variant="outline" className="h-6 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Chọn
                              </Button>
                            </div>
                          </div>

                          {entry.requirements && (
                            <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                              {entry.requirements}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}