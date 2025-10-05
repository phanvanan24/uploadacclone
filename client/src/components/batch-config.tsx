import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BatchGenerationConfig,
  BatchTemplate,
  batchGenerationConfigSchema,
  insertQuestionRequestSchema
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Copy,
  Wand2,
  Settings,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BatchGenerator } from "@/lib/batch-generator";
import { BankManager } from "@/lib/bank-manager";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Form schema for the entire batch configuration
const batchConfigFormSchema = z.object({
  name: z.string().min(1, "Tên batch không được để trống").max(100, "Tên quá dài"),
  configs: z.array(batchGenerationConfigSchema).min(1, "Cần ít nhất một cấu hình"),
  options: z.object({
    autoSaveToBank: z.string().optional(),
    commonTags: z.array(z.string()).default([]),
    generateVariations: z.boolean().default(false),
    randomizeTopics: z.boolean().default(false),
    exportAsPackage: z.boolean().default(false),
  }),
});

type BatchConfigFormData = z.infer<typeof batchConfigFormSchema>;

interface BatchConfigProps {
  onStartBatch: (formData: BatchConfigFormData) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const QUESTION_TYPE_OPTIONS = [
  { value: 'multiple_choice', label: 'Trắc nghiệm A/B/C/D' },
  { value: 'multiple_choice_reading1', label: 'Trắc nghiệm A/B/C/D (Reading1)' },
  { value: 'multiple_choice_reading2', label: 'Trắc nghiệm A/B/C/D (Reading2)' },
  { value: 'true_false', label: 'Đúng/Sai' },
  { value: 'essay', label: 'Tự luận' },
  { value: 'fill_in_blank', label: 'Điền từ/chỗ trống' },
  { value: 'matching', label: 'Nối câu/ghép đôi' },
  { value: 'ordering', label: 'Sắp xếp thứ tự' },
];

const SUBJECT_OPTIONS = [
  { value: 'toan', label: 'Toán học' },
  { value: 'ly', label: 'Vật lý' },
  { value: 'hoa', label: 'Hóa học' },
  { value: 'sinh', label: 'Sinh học' },
  { value: 'van', label: 'Ngữ văn' },
  { value: 'anh', label: 'Tiếng Anh' },
  { value: 'tin', label: 'Tin học' },
];

export function BatchConfig({ onStartBatch, trigger, open, onOpenChange }: BatchConfigProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [currentTag, setCurrentTag] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<BatchTemplate | null>(null);
  
  const batchGenerator = BatchGenerator.getInstance();
  const bankManager = BankManager.getInstance();
  
  const banks = bankManager.getBanks();
  const templates = batchGenerator.getAllTemplates();

  const form = useForm<BatchConfigFormData>({
    resolver: zodResolver(batchConfigFormSchema),
    defaultValues: {
      name: '',
      configs: [createDefaultConfig(0)],
      options: {
        autoSaveToBank: '',
        commonTags: [],
        generateVariations: false,
        randomizeTopics: false,
        exportAsPackage: false,
      },
    },
  });

  // Define helper function that doesn't depend on fields
  function createDefaultConfig(currentCount?: number): BatchGenerationConfig {
    const id = `config_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const configNumber = currentCount !== undefined ? currentCount + 1 : 1;
    return {
      id,
      name: `Cấu hình ${configNumber}`,
      subject: 'toan',
      difficulty: 'medium',
      topic: '',
      requirements: '',
      questionTypes: ['multiple_choice'],
      questionCount: 2,
    };
  }

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "configs",
  });

  // Handle external open state
  useEffect(() => {
    if (open !== undefined) {
      setDialogOpen(open);
    }
  }, [open]);

  // Handle dialog state changes
  const handleOpenChange = (newOpen: boolean) => {
    setDialogOpen(newOpen);
    onOpenChange?.(newOpen);
    
    if (!newOpen) {
      // Reset form when dialog closes
      form.reset();
      setSelectedTemplate(null);
      setShowTemplates(false);
      setShowAdvancedOptions(false);
    }
  };

  // Functions that depend on fields - defined after useFieldArray
  const addConfig = () => {
    append(createDefaultConfig(fields.length));
  };

  const duplicateConfig = (index: number) => {
    const configToDuplicate = fields[index];
    const newConfig = {
      ...configToDuplicate,
      id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: `${configToDuplicate.name} (Copy)`,
    };
    append(newConfig);
  };

  const removeConfig = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast({
        title: "Không thể xóa",
        description: "Cần ít nhất một cấu hình",
        variant: "destructive",
      });
    }
  };

  const applyTemplate = (template: BatchTemplate) => {
    const newConfigs = template.configs.map((templateConfig, index) => ({
      id: `config_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
      subject: template.subject || 'toan', // Use template subject or default
      topic: '', // User needs to fill this
      ...templateConfig,
    }));

    // Update form with template configs
    form.setValue('configs', newConfigs);
    form.setValue('name', template.name);
    
    setSelectedTemplate(template);
    setShowTemplates(false);
    
    toast({
      title: "Template đã áp dụng",
      description: `Đã tạo ${newConfigs.length} cấu hình từ template "${template.name}"`,
    });
  };

  const addTag = () => {
    if (currentTag.trim()) {
      const currentTags = form.getValues('options.commonTags') || [];
      if (!currentTags.includes(currentTag.trim())) {
        form.setValue('options.commonTags', [...currentTags, currentTag.trim()]);
      }
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('options.commonTags') || [];
    form.setValue('options.commonTags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = (data: BatchConfigFormData) => {
    // Validate that all configs have topics
    const emptyTopics = data.configs.filter(config => !config.topic.trim());
    if (emptyTopics.length > 0) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập chủ đề cho tất cả các cấu hình",
        variant: "destructive",
      });
      return;
    }

    onStartBatch(data);
    handleOpenChange(false);
  };

  const DialogComponent = (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wand2 className="w-5 h-5" />
            <span>Tạo câu hỏi hàng loạt</span>
          </DialogTitle>
          <DialogDescription>
            Cấu hình nhiều bộ câu hỏi để tạo cùng một lúc. Sử dụng template có sẵn hoặc tự thiết lập.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Batch Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên batch</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: Kiểm tra học kỳ 1 - Toán 10"
                      {...field}
                      data-testid="input-batch-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Templates Section */}
            <Collapsible open={showTemplates} onOpenChange={setShowTemplates}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  data-testid="button-toggle-templates"
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Sử dụng template có sẵn</span>
                  </div>
                  {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => applyTemplate(template)}
                      data-testid={`template-${template.id}`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          {template.name}
                          {template.isBuiltIn && (
                            <Badge variant="secondary" className="text-xs">
                              Có sẵn
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <div className="text-xs">
                          <span className="font-medium">{template.configs.length} cấu hình</span>
                          {template.subject && (
                            <span className="ml-2 text-muted-foreground">
                              • {SUBJECT_OPTIONS.find(s => s.value === template.subject)?.label}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Configuration List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cấu hình câu hỏi</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addConfig}
                  data-testid="button-add-config"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm cấu hình
                </Button>
              </div>

              <ScrollArea className="max-h-60">
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <FormField
                            control={form.control}
                            name={`configs.${index}.name`}
                            render={({ field: nameField }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    {...nameField}
                                    className="font-medium"
                                    placeholder="Tên cấu hình"
                                    data-testid={`input-config-name-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex items-center space-x-1 ml-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateConfig(index)}
                              data-testid={`button-duplicate-config-${index}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeConfig(index)}
                              disabled={fields.length === 1}
                              data-testid={`button-remove-config-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Subject */}
                          <FormField
                            control={form.control}
                            name={`configs.${index}.subject`}
                            render={({ field: subjectField }) => (
                              <FormItem>
                                <FormLabel>Môn học</FormLabel>
                                <Select
                                  onValueChange={subjectField.onChange}
                                  value={subjectField.value}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid={`select-subject-${index}`}>
                                      <SelectValue placeholder="Chọn môn học" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {SUBJECT_OPTIONS.map((subject) => (
                                      <SelectItem key={subject.value} value={subject.value}>
                                        {subject.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Difficulty */}
                          <FormField
                            control={form.control}
                            name={`configs.${index}.difficulty`}
                            render={({ field: difficultyField }) => (
                              <FormItem>
                                <FormLabel>Độ khó</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={difficultyField.onChange}
                                    value={difficultyField.value}
                                    className="flex space-x-4"
                                    data-testid={`radio-difficulty-${index}`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="easy" id={`easy-${index}`} />
                                      <Label htmlFor={`easy-${index}`}>Dễ</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="medium" id={`medium-${index}`} />
                                      <Label htmlFor={`medium-${index}`}>TB</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="hard" id={`hard-${index}`} />
                                      <Label htmlFor={`hard-${index}`}>Khó</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Topic */}
                        <FormField
                          control={form.control}
                          name={`configs.${index}.topic`}
                          render={({ field: topicField }) => (
                            <FormItem>
                              <FormLabel>Chủ đề *</FormLabel>
                              <FormControl>
                                <Input
                                  {...topicField}
                                  placeholder="VD: Phương trình bậc hai, Định luật Newton..."
                                  data-testid={`input-topic-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Question Types */}
                          <FormField
                            control={form.control}
                            name={`configs.${index}.questionTypes`}
                            render={({ field: typesField }) => (
                              <FormItem>
                                <FormLabel>Loại câu hỏi</FormLabel>
                                <div className="space-y-2">
                                  {QUESTION_TYPE_OPTIONS.map((option) => (
                                    <div key={option.value} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${option.value}-${index}`}
                                        checked={typesField.value.includes(option.value as any)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            typesField.onChange([...typesField.value, option.value]);
                                          } else {
                                            typesField.onChange(
                                              typesField.value.filter((type) => type !== option.value)
                                            );
                                          }
                                        }}
                                        data-testid={`checkbox-${option.value}-${index}`}
                                      />
                                      <Label
                                        htmlFor={`${option.value}-${index}`}
                                        className="text-sm"
                                      >
                                        {option.label}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Question Count */}
                          <FormField
                            control={form.control}
                            name={`configs.${index}.questionCount`}
                            render={({ field: countField }) => (
                              <FormItem>
                                <FormLabel>Số lượng câu hỏi</FormLabel>
                                <Select
                                  onValueChange={(value) => countField.onChange(parseInt(value))}
                                  value={countField.value.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid={`select-count-${index}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {[1, 2, 3, 4].map((count) => (
                                      <SelectItem key={count} value={count.toString()}>
                                        {count} câu
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Requirements */}
                        <FormField
                          control={form.control}
                          name={`configs.${index}.requirements`}
                          render={({ field: reqField }) => (
                            <FormItem>
                              <FormLabel>Yêu cầu cụ thể (tùy chọn)</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...reqField}
                                  placeholder="VD: Câu hỏi có nhiều bước giải, bao gồm công thức..."
                                  className="resize-none"
                                  rows={2}
                                  data-testid={`textarea-requirements-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Advanced Options */}
            <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  data-testid="button-toggle-advanced"
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Tùy chọn nâng cao</span>
                  </div>
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Auto-save to Bank */}
                <FormField
                  control={form.control}
                  name="options.autoSaveToBank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tự động lưu vào ngân hàng</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-auto-save-bank">
                            <SelectValue placeholder="Chọn ngân hàng (tùy chọn)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Không tự động lưu</SelectItem>
                          {banks.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Common Tags */}
                <div className="space-y-2">
                  <Label>Tags chung cho tất cả bộ câu hỏi</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      placeholder="Nhập tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      data-testid="input-common-tag"
                    />
                    <Button type="button" onClick={addTag} size="sm" data-testid="button-add-tag">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch('options.commonTags')?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                        <span>{tag}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => removeTag(tag)}
                          data-testid={`button-remove-tag-${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Other Options */}
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="options.exportAsPackage"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-export-package"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 cursor-pointer">
                          Xuất tất cả thành package
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Summary */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="font-medium">Tóm tắt</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Sẽ tạo <strong>{fields.length} bộ câu hỏi</strong> với tổng cộng{" "}
                  <strong>
                    {fields.reduce((total, field) => total + field.questionCount, 0)} câu hỏi
                  </strong>
                  . Ước tính thời gian: ~{Math.ceil(fields.length * 0.5)} phút.
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                data-testid="button-cancel-batch"
              >
                Hủy
              </Button>
              <Button type="submit" data-testid="button-start-batch">
                <Play className="w-4 h-4 mr-2" />
                Bắt đầu tạo hàng loạt
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  return DialogComponent;
}