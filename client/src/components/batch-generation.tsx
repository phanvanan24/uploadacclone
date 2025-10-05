import { useState, useEffect, useCallback } from "react";
import {
  BatchGenerationRequest,
  BatchGenerationResult,
  BatchGenerationError,
  QuestionRequest,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wand2,
  Play,
  Pause,
  Square,
  RefreshCw,
  Download,
  FolderPlus,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Trash2,
  RotateCcw,
  Package,
  BarChart3,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BatchGenerator, BatchGeneratorEvents } from "@/lib/batch-generator";
import { BankManager } from "@/lib/bank-manager";
import { HistoryManager } from "@/lib/history-manager";
import { BatchConfig } from "@/components/batch-config";
import { GeneratedQuestions } from "@/components/generated-questions";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface BatchGenerationProps {
  onQuestionsGenerated?: (questions: QuestionRequest) => void;
}

const STATUS_ICONS = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  cancelled: XCircle,
  failed: XCircle,
};

const STATUS_COLORS = {
  pending: "text-muted-foreground",
  processing: "text-blue-600",
  completed: "text-green-600",
  cancelled: "text-gray-500",
  failed: "text-red-600",
};

const STATUS_LABELS = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  failed: "Thất bại",
};

export function BatchGeneration({ onQuestionsGenerated }: BatchGenerationProps) {
  const { toast } = useToast();
  const [showManager, setShowManager] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchGenerationRequest | null>(null);
  const [selectedResult, setSelectedResult] = useState<QuestionRequest | null>(null);
  const [activeBatches, setActiveBatches] = useState<BatchGenerationRequest[]>([]);
  const [completedBatches, setCompletedBatches] = useState<BatchGenerationRequest[]>([]);

  const batchGenerator = BatchGenerator.getInstance();
  const bankManager = BankManager.getInstance();
  const historyManager = HistoryManager.getInstance();

  // Load batches on component mount
  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = useCallback(() => {
    const allBatches = batchGenerator.getBatchRequests();
    setActiveBatches(allBatches.filter(batch => 
      batch.status === 'pending' || batch.status === 'processing'
    ));
    setCompletedBatches(allBatches.filter(batch => 
      batch.status === 'completed' || batch.status === 'cancelled' || batch.status === 'failed'
    ));
  }, []);

  // Set up event listeners for active batches
  useEffect(() => {
    const setupEventListeners = (batch: BatchGenerationRequest) => {
      const events: Partial<BatchGeneratorEvents> = {
        onProgress: (updatedBatch) => {
          setActiveBatches(prev => 
            prev.map(b => b.id === updatedBatch.id ? updatedBatch : b)
          );
        },
        onComplete: (completedBatch) => {
          setActiveBatches(prev => prev.filter(b => b.id !== completedBatch.id));
          setCompletedBatches(prev => [completedBatch, ...prev]);
          
          const successCount = completedBatch.results.filter(r => r.status === 'completed').length;
          const totalCount = completedBatch.configs.length;
          
          toast({
            title: "Batch hoàn thành",
            description: `"${completedBatch.name}" - ${successCount}/${totalCount} bộ câu hỏi thành công`,
          });
        },
        onError: (errorBatch, error) => {
          setActiveBatches(prev => prev.filter(b => b.id !== errorBatch.id));
          setCompletedBatches(prev => [errorBatch, ...prev]);
          
          toast({
            title: "Batch thất bại",
            description: `"${errorBatch.name}" - ${error}`,
            variant: "destructive",
          });
        },
        onConfigComplete: (batch, result) => {
          // Optional: Handle individual config completion
        },
        onConfigError: (batch, error) => {
          // Optional: Handle individual config error
        },
      };

      batchGenerator.registerEventListeners(batch.id, events);
    };

    activeBatches.forEach(setupEventListeners);

    return () => {
      activeBatches.forEach(batch => {
        batchGenerator.unregisterEventListeners(batch.id);
      });
    };
  }, [activeBatches, toast]);

  const handleStartBatch = async (formData: any) => {
    try {
      // Create batch request
      const batch = batchGenerator.createBatchRequest(
        formData.name,
        formData.configs,
        formData.options
      );

      // Add to active batches
      setActiveBatches(prev => [batch, ...prev]);

      // Start processing
      await batchGenerator.startBatch(batch.id);

    } catch (error) {
      console.error("Error starting batch:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể bắt đầu batch",
        variant: "destructive",
      });
    }
  };

  const handleCancelBatch = async (batchId: string) => {
    try {
      await batchGenerator.cancelBatch(batchId);
      loadBatches();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể hủy batch",
        variant: "destructive",
      });
    }
  };

  const handleRetryBatch = async (batchId: string) => {
    try {
      await batchGenerator.retryFailedConfigs(batchId);
      loadBatches();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể thử lại batch",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBatch = (batchId: string) => {
    const success = batchGenerator.deleteBatchRequest(batchId);
    if (success) {
      loadBatches();
      toast({
        title: "Đã xóa",
        description: "Batch đã được xóa thành công",
      });
    }
  };

  const handleViewResult = (result: BatchGenerationResult) => {
    if (result.status === 'completed') {
      setSelectedResult(result.questionRequest);
      onQuestionsGenerated?.(result.questionRequest);
    }
  };

  const handleSaveAllToBank = async (batch: BatchGenerationRequest) => {
    try {
      const banks = bankManager.getBanks();
      if (banks.length === 0) {
        toast({
          title: "Không có ngân hàng",
          description: "Vui lòng tạo ngân hàng trước khi lưu",
          variant: "destructive",
        });
        return;
      }

      // For simplicity, save to the first bank or show bank selection
      const bank = banks[0];
      const successfulResults = batch.results.filter(r => r.status === 'completed');

      for (const result of successfulResults) {
        bankManager.addQuestionSetToBank(bank.id, result.questionRequest, result.configName);
      }

      toast({
        title: "Đã lưu vào ngân hàng",
        description: `${successfulResults.length} bộ câu hỏi đã được lưu vào "${bank.name}"`,
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu vào ngân hàng",
        variant: "destructive",
      });
    }
  };

  const calculateProgress = (batch: BatchGenerationRequest): number => {
    if (batch.progress.total === 0) return 0;
    return (batch.progress.current / batch.progress.total) * 100;
  };

  const getEstimatedTimeRemaining = (batch: BatchGenerationRequest): string => {
    if (!batch.progress.startedAt || batch.status !== 'processing') return '';
    
    const startTime = new Date(batch.progress.startedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    const completed = batch.progress.current;
    const total = batch.progress.total;
    
    if (completed === 0) return '';
    
    const avgTimePerConfig = elapsed / completed;
    const remaining = (total - completed) * avgTimePerConfig;
    
    return `~${Math.ceil(remaining / 60000)} phút`;
  };

  const BatchCard = ({ batch }: { batch: BatchGenerationRequest }) => {
    const StatusIcon = STATUS_ICONS[batch.status];
    const progress = calculateProgress(batch);
    const isActive = batch.status === 'processing' || batch.status === 'pending';

    return (
      <Card className="mb-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <StatusIcon 
                className={`w-5 h-5 ${STATUS_COLORS[batch.status]} ${
                  batch.status === 'processing' ? 'animate-spin' : ''
                }`} 
              />
              <span>{batch.name}</span>
              <Badge variant={batch.status === 'completed' ? 'default' : 'secondary'}>
                {STATUS_LABELS[batch.status]}
              </Badge>
            </CardTitle>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid={`batch-menu-${batch.id}`}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedBatch(batch)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Xem chi tiết
                </DropdownMenuItem>
                
                {batch.status === 'processing' && (
                  <DropdownMenuItem onClick={() => handleCancelBatch(batch.id)}>
                    <Square className="w-4 h-4 mr-2" />
                    Hủy batch
                  </DropdownMenuItem>
                )}
                
                {batch.status === 'failed' && (
                  <DropdownMenuItem onClick={() => handleRetryBatch(batch.id)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Thử lại
                  </DropdownMenuItem>
                )}
                
                {batch.status === 'completed' && batch.results.some(r => r.status === 'completed') && (
                  <>
                    <DropdownMenuItem onClick={() => handleSaveAllToBank(batch)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Lưu tất cả vào ngân hàng
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Package className="w-4 h-4 mr-2" />
                      Xuất package
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteBatch(batch.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa batch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Tạo lúc: {formatDistanceToNow(new Date(batch.createdAt), { 
              addSuffix: true, 
              locale: vi 
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Tiến độ: {batch.progress.current}/{batch.progress.total}</span>
              {isActive && getEstimatedTimeRemaining(batch) && (
                <span className="text-muted-foreground">
                  Còn lại: {getEstimatedTimeRemaining(batch)}
                </span>
              )}
            </div>
            <Progress value={progress} className="h-2" />
            {batch.progress.currentConfig && (
              <div className="text-xs text-muted-foreground">
                Đang xử lý: {batch.progress.currentConfig}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {batch.results.filter(r => r.status === 'completed').length}
              </div>
              <div className="text-xs text-muted-foreground">Thành công</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {batch.results.filter(r => r.status === 'failed').length}
              </div>
              <div className="text-xs text-muted-foreground">Thất bại</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {batch.configs.length - batch.progress.current}
              </div>
              <div className="text-xs text-muted-foreground">Chờ xử lý</div>
            </div>
          </div>

          {/* Quick actions for completed batches */}
          {batch.status === 'completed' && batch.results.some(r => r.status === 'completed') && (
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSelectedBatch(batch)}
                data-testid={`button-view-results-${batch.id}`}
              >
                <Eye className="w-4 h-4 mr-1" />
                Xem kết quả
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleSaveAllToBank(batch)}
                data-testid={`button-save-all-${batch.id}`}
              >
                <FolderPlus className="w-4 h-4 mr-1" />
                Lưu tất cả
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Batch Creation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Tạo câu hỏi hàng loạt</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <BatchConfig
            onStartBatch={handleStartBatch}
            trigger={
              <Button data-testid="button-create-batch">
                <Plus className="w-4 h-4 mr-2" />
                Tạo batch mới
              </Button>
            }
          />
          
          {(activeBatches.length > 0 || completedBatches.length > 0) && (
            <Button
              variant="outline"
              onClick={() => setShowManager(true)}
              data-testid="button-manage-batches"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Quản lý ({activeBatches.length + completedBatches.length})
            </Button>
          )}
        </div>
      </div>

      {/* Active Batches */}
      {activeBatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-md font-medium">Đang xử lý</h3>
          {activeBatches.map(batch => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      )}

      {/* Recent Completed Batches */}
      {completedBatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-md font-medium">Gần đây</h3>
          {completedBatches.slice(0, 3).map(batch => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
          {completedBatches.length > 3 && (
            <Button
              variant="outline"
              onClick={() => setShowManager(true)}
              className="w-full"
              data-testid="button-view-all-batches"
            >
              Xem tất cả ({completedBatches.length} batch)
            </Button>
          )}
        </div>
      )}

      {/* Empty State */}
      {activeBatches.length === 0 && completedBatches.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Wand2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có batch nào</h3>
            <p className="text-muted-foreground mb-4">
              Tạo nhiều bộ câu hỏi cùng một lúc để tiết kiệm thời gian
            </p>
            <BatchConfig
              onStartBatch={handleStartBatch}
              trigger={
                <Button data-testid="button-create-first-batch">
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo batch đầu tiên
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Batch Manager Dialog */}
      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Quản lý Batch Generation</DialogTitle>
            <DialogDescription>
              Quản lý tất cả các batch generation đã tạo
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6">
              {/* Active Batches */}
              {activeBatches.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Đang xử lý ({activeBatches.length})</h3>
                  <div className="space-y-3">
                    {activeBatches.map(batch => (
                      <BatchCard key={batch.id} batch={batch} />
                    ))}
                  </div>
                </div>
              )}

              {activeBatches.length > 0 && completedBatches.length > 0 && <Separator />}

              {/* Completed Batches */}
              {completedBatches.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Đã hoàn thành ({completedBatches.length})</h3>
                  <div className="space-y-3">
                    {completedBatches.map(batch => (
                      <BatchCard key={batch.id} batch={batch} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Batch Details Dialog */}
      {selectedBatch && (
        <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Wand2 className="w-5 h-5" />
                <span>{selectedBatch.name}</span>
                <Badge variant={selectedBatch.status === 'completed' ? 'default' : 'secondary'}>
                  {STATUS_LABELS[selectedBatch.status]}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Chi tiết batch generation và kết quả
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                {/* Progress Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tiến độ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Progress value={calculateProgress(selectedBatch)} className="h-3" />
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold">{selectedBatch.progress.current}</div>
                          <div className="text-sm text-muted-foreground">Đã xử lý</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {selectedBatch.results.filter(r => r.status === 'completed').length}
                          </div>
                          <div className="text-sm text-muted-foreground">Thành công</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">
                            {selectedBatch.results.filter(r => r.status === 'failed').length}
                          </div>
                          <div className="text-sm text-muted-foreground">Thất bại</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-600">
                            {selectedBatch.configs.length - selectedBatch.progress.current}
                          </div>
                          <div className="text-sm text-muted-foreground">Chờ xử lý</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Results Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Kết quả chi tiết</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cấu hình</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBatch.configs.map((config) => {
                          const result = selectedBatch.results.find(r => r.configId === config.id);
                          const StatusIcon = result ? STATUS_ICONS[result.status] : STATUS_ICONS.pending;
                          
                          return (
                            <TableRow key={config.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{config.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {config.topic} • {config.questionCount} câu
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <StatusIcon 
                                    className={`w-4 h-4 ${result ? STATUS_COLORS[result.status] : STATUS_COLORS.pending}`} 
                                  />
                                  <span>{result ? STATUS_LABELS[result.status] : STATUS_LABELS.pending}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-muted-foreground">
                                  {result?.createdAt && formatDistanceToNow(new Date(result.createdAt), { 
                                    addSuffix: true, 
                                    locale: vi 
                                  })}
                                </div>
                              </TableCell>
                              <TableCell>
                                {result?.status === 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewResult(result)}
                                    data-testid={`button-view-result-${config.id}`}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Xem
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Errors */}
                {selectedBatch.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-red-600">Lỗi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedBatch.errors.map((error, index) => (
                          <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                            <div className="font-medium">{error.configName}</div>
                            <div className="text-sm text-red-700">{error.error}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(error.timestamp), { 
                                addSuffix: true, 
                                locale: vi 
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Result Preview Dialog */}
      {selectedResult && (
        <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Xem kết quả</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <GeneratedQuestions questions={selectedResult} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}