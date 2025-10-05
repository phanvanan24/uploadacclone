import type { QuestionRequest, GeneratedQuestion } from '@shared/schema';

export interface TextExportOptions {
  includeAnswers?: boolean;
  includeExplanations?: boolean;
  includeHeader?: boolean;
}

export class TextExporter {
  private convertLatexToText = (text: string): string => {
    // Convert common LaTeX expressions to readable text
    return text
      // Superscripts
      .replace(/\$([^$]*)\^([^$]*)\$/g, '$1^$2')
      .replace(/\$([^$]*)\^{([^}]*)}\$/g, '$1^($2)')
      
      // Subscripts
      .replace(/\$([^$]*)_([^$]*)\$/g, '$1_$2')
      .replace(/\$([^$]*)_{([^}]*)}\$/g, '$1_($2)')
      
      // Fractions
      .replace(/\\frac{([^}]*)}{([^}]*)}/g, '($1)/($2)')
      
      // Square roots
      .replace(/\\sqrt{([^}]*)}/g, '√($1)')
      .replace(/\\sqrt\[([^\]]*)\]{([^}]*)}/g, '$2^(1/$1)')
      
      // Mathematical symbols
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\epsilon/g, 'ε')
      .replace(/\\theta/g, 'θ')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\mu/g, 'μ')
      .replace(/\\pi/g, 'π')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\phi/g, 'φ')
      .replace(/\\omega/g, 'ω')
      
      // Mathematical operators
      .replace(/\\cdot/g, '⋅')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\pm/g, '±')
      .replace(/\\mp/g, '∓')
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\ne/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\infty/g, '∞')
      
      // Remove remaining LaTeX markup
      .replace(/\$([^$]*)\$/g, '$1')
      .replace(/\\[a-zA-Z]+\s*/g, '')
      .replace(/[{}]/g, '')
      
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  private generateFilename = (questions: QuestionRequest): string => {
    const subjectNames: Record<string, string> = {
      'toan': 'Toan',
      'ly': 'VatLy', 
      'hoa': 'HoaHoc',
      'sinh': 'SinhHoc',
      'van': 'NguVan',
      'anh': 'TiengAnh',
      'su': 'LichSu',
      'dia': 'DiaLy',
      'gdcd': 'GDCD',
      'tin': 'TinHoc'
    };

    const subject = subjectNames[questions.subject] || questions.subject;
    const topic = questions.topic
      .replace(/[^a-zA-Z0-9À-ỹ]/g, '')
      .substring(0, 20);
    const date = new Date().getFullYear();
    
    return `${subject}_${topic}_${date}.txt`;
  };

  private formatHeader = (questions: QuestionRequest): string => {
    const subjectNames: Record<string, string> = {
      'toan': 'TOÁN HỌC',
      'ly': 'VẬT LÝ', 
      'hoa': 'HÓA HỌC',
      'sinh': 'SINH HỌC',
      'van': 'NGỮ VĂN',
      'anh': 'TIẾNG ANH',
      'su': 'LỊCH SỬ',
      'dia': 'ĐỊA LÝ',
      'gdcd': 'GIÁO DỤC CÔNG DÂN',
      'tin': 'TIN HỌC'
    };

    const difficultyNames: Record<string, string> = {
      'easy': 'DỄ',
      'medium': 'TRUNG BÌNH',
      'hard': 'KHÓ'
    };

    const subjectName = subjectNames[questions.subject] || questions.subject.toUpperCase();
    const difficultyName = difficultyNames[questions.difficulty] || questions.difficulty.toUpperCase();
    const questionCount = questions.generatedQuestions?.length || 0;
    const currentDate = new Date().toLocaleDateString('vi-VN');

    return `
================================================================================
                        BÀI KIỂM TRA ${subjectName}
================================================================================

Chủ đề: ${questions.topic}
Độ khó: ${difficultyName}
Số câu: ${questionCount}
Ngày tạo: ${currentDate}

--------------------------------------------------------------------------------
HƯỚNG DẪN: Đọc kỹ đề bài và chọn đáp án đúng nhất. 
Ghi rõ lời giải cho các câu tự luận.
--------------------------------------------------------------------------------

`.trim();
  };

  private formatQuestion = (question: GeneratedQuestion): string => {
    let result = `\nCâu ${question.id}: ${this.convertLatexToText(question.question)}\n`;

    // Add options for multiple choice
    if (question.type === 'multiple_choice' && question.options) {
      result += '\n';
      question.options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        result += `${letter}. ${this.convertLatexToText(option)}\n`;
      });
    }

    // Add True/False options
    if (question.type === 'true_false') {
      result += '\nA. Đúng\nB. Sai\n';
    }

    // Add space for essay questions
    if (question.type === 'essay') {
      result += '\n' + '_'.repeat(60) + '\n';
      result += '_'.repeat(60) + '\n';
      result += '_'.repeat(60) + '\n';
    }

    // Add fill-in-blank formatting
    if (question.type === 'fill_in_blank') {
      result += '\nĐiền vào chỗ trống: _________________\n';
    }

    // Add matching question formatting
    if (question.type === 'matching' && question.leftItems && question.rightItems) {
      result += '\n';
      result += 'Cột A:\n';
      question.leftItems.forEach((item, idx) => {
        result += `${idx + 1}. ${this.convertLatexToText(item)}\n`;
      });
      
      result += '\nCột B:\n';
      question.rightItems.forEach((item, idx) => {
        result += `${String.fromCharCode(65 + idx)}. ${this.convertLatexToText(item)}\n`;
      });
      
      const matchingPlaceholders = Array.from({length: question.leftItems.length}, (_, i) => `${i + 1}-__`).join(', ');
      result += `\nĐáp án: ${matchingPlaceholders}\n`;
    }

    // Add ordering question formatting
    if (question.type === 'ordering' && question.items) {
      result += '\nSắp xếp các mục sau theo thứ tự đúng:\n';
      question.items.forEach((item, idx) => {
        result += `${String.fromCharCode(65 + idx)}. ${this.convertLatexToText(item)}\n`;
      });
      const orderingPlaceholders = Array.from({length: question.items.length}, () => '__').join(', ');
      result += `\nThứ tự đúng: ${orderingPlaceholders}\n`;
    }

    return result;
  };

  private formatAnswerKey = (questions: GeneratedQuestion[]): string => {
    const answersWithKey = questions.filter(q => 
      q.correctAnswer || q.correctMatches || q.correctOrder || q.blanks
    );
    if (answersWithKey.length === 0) return '';

    let result = '\n\n';
    result += '================================================================================\n';
    result += '                                  ĐÁP ÁN\n';
    result += '================================================================================\n\n';

    answersWithKey.forEach((question) => {
      let answerText = '';
      
      if (question.correctAnswer) {
        answerText = question.correctAnswer;
      } else if (question.correctMatches && question.type === 'matching') {
        answerText = Object.entries(question.correctMatches).map(([left, right], idx) => `${idx + 1}→${right}`).join(', ');
      } else if (question.correctOrder && question.type === 'ordering') {
        answerText = question.correctOrder.map((index, pos) => `${pos + 1}. ${question.items?.[index] || index}`).join(', ');
      } else if (question.blanks && question.type === 'fill_in_blank') {
        answerText = question.blanks.join(', ');
      }
      
      if (answerText) {
        result += `Câu ${question.id}: ${answerText}\n`;
      }
    });

    return result;
  };

  private formatExplanations = (questions: GeneratedQuestion[]): string => {
    const questionsWithExplanations = questions.filter(q => q.explanation);
    if (questionsWithExplanations.length === 0) return '';

    let result = '\n\n';
    result += '================================================================================\n';
    result += '                              HƯỚNG DẪN GIẢI\n';
    result += '================================================================================\n';

    questionsWithExplanations.forEach((question) => {
      result += `\nCâu ${question.id}:\n`;
      
      // Format explanation with proper line breaks and structure
      let formattedExplanation = this.convertLatexToText(question.explanation!)
        // Replace common separators with line breaks
        .replace(/==>/g, '\n→ ')
        .replace(/\*\*Bước \d+:\*\*/g, match => `\n\n${match.replace(/\*\*/g, '')}`)
        .replace(/\*\*KẾT QUẢ:\*\*/g, '\n\nKẾT QUẢ:')
        .replace(/\*\*([^*]+):\*\*/g, '\n$1:')
        // Add spacing between sentences
        .replace(/\. ([A-ZĐẾỊỌĂÂÊÔƯA])/g, '.\n$1')
        // Clean up multiple line breaks
        .replace(/(\n\s*){3,}/g, '\n\n');
        
      result += `${formattedExplanation}\n`;
      result += '\n' + '-'.repeat(80) + '\n';
    });

    return result;
  };

  private formatFooter = (): string => {
    const currentDateTime = `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`;
    
    return `

================================================================================
              Được tạo bởi LimVA • ${currentDateTime}
================================================================================`;
  };

  public generateTextContent = (
    questions: QuestionRequest,
    options: TextExportOptions = {}
  ): string => {
    const {
      includeAnswers = true,
      includeExplanations = true,
      includeHeader = true
    } = options;

    if (!questions.generatedQuestions?.length) {
      throw new Error('Không có câu hỏi để xuất văn bản');
    }

    let content = '';

    // Add header
    if (includeHeader) {
      content += this.formatHeader(questions);
    }

    // Add questions
    questions.generatedQuestions.forEach((question) => {
      content += this.formatQuestion(question);
    });

    // Add answer key
    if (includeAnswers) {
      content += this.formatAnswerKey(questions.generatedQuestions);
    }

    // Add explanations
    if (includeExplanations) {
      content += this.formatExplanations(questions.generatedQuestions);
    }

    // Add footer
    content += this.formatFooter();

    return content;
  };

  public downloadText = (
    questions: QuestionRequest,
    options: TextExportOptions = {}
  ): void => {
    try {
      const content = this.generateTextContent(questions, options);
      const filename = this.generateFilename(questions);

      // Create blob and download
      const blob = new Blob([content], { 
        type: 'text/plain;charset=utf-8' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Text export failed:', error);
      throw new Error('Không thể xuất văn bản. Vui lòng thử lại.');
    }
  };
}

// Export singleton instance
export const textExporter = new TextExporter();