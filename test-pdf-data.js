/**
 * Comprehensive Test Data for PDF Generation Testing
 * Tests all question types, LaTeX formulas, and Vietnamese text handling
 */

// Test data for Multiple Choice questions with LaTeX
const multipleChoiceQuestions = [
  {
    id: "1",
    type: "multiple_choice",
    question: "Giải phương trình $x^2 - 4x + 3 = 0$ và tìm tổng các nghiệm:",
    options: [
      "A. $S = 4$",
      "B. $S = 3$", 
      "C. $S = -4$",
      "D. $S = -3$"
    ],
    correctAnswer: "A",
    explanation: "Theo định lý Vieta, tổng các nghiệm $S = -\\frac{b}{a} = -\\frac{-4}{1} = 4$. Hoặc giải ra được $x_1 = 1, x_2 = 3$ nên $S = 1 + 3 = 4$."
  },
  {
    id: "2", 
    type: "multiple_choice",
    question: "Tính giá trị của tích phân: $$\\int_0^2 (x^2 + 1) dx$$",
    options: [
      "A. $\\frac{14}{3}$",
      "B. $\\frac{10}{3}$",
      "C. $6$", 
      "D. $4$"
    ],
    correctAnswer: "A",
    explanation: "Ta có: $\\int_0^2 (x^2 + 1) dx = \\left[\\frac{x^3}{3} + x\\right]_0^2 = \\frac{8}{3} + 2 - 0 = \\frac{8}{3} + \\frac{6}{3} = \\frac{14}{3}$"
  }
];

// Test data for True/False questions with LaTeX
const trueFalseQuestions = [
  {
    id: "3",
    type: "true_false", 
    question: "Phương trình $x^2 + 2x + 5 = 0$ có hai nghiệm thực phân biệt.",
    correctAnswer: "Sai",
    explanation: "Biệt thức $\\Delta = b^2 - 4ac = 4 - 20 = -16 < 0$ nên phương trình vô nghiệm thực."
  },
  {
    id: "4",
    type: "true_false",
    question: "Hàm số $f(x) = \\sin x$ có chu kỳ là $2\\pi$.",
    correctAnswer: "Đúng", 
    explanation: "Hàm số $\\sin x$ có chu kỳ cơ bản là $2\\pi$, tức là $\\sin(x + 2\\pi) = \\sin x$ với mọi $x \\in \\mathbb{R}$."
  }
];

// Test data for Essay questions with complex LaTeX
const essayQuestions = [
  {
    id: "5",
    type: "essay",
    question: "Giải và biện luận phương trình: $(m-1)x^2 + 2mx + m + 3 = 0$ theo tham số $m$.",
    explanation: `**Hướng dẫn giải chi tiết:**

1. **Trường hợp $m = 1$:** 
   Phương trình trở thành $2x + 4 = 0 \\Rightarrow x = -2$.

2. **Trường hợp $m \\neq 1$:** 
   Đây là phương trình bậc hai với hệ số:
   - $a = m - 1$
   - $b = 2m$ 
   - $c = m + 3$

3. **Tính biệt thức:**
   $$\\Delta = (2m)^2 - 4(m-1)(m+3)$$
   $$= 4m^2 - 4(m^2 + 3m - m - 3)$$
   $$= 4m^2 - 4(m^2 + 2m - 3)$$
   $$= 4m^2 - 4m^2 - 8m + 12$$
   $$= -8m + 12 = 4(3 - 2m)$$

4. **Biện luận:**
   - **$\\Delta > 0 \\Leftrightarrow 3 - 2m > 0 \\Leftrightarrow m < \\frac{3}{2}$:** Phương trình có hai nghiệm phân biệt
     $$x_{1,2} = \\frac{-2m \\pm 2\\sqrt{3-2m}}{2(m-1)} = \\frac{-m \\pm \\sqrt{3-2m}}{m-1}$$
   
   - **$\\Delta = 0 \\Leftrightarrow m = \\frac{3}{2}$:** Phương trình có nghiệm kép
     $$x = \\frac{-2m}{2(m-1)} = \\frac{-m}{m-1} = \\frac{-3/2}{3/2-1} = \\frac{-3/2}{1/2} = -3$$
   
   - **$\\Delta < 0 \\Leftrightarrow m > \\frac{3}{2}$:** Phương trình vô nghiệm thực`
  },
  {
    id: "6", 
    type: "essay",
    question: "Tính giới hạn sau: $$\\lim_{x \\to 0} \\frac{\\sin x - x \\cos x}{x^3}$$",
    explanation: `**Hướng dẫn giải:**

Sử dụng khai triển Taylor:
- $\\sin x = x - \\frac{x^3}{6} + \\frac{x^5}{120} + O(x^7)$
- $\\cos x = 1 - \\frac{x^2}{2} + \\frac{x^4}{24} + O(x^6)$

Do đó:
$$x \\cos x = x \\left(1 - \\frac{x^2}{2} + \\frac{x^4}{24} + O(x^6)\\right) = x - \\frac{x^3}{2} + \\frac{x^5}{24} + O(x^7)$$

Suy ra:
$$\\sin x - x \\cos x = \\left(x - \\frac{x^3}{6} + O(x^5)\\right) - \\left(x - \\frac{x^3}{2} + O(x^5)\\right)$$
$$= \\frac{x^3}{2} - \\frac{x^3}{6} + O(x^5) = \\frac{3x^3 - x^3}{6} + O(x^5) = \\frac{x^3}{3} + O(x^5)$$

Vậy:
$$\\lim_{x \\to 0} \\frac{\\sin x - x \\cos x}{x^3} = \\lim_{x \\to 0} \\frac{\\frac{x^3}{3} + O(x^5)}{x^3} = \\frac{1}{3}$$`
  }
];

// Combined test data for all question types
const testQuestionsData = {
  id: "test-pdf-comprehensive",
  subject: "toan",
  difficulty: "medium", 
  topic: "Phương trình và Giải tích",
  requirements: "Test comprehensive với LaTeX và tiếng Việt",
  questionTypes: ["multiple_choice", "true_false", "essay"],
  questionCount: 6,
  generatedQuestions: [
    ...multipleChoiceQuestions,
    ...trueFalseQuestions, 
    ...essayQuestions
  ],
  createdAt: new Date("2025-09-13T15:00:00.000Z")
};

// Test data for specific LaTeX formula testing
const latexTestQuestions = {
  id: "test-latex-formulas",
  subject: "toan",
  difficulty: "hard",
  topic: "Công thức Toán học phức tạp", 
  requirements: "Test LaTeX rendering in PDF",
  questionTypes: ["multiple_choice", "essay"],
  questionCount: 3,
  generatedQuestions: [
    {
      id: "L1",
      type: "multiple_choice",
      question: "Cho ma trận $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$. Tính $\\det(A)$:",
      options: [
        "A. $-2$",
        "B. $2$",
        "C. $10$", 
        "D. $0$"
      ],
      correctAnswer: "A",
      explanation: "Ta có: $\\det(A) = 1 \\cdot 4 - 2 \\cdot 3 = 4 - 6 = -2$"
    },
    {
      id: "L2", 
      type: "essay",
      question: "Chứng minh công thức tích phân từng phần: $$\\int u \\, dv = uv - \\int v \\, du$$",
      explanation: `**Chứng minh:**

Xuất phát từ quy tắc đạo hàm tích:
$$\\frac{d}{dx}[u(x) \\cdot v(x)] = u'(x)v(x) + u(x)v'(x)$$

Tích phân hai vế:
$$\\int \\frac{d}{dx}[u(x) \\cdot v(x)] dx = \\int u'(x)v(x) dx + \\int u(x)v'(x) dx$$

$$u(x) \\cdot v(x) = \\int u'(x)v(x) dx + \\int u(x)v'(x) dx$$

Sắp xếp lại:
$$\\int u(x)v'(x) dx = u(x) \\cdot v(x) - \\int u'(x)v(x) dx$$

Thay $du = u'(x)dx$ và $dv = v'(x)dx$:
$$\\int u \\, dv = uv - \\int v \\, du$$`
    },
    {
      id: "L3",
      type: "multiple_choice", 
      question: "Tính tích phân: $$\\int_0^{\\pi/2} \\sin^2 x \\, dx$$",
      options: [
        "A. $\\frac{\\pi}{4}$",
        "B. $\\frac{\\pi}{2}$", 
        "C. $\\frac{\\pi}{8}$",
        "D. $\\pi$"
      ],
      correctAnswer: "A",
      explanation: "Sử dụng công thức: $\\sin^2 x = \\frac{1 - \\cos 2x}{2}$\n\n$$\\int_0^{\\pi/2} \\sin^2 x \\, dx = \\int_0^{\\pi/2} \\frac{1 - \\cos 2x}{2} dx$$\n$$= \\frac{1}{2} \\left[ x - \\frac{\\sin 2x}{2} \\right]_0^{\\pi/2}$$\n$$= \\frac{1}{2} \\left[ \\frac{\\pi}{2} - 0 - (0 - 0) \\right] = \\frac{\\pi}{4}$$"
    }
  ],
  createdAt: new Date("2025-09-13T15:00:00.000Z")
};

// Test data for Vietnamese text handling
const vietnameseTestQuestions = {
  id: "test-vietnamese-text",
  subject: "van", 
  difficulty: "easy",
  topic: "Văn học Việt Nam hiện đại",
  requirements: "Test tiếng Việt với dấu và ký tự đặc biệt",
  questionTypes: ["essay", "multiple_choice"],
  questionCount: 2,
  generatedQuestions: [
    {
      id: "V1",
      type: "multiple_choice",
      question: "Tác giả của tác phẩm 'Số đỏ' là ai?",
      options: [
        "A. Nguyễn Tuân",
        "B. Vũ Trọng Phụng", 
        "C. Nam Cao",
        "D. Ngô Tất Tố"
      ],
      correctAnswer: "B",
      explanation: "Vũ Trọng Phụng (1912-1939) là tác giả của tiểu thuyết 'Số đỏ', một trong những tác phẩm văn học hiện thực quan trọng của Việt Nam."
    },
    {
      id: "V2",
      type: "essay", 
      question: "Phân tích hình ảnh người mẹ trong bài thơ 'Bếp lửa' của Bằng Việt. Nêu cảm nhận của em về tình mẫu tử được thể hiện trong tác phẩm.",
      explanation: `**Gợi ý trả lời:**

1. **Hình ảnh người mẹ:**
   - Người mẹ đảm đang, chăm chỉ
   - Luôn lo lắng cho con cái
   - Biểu tượng của sự hy sinh thầm lặng

2. **Tình mẫu tử qua hình ảnh bếp lửa:**
   - Bếp lửa như trái tim của người mẹ
   - Ngọn lửa không bao giờ tắt như tình yêu thương
   - Sự ấm áp, che chở cho gia đình

3. **Cảm nhận cá nhân:**
   - Tình mẫu tử là tình cảm thiêng liêng nhất
   - Người mẹ Việt Nam với đức hy sinh cao cả
   - Giá trị truyền thống cần được gìn giữ`
    }
  ],
  createdAt: new Date("2025-09-13T15:00:00.000Z")
};

// Export test data for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testQuestionsData,
    latexTestQuestions,
    vietnameseTestQuestions,
    multipleChoiceQuestions,
    trueFalseQuestions,
    essayQuestions
  };
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.pdfTestData = {
    testQuestionsData,
    latexTestQuestions, 
    vietnameseTestQuestions,
    multipleChoiceQuestions,
    trueFalseQuestions,
    essayQuestions
  };
}

// Only log in browser environment
if (typeof window !== 'undefined') {
  console.log("PDF Test Data loaded successfully!");
}