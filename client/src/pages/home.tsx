import { useState } from "react";
import { QuestionForm } from "@/components/question-form";
import { GeneratedQuestions } from "@/components/generated-questions";
import { QuestionHistory } from "@/components/question-history";
import { LatexRenderer } from "@/lib/latex-renderer";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import type { QuestionRequest, InsertQuestionRequest } from "@shared/schema";

export default function Home() {
  const { user, logout } = useAuth();
  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionRequest | null>(null);
  const [loadFormData, setLoadFormData] = useState<InsertQuestionRequest | null>(null);

  const handleQuestionsGenerated = (questions: QuestionRequest) => {
    setGeneratedQuestions(questions);
  };

  const handleLoadQuestions = (questions: QuestionRequest) => {
    setGeneratedQuestions(questions);
  };

  const handleLoadToForm = (formData: InsertQuestionRequest) => {
    setLoadFormData(formData);
    setTimeout(() => setLoadFormData(null), 100);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <LatexRenderer>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hệ thống tạo câu hỏi</h1>
              <p className="text-sm text-gray-600">Tạo câu hỏi tự động bằng AI</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="font-medium">{user?.fullName}</span>
                <span className="text-gray-500">({user?.gradeLevel} - Lớp {user?.classNumber})</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <QuestionForm
              onQuestionsGenerated={handleQuestionsGenerated}
              loadFormData={loadFormData}
            />
            <GeneratedQuestions questions={generatedQuestions} />
          </div>
        </main>
      </div>
    </LatexRenderer>
  );
}
