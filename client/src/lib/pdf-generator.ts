import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import renderMathInElement from 'katex/contrib/auto-render';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { QuestionRequest, GeneratedQuestion } from '@shared/schema';

// Support for Vietnamese fonts
const VIETNAMESE_FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';

export interface PDFGenerationOptions {
  includeAnswers?: boolean;
  includeExplanations?: boolean;
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export class PDFGenerator {
  private katexLoaded = false;
  
  private async ensureKatexLoaded(): Promise<void> {
    if (this.katexLoaded) return;
    
    try {
      // Ensure KaTeX is available globally
      if (!window.katex) {
        (window as any).katex = katex;
      }
      this.katexLoaded = true;
      console.log('KaTeX loaded successfully');
    } catch (error) {
      console.error('Failed to load KaTeX:', error);
      this.katexLoaded = false;
    }
  }
  private loadVietnameseFont = async (): Promise<void> => {
    return new Promise((resolve) => {
      // Check if font is already loaded
      const existingLink = document.querySelector(`link[href="${VIETNAMESE_FONT_URL}"]`);
      if (existingLink) {
        resolve();
        return;
      }
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = VIETNAMESE_FONT_URL;
      link.onload = () => {
        console.log('Vietnamese font loaded successfully');
        // Give additional time for font to be available
        setTimeout(resolve, 300);
      };
      link.onerror = () => {
        console.warn('Failed to load Vietnamese font, continuing anyway');
        resolve();
      };
      document.head.appendChild(link);
    });
  };

  private generateFilename = (questions: QuestionRequest): string => {
    const subjectNames: Record<string, string> = {
      'toan': 'Toan',
      'ly': 'VatLy', 
      'hoa': 'HoaHoc',
      'sinh': 'SinhHoc',
      'van': 'NguVan',
      'anh': 'TiengAnh',
      'tin': 'TinHoc'
    };

    const subject = subjectNames[questions.subject] || questions.subject;
    const topic = questions.topic
      .replace(/[^a-zA-Z0-9À-ỹ]/g, '')
      .substring(0, 20);
    const date = new Date().getFullYear();
    
    return `${subject}_${topic}_${date}.pdf`;
  };

  private createPDFContent = (questions: QuestionRequest, options: PDFGenerationOptions): HTMLElement => {
    const container = document.createElement('div');
    container.style.cssText = `
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      background: white;
      color: black;
      line-height: 1.6;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    `;
    
    const subjectNames: Record<string, string> = {
      'toan': 'TOÁN HỌC',
      'ly': 'VẬT LÝ', 
      'hoa': 'HÓA HỌC',
      'sinh': 'SINH HỌC',
      'van': 'NGỮ VĂN',
      'anh': 'TIẾNG ANH',
      'tin': 'TIN HỌC'
    };

    const difficultyNames: Record<string, string> = {
      'easy': 'DỄ',
      'medium': 'TRUNG BÌNH',
      'hard': 'KHÓ',
      'expert': 'CHUYÊN GIA'
    };

    header.innerHTML = `
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 10px 0;">
        BÀI KIỂM TRA ${subjectNames[questions.subject] || questions.subject.toUpperCase()}
      </h1>
      <div style="font-size: 16px; font-weight: 500; margin-bottom: 5px;">
        Chủ đề: ${questions.topic}
      </div>
      <div style="font-size: 14px; color: #666;">
        Độ khó: ${difficultyNames[questions.difficulty] || questions.difficulty} • 
        Số câu: ${questions.generatedQuestions?.length || 0} • 
        Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}
      </div>
    `;

    container.appendChild(header);

    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
      font-size: 14px;
    `;
    instructions.innerHTML = `
      <strong>Hướng dẫn:</strong> Đọc kỹ đề bài và chọn đáp án đúng nhất. 
      Ghi rõ lời giải cho các câu tự luận.
    `;
    container.appendChild(instructions);

    // Questions
    const questionsSection = document.createElement('div');
    questionsSection.style.marginBottom = '40px';

    questions.generatedQuestions?.forEach((question, index) => {
      const questionDiv = document.createElement('div');
      questionDiv.style.cssText = `
        margin-bottom: 25px;
        page-break-inside: avoid;
      `;

      const questionNumber = document.createElement('div');
      questionNumber.style.cssText = `
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 8px;
        color: #1a1a1a;
      `;
      // Format question text with proper line breaks for Vietnamese literature
      const formattedQuestion = question.question.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
      questionNumber.innerHTML = `Câu ${question.id}: ${formattedQuestion}`;
      questionDiv.appendChild(questionNumber);

      // Add Cloze Test format for Reading1 and Reading (both use same format)
      if ((question.type === 'multiple_choice_reading1' || question.type === 'multiple_choice') && question.passage && question.clozeBlanks) {
        // Render passage with blanks
        const passageDiv = document.createElement('div');
        passageDiv.style.cssText = `
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.5;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          border-left: 4px solid #007bff;
        `;
        
        // Replace numbered blanks with _______ for print format
        let displayPassage = question.passage;
        question.clozeBlanks.forEach((blank) => {
          displayPassage = displayPassage.replace(`(${blank.number})`, '______');
        });
        
        passageDiv.innerHTML = displayPassage.replace(/\n/g, '<br>');
        questionDiv.appendChild(passageDiv);

        // Render questions for each blank
        const blanksSection = document.createElement('div');
        blanksSection.style.cssText = `
          margin-left: 20px;
          margin-top: 15px;
        `;

        question.clozeBlanks.forEach((blank) => {
          const blankDiv = document.createElement('div');
          blankDiv.style.cssText = `
            margin-bottom: 12px;
            font-size: 14px;
          `;

          const blankHeader = document.createElement('div');
          blankHeader.style.cssText = `
            font-weight: 600;
            margin-bottom: 5px;
          `;
          blankHeader.innerHTML = `Question ${blank.number}.`;
          blankDiv.appendChild(blankHeader);

          // Add options for this blank
          const optionsDiv = document.createElement('div');
          optionsDiv.style.cssText = `
            margin-left: 15px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          `;

          blank.options.forEach((option, optionIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.style.cssText = `
              font-size: 14px;
            `;
            optionDiv.innerHTML = option;
            optionsDiv.appendChild(optionDiv);
          });

          blankDiv.appendChild(optionsDiv);
          blanksSection.appendChild(blankDiv);
        });

        questionDiv.appendChild(blanksSection);
      }

      // Add Reading Comprehension format for Reading and Reading2
      if ((question.type === 'multiple_choice' || question.type === 'multiple_choice_reading2') && question.passage && question.readingQuestions) {
        // Render passage
        const passageDiv = document.createElement('div');
        passageDiv.style.cssText = `
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.6;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          border-left: 4px solid #28a745;
        `;
        
        passageDiv.innerHTML = question.passage.replace(/\n/g, '<br>');
        questionDiv.appendChild(passageDiv);

        // Render separate questions
        const questionsSection = document.createElement('div');
        questionsSection.style.cssText = `
          margin-left: 20px;
          margin-top: 20px;
        `;

        question.readingQuestions.forEach((readingQ) => {
          const readingQDiv = document.createElement('div');
          readingQDiv.style.cssText = `
            margin-bottom: 18px;
            font-size: 14px;
          `;

          const questionHeader = document.createElement('div');
          questionHeader.style.cssText = `
            font-weight: 600;
            margin-bottom: 8px;
            color: #1a1a1a;
          `;
          questionHeader.innerHTML = `Question ${readingQ.number}. ${readingQ.question}`;
          readingQDiv.appendChild(questionHeader);

          // Add options for this question
          const optionsDiv = document.createElement('div');
          optionsDiv.style.cssText = `
            margin-left: 15px;
          `;

          readingQ.options.forEach((option, optionIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.style.cssText = `
              margin-bottom: 4px;
              font-size: 14px;
            `;
            optionDiv.innerHTML = option;
            optionsDiv.appendChild(optionDiv);
          });

          readingQDiv.appendChild(optionsDiv);
          questionsSection.appendChild(readingQDiv);
        });

        questionDiv.appendChild(questionsSection);
      }

      // Add options for standard multiple choice
      if (question.type === 'multiple_choice' && question.options) {
        const optionsDiv = document.createElement('div');
        optionsDiv.style.cssText = `
          margin-left: 20px;
          margin-top: 10px;
        `;

        question.options.forEach((option, optionIndex) => {
          const optionDiv = document.createElement('div');
          optionDiv.style.cssText = `
            margin-bottom: 5px;
            font-size: 14px;
          `;
          optionDiv.innerHTML = `${String.fromCharCode(65 + optionIndex)}. ${option}`;
          optionsDiv.appendChild(optionDiv);
        });

        questionDiv.appendChild(optionsDiv);
      }

      // Add True/False options
      if (question.type === 'true_false') {
        
        // Check if it's the new format with statements
        if (question.statements && question.statementAnswers) {
          // New table format for complex true/false
          const tableDiv = document.createElement('div');
          tableDiv.style.cssText = `
            margin-top: 15px;
            margin-left: 20px;
          `;

          const table = document.createElement('table');
          table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #333;
            font-size: 14px;
          `;

          // Table header
          const thead = document.createElement('thead');
          const headerRow = document.createElement('tr');
          
          const headerStatement = document.createElement('th');
          headerStatement.style.cssText = `
            border: 1px solid #333;
            padding: 8px;
            background-color: #f5f5f5;
            text-align: center;
            font-weight: bold;
            width: 70%;
          `;
          headerStatement.textContent = 'Mệnh đề';

          const headerTrue = document.createElement('th');
          headerTrue.style.cssText = `
            border: 1px solid #333;
            padding: 8px;
            background-color: #f5f5f5;
            text-align: center;
            font-weight: bold;
            width: 15%;
          `;
          headerTrue.textContent = 'Đúng';

          const headerFalse = document.createElement('th');
          headerFalse.style.cssText = `
            border: 1px solid #333;
            padding: 8px;
            background-color: #f5f5f5;
            text-align: center;
            font-weight: bold;
            width: 15%;
          `;
          headerFalse.textContent = 'Sai';

          headerRow.appendChild(headerStatement);
          headerRow.appendChild(headerTrue);
          headerRow.appendChild(headerFalse);
          thead.appendChild(headerRow);
          table.appendChild(thead);

          // Table body
          const tbody = document.createElement('tbody');
          question.statements.forEach((statement, idx) => {
            const row = document.createElement('tr');
            
            const statementCell = document.createElement('td');
            statementCell.style.cssText = `
              border: 1px solid #333;
              padding: 8px;
              text-align: left;
            `;
            statementCell.innerHTML = statement;

            const trueCell = document.createElement('td');
            trueCell.style.cssText = `
              border: 1px solid #333;
              padding: 8px;
              text-align: center;
            `;
            
            const falseCell = document.createElement('td');
            falseCell.style.cssText = `
              border: 1px solid #333;
              padding: 8px;
              text-align: center;
            `;

            // Always show empty cells for students to fill
            trueCell.innerHTML = '';
            falseCell.innerHTML = '';

            row.appendChild(statementCell);
            row.appendChild(trueCell);
            row.appendChild(falseCell);
            tbody.appendChild(row);
          });

          table.appendChild(tbody);
          tableDiv.appendChild(table);
          questionDiv.appendChild(tableDiv);

        } else {
          // Legacy simple true/false format
          const tfDiv = document.createElement('div');
          tfDiv.style.cssText = `
            margin-left: 20px;
            margin-top: 10px;
            display: flex;
            gap: 20px;
          `;
          tfDiv.innerHTML = `
            <span style="font-size: 14px;">A. Đúng</span>
            <span style="font-size: 14px;">B. Sai</span>
          `;
          questionDiv.appendChild(tfDiv);
        }
      }

      // Add special formatting for Vietnamese literature reading comprehension
      if (question.type === 'essay_reading') {
        // For essay_reading, don't add answer space since it contains the full passage and questions
        questionNumber.style.lineHeight = '1.6';
        questionNumber.style.textAlign = 'justify';
        questionNumber.style.whiteSpace = 'pre-line';
      }

      // Add special formatting for Vietnamese literature essay writing
      if (question.type === 'essay_writing') {
        // For essay_writing, format similar to essay_reading but with essay writing space
        questionNumber.style.lineHeight = '1.6';
        questionNumber.style.textAlign = 'justify';
        questionNumber.style.whiteSpace = 'pre-line';
        
        // Add essay writing space
        const essaySpace = document.createElement('div');
        essaySpace.style.cssText = `
          margin-top: 20px;
          border: 1px solid #ddd;
          border-radius: 4px;
          height: 120px;
          background: #fafafa;
          padding: 10px;
          font-size: 12px;
          color: #666;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        essaySpace.innerHTML = `Khu vực viết đoạn văn nghị luận (khoảng 200 chữ)`;
        questionDiv.appendChild(essaySpace);
      }

      // Add answer space for essay questions
      if (question.type === 'essay') {
        const answerSpace = document.createElement('div');
        answerSpace.style.cssText = `
          margin-top: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          height: 80px;
          background: #fafafa;
        `;
        questionDiv.appendChild(answerSpace);
      }

      // Add fill-in-blank formatting
      if (question.type === 'fill_in_blank') {
        const blankSpace = document.createElement('div');
        blankSpace.style.cssText = `
          margin-top: 10px;
          margin-left: 20px;
          font-size: 14px;
          color: #666;
        `;
        blankSpace.innerHTML = `Điền vào chỗ trống: _________________`;
        questionDiv.appendChild(blankSpace);
      }

      // Add matching question formatting
      if (question.type === 'matching' && question.leftItems && question.rightItems) {
        const matchingDiv = document.createElement('div');
        matchingDiv.style.cssText = `
          margin-top: 10px;
          margin-left: 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          font-size: 14px;
        `;

        const leftColumn = document.createElement('div');
        leftColumn.innerHTML = `<strong>Cột A:</strong><br>` + 
          question.leftItems.map((item, idx) => `${idx + 1}. ${item}`).join('<br>');
        
        const rightColumn = document.createElement('div');
        rightColumn.innerHTML = `<strong>Cột B:</strong><br>` +
          question.rightItems.map((item, idx) => `${String.fromCharCode(65 + idx)}. ${item}`).join('<br>');

        matchingDiv.appendChild(leftColumn);
        matchingDiv.appendChild(rightColumn);
        questionDiv.appendChild(matchingDiv);

        // Add answer space for matching
        const matchingAnswer = document.createElement('div');
        matchingAnswer.style.cssText = `
          margin-top: 15px;
          margin-left: 20px;
          font-size: 14px;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          background: #fafafa;
        `;
        const matchingPlaceholders = Array.from({length: question.leftItems.length}, (_, i) => `${i + 1}-__`).join(', ');
        matchingAnswer.innerHTML = `Đáp án: ${matchingPlaceholders}`;
        questionDiv.appendChild(matchingAnswer);
      }

      // Add ordering question formatting
      if (question.type === 'ordering' && question.items) {
        const orderingDiv = document.createElement('div');
        orderingDiv.style.cssText = `
          margin-top: 10px;
          margin-left: 20px;
          font-size: 14px;
        `;

        orderingDiv.innerHTML = `
          <div style="margin-bottom: 10px;"><strong>Sắp xếp các mục sau theo thứ tự đúng:</strong></div>
          ${question.items.map((item) => `${item}`).join('<br>')}
        `;
        questionDiv.appendChild(orderingDiv);

        // Add options for ordering (A, B, C, D choices)
        if (question.options && question.options.length > 0) {
          const optionsDiv = document.createElement('div');
          optionsDiv.style.cssText = `
            margin-top: 15px;
            margin-left: 20px;
            font-size: 14px;
          `;
          
          optionsDiv.innerHTML = question.options.map(option => 
            `<div style="margin-bottom: 5px;">${option}</div>`
          ).join('');
          questionDiv.appendChild(optionsDiv);
        }
      }

      questionsSection.appendChild(questionDiv);
    });

    container.appendChild(questionsSection);

    // Answer key (if requested)
    if (options.includeAnswers && questions.generatedQuestions?.some(q => 
      q.correctAnswer || q.correctMatches || q.correctOrder || q.blanks || q.statementAnswers || q.clozeBlanks || q.readingQuestions
    )) {
      const answerKey = document.createElement('div');
      answerKey.style.cssText = `
        page-break-before: always;
        border-top: 2px solid #000;
        padding-top: 20px;
        margin-top: 40px;
      `;

      const answerTitle = document.createElement('h2');
      answerTitle.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 20px;
        text-align: center;
      `;
      answerTitle.textContent = 'ĐÁP ÁN';
      answerKey.appendChild(answerTitle);

      questions.generatedQuestions?.forEach((question) => {
        let answerText = '';
        
        if (question.correctAnswer) {
          answerText = question.correctAnswer;
        } else if (question.correctMatches && question.type === 'matching') {
          answerText = Object.entries(question.correctMatches).map(([left, right], idx) => `${idx + 1}→${right}`).join(', ');
        } else if (question.correctAnswer && question.type === 'ordering') {
          answerText = question.correctAnswer;
        } else if (question.blanks && question.type === 'fill_in_blank') {
          answerText = question.blanks.join(', ');
        } else if (question.statementAnswers && question.type === 'true_false' && question.statements) {
          // Handle new true/false format with statements
          answerText = question.statementAnswers.map((answer, idx) => {
            const letter = String.fromCharCode(97 + idx); // a, b, c, d
            return `${letter}) ${answer ? 'Đúng' : 'Sai'}`;
          }).join(', ');
        } else if (question.clozeBlanks && (question.type === 'multiple_choice_reading1' || question.type === 'multiple_choice')) {
          // Handle cloze test format answers (Reading1 and Reading)
          answerText = question.clozeBlanks.map((blank) => {
            return `(${blank.number}) ${blank.correctAnswer}`;
          }).join(', ');
        } else if (question.readingQuestions && question.type === 'multiple_choice_reading2') {
          // Handle reading comprehension format answers (Reading2 only)
          answerText = question.readingQuestions.map((readingQ) => {
            return `${readingQ.number}. ${readingQ.correctAnswer}`;
          }).join(', ');
        }
        
        if (answerText) {
          const answerItem = document.createElement('div');
          answerItem.style.cssText = `
            margin-bottom: 10px;
            font-size: 14px;
          `;
          answerItem.innerHTML = `<strong>Câu ${question.id}:</strong> ${answerText}`;
          answerKey.appendChild(answerItem);
        }
      });

      container.appendChild(answerKey);
    }

    // Explanations (if requested)
    if (options.includeExplanations && questions.generatedQuestions?.some(q => q.explanation || q.statementExplanations || q.readingQuestions)) {
      const explanations = document.createElement('div');
      explanations.style.cssText = `
        page-break-before: always;
        border-top: 2px solid #000;
        padding-top: 20px;
        margin-top: 40px;
      `;

      const explanationTitle = document.createElement('h2');
      explanationTitle.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 20px;
        text-align: center;
      `;
      explanationTitle.textContent = 'HƯỚNG DẪN GIẢI';
      explanations.appendChild(explanationTitle);

      questions.generatedQuestions?.forEach((question) => {
        if (question.explanation || (question.statementExplanations && question.statementExplanations.length > 0) || (question.clozeBlanks && (question.type === 'multiple_choice_reading1' || question.type === 'multiple_choice')) || (question.readingQuestions && question.type === 'multiple_choice_reading2')) {
          const explanationItem = document.createElement('div');
          explanationItem.style.cssText = `
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 14px;
          `;
          
          let explanationContent = `<strong>Câu ${question.id}:</strong><br>`;
          
          // Handle general explanation
          if (question.explanation) {
            // Format explanation with proper line breaks and structure
            let formattedExplanation = question.explanation
              // Convert line breaks from AI response
              .replace(/\\n/g, '<br>')
              .replace(/\n/g, '<br>')
              // Replace common separators with line breaks
              .replace(/==>/g, '<br><strong>→</strong> ')
              .replace(/\*\*Bước \d+:\*\*/g, match => `<br><br><strong>${match.replace(/\*\*/g, '')}</strong>`)
              .replace(/\*\*KẾT QUẢ:\*\*/g, '<br><br><strong>KẾT QUẢ:</strong>')
              .replace(/\*\*([^*]+):\*\*/g, '<br><strong>$1:</strong>')
              // Special formatting for Vietnamese literature essays
              .replace(/Câu \d+:/g, match => `<br><strong>${match}</strong>`)
              // Add spacing between sentences
              .replace(/\. ([A-ZĐẾỊỌĂÂÊÔƯA])/g, '.<br>$1')
              // Clean up multiple line breaks
              .replace(/(<br>\s*){3,}/g, '<br><br>');
              
            explanationContent += `<div style="margin: 10px 0; line-height: 1.6; text-align: justify; white-space: pre-line;">${formattedExplanation}</div>`;
          }
          
          // Handle individual statement explanations for new true/false format
          if (question.statementExplanations && question.statements && question.type === 'true_false') {
            explanationContent += `<br><strong>Giải thích từng mệnh đề:</strong><br>`;
            question.statementExplanations.forEach((explanation, idx) => {
              const letter = String.fromCharCode(97 + idx); // a, b, c, d
              const answer = question.statementAnswers?.[idx] ? 'Đúng' : 'Sai';
              explanationContent += `<div style="margin: 8px 0;"><strong>${letter}) ${answer}:</strong> ${explanation}</div>`;
            });
          }
          
          // Handle cloze test format explanations (Reading1 and Reading)
          if ((question.type === 'multiple_choice_reading1' || question.type === 'multiple_choice') && question.clozeBlanks) {
            explanationContent += `<br><strong>Giải thích từng câu hỏi:</strong><br>`;
            question.clozeBlanks.forEach((blank) => {
              explanationContent += `<div style="margin: 8px 0;"><strong>Question ${blank.number}: ${blank.correctAnswer}</strong></div>`;
            });
          }
          
          // Handle reading comprehension format explanations (Reading2 only)
          if (question.type === 'multiple_choice_reading2' && question.readingQuestions) {
            explanationContent += `<br><strong>Giải thích từng câu hỏi:</strong><br>`;
            question.readingQuestions.forEach((readingQ) => {
              explanationContent += `<div style="margin: 8px 0;"><strong>Question ${readingQ.number}: ${readingQ.correctAnswer}</strong></div>`;
            });
          }
          
          explanationItem.innerHTML = explanationContent;
          explanations.appendChild(explanationItem);
        }
      });

      container.appendChild(explanations);
    }

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    `;
    footer.innerHTML = `
      <div>Được tạo bởi LimVA • ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}</div>
    `;
    container.appendChild(footer);

    return container;
  };

  private renderMathInElement = async (element: HTMLElement): Promise<void> => {
    return new Promise((resolve) => {
      try {
        console.log('Starting LaTeX rendering...');
        
        // Ensure KaTeX is loaded
        this.ensureKatexLoaded();
        
        // Check if KaTeX is available
        if (!window.katex && !katex) {
          console.warn('KaTeX not available, skipping math rendering');
          resolve();
          return;
        }
        
        // Use imported KaTeX auto-render directly
        renderMathInElement(element, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
          trust: true
        });
        
        console.log('LaTeX rendering completed');
        // Give more time for rendering to complete and stabilize
        setTimeout(() => {
          console.log('LaTeX rendering timeout completed');
          resolve();
        }, 800);
      } catch (error) {
        console.error('LaTeX rendering failed:', error);
        resolve();
      }
    });
  };

  public generatePDFPreview = async (
    questions: QuestionRequest,
    options: PDFGenerationOptions = {}
  ): Promise<HTMLElement> => {
    console.log('Starting PDF preview generation with options:', options);
    console.log('Questions data:', {
      count: questions.generatedQuestions?.length || 0,
      hasQuestions: !!questions.generatedQuestions?.length,
      subject: questions.subject,
      topic: questions.topic
    });
    
    if (!questions.generatedQuestions?.length) {
      throw new Error('Không có câu hỏi để tạo xem trước');
    }

    try {
      // Load Vietnamese font first
      await this.loadVietnameseFont();
      
      const content = this.createPDFContent(questions, {
        includeAnswers: true,
        includeExplanations: true,
        ...options
      });

      console.log('PDF content created, element children:', content.children.length);
      console.log('Content HTML length:', content.innerHTML.length);

      // Add to DOM temporarily for math rendering
      content.style.position = 'absolute';
      content.style.left = '-9999px';
      content.style.top = '-9999px';
      content.style.visibility = 'hidden';
      document.body.appendChild(content);

      try {
        // Render math expressions
        await this.renderMathInElement(content);
        
        // Clone the content before removing from DOM
        const clonedContent = content.cloneNode(true) as HTMLElement;
        document.body.removeChild(content);
        
        // Reset positioning for preview
        clonedContent.style.position = 'static';
        clonedContent.style.left = 'auto';
        clonedContent.style.top = 'auto';
        clonedContent.style.visibility = 'visible';
        
        console.log('PDF preview generation completed successfully');
        return clonedContent;
      } catch (error) {
        document.body.removeChild(content);
        throw error;
      }
    } catch (error) {
      console.error('PDF preview generation failed:', error);
      throw new Error(`Không thể tạo xem trước PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  private normalizePaperSize = (paperSize?: 'A4' | 'Letter'): string => {
    const sizeMap: Record<string, string> = {
      'A4': 'a4',
      'Letter': 'letter'
    };
    return sizeMap[paperSize || 'A4'] || 'a4';
  };

  public downloadPDF = async (
    questions: QuestionRequest,
    options: PDFGenerationOptions = {}
  ): Promise<void> => {
    console.log('Starting PDF download generation with options:', options);
    
    if (!questions.generatedQuestions?.length) {
      throw new Error('Không có câu hỏi để xuất PDF');
    }

    try {
      // Load Vietnamese font first
      await this.loadVietnameseFont();
      console.log('Font loading completed');

      const content = this.createPDFContent(questions, {
        includeAnswers: options.includeAnswers || false,
        includeExplanations: options.includeExplanations || false,
        ...options
      });

      console.log('PDF content created for download');
      console.log('Content summary:', {
        children: content.children.length,
        htmlLength: content.innerHTML.length,
        hasQuestions: content.innerHTML.includes('Câu ')
      });

      // Add to DOM temporarily for rendering - use better positioning
      content.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 800px;
        min-height: 1000px;
        background: white;
        visibility: hidden;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      `;
      document.body.appendChild(content);

      try {
        // Render math expressions
        await this.renderMathInElement(content);
        console.log('Math rendering completed for PDF');
        
        // Additional delay to ensure everything is rendered
        await new Promise(resolve => setTimeout(resolve, 500));

        const opt = {
          margin: [15, 15, 15, 15],
          filename: this.generateFilename(questions),
          image: { 
            type: 'jpeg', 
            quality: 0.8 
          },
          html2canvas: { 
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: true,
            scrollX: 0,
            scrollY: 0,
            width: 800,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            windowHeight: Math.min(content.offsetHeight || 1200, 3000) // Limit max height
          },
          jsPDF: { 
            unit: 'mm', 
            format: this.normalizePaperSize(options.paperSize), 
            orientation: options.orientation || 'portrait',
            compress: true
          }
        };

        console.log('Starting html2pdf conversion with options:', opt);
        
        // Generate and download PDF with timeout
        const pdfPromise = html2pdf().set(opt).from(content).save();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timeout after 30 seconds')), 30000)
        );
        
        await Promise.race([pdfPromise, timeoutPromise]);
        
        console.log('PDF download completed successfully');
        
        // Clean up
        document.body.removeChild(content);
      } catch (renderError) {
        console.error('PDF rendering error:', renderError);
        document.body.removeChild(content);
        throw renderError;
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error(`Không thể tạo PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
}

// Export singleton instance
export const pdfGenerator = new PDFGenerator();