import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertQuestionRequestSchema, type InsertQuestionRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Lightbulb, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuestionFormProps {
  onQuestionsGenerated: (questions: any) => void;
  loadFormData?: InsertQuestionRequest | null;
}

export function QuestionForm({ onQuestionsGenerated, loadFormData }: QuestionFormProps) {
  const { toast } = useToast();
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('multiple_choice');

  const form = useForm<InsertQuestionRequest>({
    resolver: zodResolver(insertQuestionRequestSchema),
    defaultValues: {
      subject: '',
      difficulty: 'medium',
      topic: '',
      requirements: '',
      questionTypes: ['multiple_choice'],
      questionCount: 2,
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: InsertQuestionRequest) => {
      const response = await apiRequest('POST', '/api/questions/generate', data);
      return response.json();
    },
    onSuccess: (data) => {
      onQuestionsGenerated(data);
      toast({
        title: "Thành công!",
        description: "Đã tạo câu hỏi thành công",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi tạo câu hỏi",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertQuestionRequest) => {
    generateMutation.mutate(data);
  };

  // Handle loading form data from history
  useEffect(() => {
    if (loadFormData) {
      form.reset(loadFormData);
      setSelectedQuestionType((loadFormData.questionTypes as string[])[0] || 'multiple_choice');
      toast({
        title: "Đã tải dữ liệu",
        description: "Dữ liệu từ lịch sử đã được tải vào form",
      });
    }
  }, [loadFormData, form, toast]);

  const handleQuestionTypeChange = (type: string) => {
    setSelectedQuestionType(type);
    form.setValue('questionTypes', [type] as any);
  };

  // Get available question types based on subject
  const getAvailableQuestionTypes = (subject: string) => {
    switch (subject) {
      case 'toan':
      case 'ly':
      case 'hoa':
      case 'sinh':
        return [
          { id: 'multiple_choice', label: 'Trắc nghiệm A/B/C/D' },
          { id: 'true_false', label: 'Đúng/Sai' },
          { id: 'essay', label: 'Tự luận' }
        ];
      case 'van':
        return [
          { id: 'essay_reading', label: 'Đọc hiểu' },
          { id: 'essay_writing', label: 'Viết đoạn văn nghị luận' }
        ];
      case 'tin':
        return [
          { id: 'multiple_choice', label: 'Trắc nghiệm A/B/C/D' },
          { id: 'true_false', label: 'Đúng/Sai' }
        ];
      case 'anh':
        return [
          { id: 'multiple_choice_reading1', label: 'Kỹ năng Đọc hiểu kết hợp với trắc nghiệm khoanh từ' },
          { id: 'multiple_choice_reading2', label: 'Kỹ năng Đọc hiểu kết hợp với trắc nghiệm câu hỏi liên quan' },
          { id: 'ordering', label: 'Sắp xếp câu thành đoạn văn' }
        ];
      default:
        return [];
    }
  };

  const selectedSubject = form.watch('subject');
  const availableQuestionTypes = getAvailableQuestionTypes(selectedSubject || '');

  // Reset question types when subject changes
  const [previousSubject, setPreviousSubject] = useState<string>('');
  
  useEffect(() => {
    // Only reset when subject actually changes, not on re-renders
    if (selectedSubject && selectedSubject !== previousSubject && availableQuestionTypes.length > 0) {
      // Reset to the first available question type when subject changes
      const firstType = availableQuestionTypes[0].id;
      setSelectedQuestionType(firstType);
      form.setValue('questionTypes', [firstType] as any);
      
      // Auto-set question count for Vietnamese Literature
      if (selectedSubject === 'van') {
        if (firstType === 'essay_reading') {
          form.setValue('questionCount', 5); // Reading comprehension: 5 questions
        } else if (firstType === 'essay_writing') {
          form.setValue('questionCount', 1); // Essay writing: 1 question
        }
      } else if (!form.getValues('questionCount')) {
        form.setValue('questionCount', 1); // Default for other subjects
      }
      
      setPreviousSubject(selectedSubject);
    }
  }, [selectedSubject, previousSubject, availableQuestionTypes, form]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Tạo câu hỏi thi</h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Môn học</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-subject">
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
                        <SelectItem value="tin">Tin học</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Độ khó</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex space-x-4"
                        data-testid="radio-difficulty"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="easy" id="easy" />
                          <Label htmlFor="easy">Dễ</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="medium" />
                          <Label htmlFor="medium">Trung bình</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hard" id="hard" />
                          <Label htmlFor="hard">Khó</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="expert" id="expert" />
                          <Label htmlFor="expert">Chuyên gia</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chủ đề</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Phương trình bậc hai, Định luật Newton..."
                        {...field}
                        data-testid="input-topic"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yêu cầu cụ thể</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="VD: Câu hỏi có nhiều bước giải, bao gồm công thức..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="textarea-requirements"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="questionTypes"
                render={() => (
                  <FormItem>
                    <FormLabel>Loại câu hỏi</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={handleQuestionTypeChange}
                        value={selectedQuestionType}
                        className="space-y-3"
                        data-testid="radio-question-types"
                      >
                        {!selectedSubject && (
                          <p className="text-sm text-muted-foreground">Vui lòng chọn môn học trước</p>
                        )}
                        {availableQuestionTypes.map((questionType) => (
                          <div key={questionType.id} className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={questionType.id}
                              id={questionType.id}
                              data-testid={`radio-${questionType.id}`}
                            />
                            <Label htmlFor={questionType.id}>{questionType.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

{selectedSubject !== 'van' && (
                <FormField
                  control={form.control}
                  name="questionCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số câu hỏi</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-question-count">
                            <SelectValue placeholder="Chọn số câu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 câu</SelectItem>
                          <SelectItem value="2">2 câu</SelectItem>
                          <SelectItem value="3">3 câu</SelectItem>
                          <SelectItem value="4">4 câu</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={generateMutation.isPending}
                data-testid="button-generate"
              >
                {generateMutation.isPending ? (
                  <>
                    <span>Đang tạo câu hỏi...</span>
                    <div className="loader ml-2" />
                  </>
                ) : (
                  <>
                    <span>Sinh câu hỏi</span>
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      
    </div>
  );
}
