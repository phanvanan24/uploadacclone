import { useState } from "react";
import { QuestionForm } from "@/components/question-form";
import { GeneratedQuestions } from "@/components/generated-questions";
import { QuestionHistory } from "@/components/question-history";
import { LatexRenderer } from "@/lib/latex-renderer";
import { Lightbulb, Zap } from "lucide-react";
import type { QuestionRequest, InsertQuestionRequest } from "@shared/schema";

export default function Home() {
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
    // Reset after form processes the data
    setTimeout(() => setLoadFormData(null), 100);
  };

  return (
    <LatexRenderer>
      <div className="min-h-screen bg-background">
        

        {/* Main Content */}
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
