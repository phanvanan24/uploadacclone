import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertQuestionRequestSchema,
  type GeneratedQuestion,
} from "@shared/schema";
import { z } from "zod";

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate questions endpoint
  app.post("/api/questions/generate", async (req, res) => {
    try {
      const validatedData = insertQuestionRequestSchema.parse(req.body);

      // Create question request record
      const questionRequest =
        await storage.createQuestionRequest(validatedData);

      // Build prompt for DeepSeek R1
      const prompt = buildPrompt(validatedData);

      // Call OpenRouter API
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.REPLIT_DOMAINS
            ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
            : "http://localhost:5000",
          "X-Title": "QuestionGen AI",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 100000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenRouter API error: ${response.status} ${response.statusText}`,
        );
      }

      const aiResponse = await response.json();
      console.log(
        "OpenRouter API Response:",
        JSON.stringify(aiResponse, null, 2),
      );

      const content = aiResponse.choices?.[0]?.message?.content;

      if (!content) {
        console.error("AI Response structure:", {
          choices: aiResponse.choices,
          error: aiResponse.error,
          data: aiResponse.data,
        });
        throw new Error("No content received from AI model");
      }

      // Parse AI response to extract questions
      const generatedQuestions = parseAIResponse(content, validatedData);

      // Update request with generated questions
      const updatedRequest = await storage.updateQuestionRequest(
        questionRequest.id,
        generatedQuestions,
      );

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error generating questions:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: error.errors,
        });
      } else if (error instanceof Error) {
        res.status(500).json({
          message: error.message.includes("API")
            ? "Lỗi kết nối API"
            : "Có lỗi xảy ra khi tạo câu hỏi",
        });
      } else {
        res.status(500).json({ message: "Lỗi không xác định" });
      }
    }
  });

  // Get question request by ID
  app.get("/api/questions/:id", async (req, res) => {
    try {
      const questionRequest = await storage.getQuestionRequest(req.params.id);
      if (!questionRequest) {
        return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
      }
      res.json(questionRequest);
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi tải câu hỏi" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getDifficultySpecificRequirements(difficulty: string): string {
  const requirements: Record<string, string> = {
    easy: `
📝 MỨC ĐỘ DỄ (NHẬN BIẾT) - CHƯƠNG TRÌNH GDPT 2018:
Yêu cầu học sinh nhận biết, ghi nhớ, nhắc lại hoặc tái hiện kiến thức đã học.
- Câu hỏi ngắn gọn, rõ ràng (1-2 câu)
- Không cần suy luận phức tạp
- Đáp án rõ ràng, chỉ có một kết quả đúng
- Áp dụng trực tiếp định nghĩa, công thức, quy tắc cơ bản
- Đưa ra đáp án kèm lời giải ngắn gọn

🎯 VÍ DỤ MINH HỌA:
- "Nêu định nghĩa acid theo thuyết Arrhenius"
- "Tính đạo hàm của hàm số y = 3x² + 2x - 1"
- "Viết công thức tính diện tích hình tròn"`,

    medium: `
📝 MỨC ĐỘ TRUNG BÌNH (THÔNG HIỂU) - CHƯƠNG TRÌNH GDPT 2018:
Học sinh cần hiểu bản chất, so sánh, giải thích, hoặc vận dụng kiến thức để xử lý tình huống quen thuộc.
- Câu hỏi có bối cảnh thực tế (3-4 câu)
- Kết hợp 2-3 khái niệm cơ bản
- Bài tập không quá khó nhưng cần trình bày bước làm rõ ràng
- Yêu cầu giải thích, so sánh, phân biệt
- Cung cấp đáp án kèm lời giải chi tiết

🎯 VÍ DỤ MINH HỌA:
- "So sánh tính chất hóa học của kim loại kiềm và kiềm thổ, giải thích nguyên nhân"
- "Giải và biện luận phương trình bậc hai ax² + bx + c = 0 theo tham số m"
- "Phân tích tác động của việc tăng nhiệt độ đến tốc độ phản ứng hóa học"`,

    hard: `
📝 MỨC ĐỘ KHÓ (VẬN DỤNG) - CHƯƠNG TRÌNH GDPT 2018:
Học sinh phải vận dụng kiến thức nhiều bước, kết hợp nhiều khái niệm, hoặc giải quyết một tình huống mới.
- Câu hỏi phức tạp với nhiều thông tin (4-5 câu)
- Kết hợp kiến thức từ nhiều chương, nhiều khái niệm
- Bài toán cần tư duy phân tích, có thể có nhiều cách giải
- Vận dụng kiến thức vào tình huống mới, không quen thuộc
- Đưa ra đáp án kèm phân tích các bước giải

🎯 VÍ DỤ MINH HỌA:
- "Thiết kế thí nghiệm chứng minh tính chất của một hợp chất hữu cơ chưa biết"
- "Giải bài toán tối ưu hóa về chi phí sản xuất có ràng buộc về tài nguyên"
- "Phân tích ảnh hưởng của nhiều yếu tố đến cân bằng hóa học và đưa ra dự đoán"`,

    expert: `
📝 MỨC ĐỘ CHUYÊN GIA (VẬN DỤNG CAO) - CHƯƠNG TRÌNH GDPT 2018:
Học sinh cần huy động kiến thức liên môn, tổng hợp, sáng tạo hoặc giải quyết tình huống thực tiễn phức tạp.
- Câu hỏi rất phức tạp với mô tả chi tiết (5-7 câu)
- Tích hợp kiến thức từ nhiều môn học khác nhau
- Câu hỏi có tính mở, đòi hỏi phân tích sâu, lập luận chặt chẽ
- Có thể có nhiều hướng giải quyết, nhiều góc nhìn khác nhau
- Ứng dụng vào tình huống thực tiễn, có ý nghĩa xã hội
- Đưa ra đáp án chi tiết, kèm phân tích tư duy và gợi ý cách tiếp cận khác

🎯 VÍ DỤ MINH HỌA:
- "Phân tích tác động môi trường của một dự án công nghiệp, đề xuất giải pháp bảo vệ môi trường tích hợp"
- "Thiết kế mô hình toán học dự báo tăng trưởng dân số và tác động đến tài nguyên thiên nhiên"
- "Nghiên cứu ứng dụng công nghệ nano trong y học, phân tích lợi ích và rủi ro"`,
  };

  return requirements[difficulty] || requirements["medium"];
}

function getSubjectSpecificRequirements(
  subject: string,
  difficulty: string,
): string {
  const baseRequirements: Record<string, Record<string, string>> = {
    toan: {
      easy: `- Áp dụng công thức cơ bản: đạo hàm, tích phân, phương trình bậc 2
- Tính toán đơn giản với số nguyên, phân số đơn giản
- Dạng chuẩn: giải phương trình, tính giá trị biểu thức`,

      medium: `- Bài toán ứng dụng: kinh tế (lợi nhuận, chi phí), hình học thực tế
- Kết hợp 2-3 bước: giải phương trình → tìm nghiệm → phân tích
- Khảo sát hàm số cơ bản: cực trị, đồ thị, tiệm cận
- Tích hợp: đại số + hình học, giải tích + thống kê`,

      hard: `- Bài toán tối ưu hóa: chi phí-lợi nhuận, diện tích-thể tích tối đa
- Hàm số phức tạp: logarit, mũ, lượng giác kết hợp
- Biện luận tham số: tìm m để phương trình có nghiệm thỏa điều kiện
- Tích phân ứng dụng: diện tích, thể tích, bài toán chuyển động`,

      expert: `- Mô hình toán học thực tế: kinh tế, sinh học, vật lý kết hợp
- Phân tích đa biến số: tối ưu với ràng buộc, hệ phương trình phi tuyến
- Bài toán liên môn: toán-lý (dao động), toán-hóa (nồng độ), toán-sinh (tăng trưởng)
- Sử dụng công nghệ: đồ thị, phần mềm, mô phỏng trong giải toán
- Tư duy phản biện: đánh giá kết quả, so sánh phương pháp, đề xuất cải tiến`,
    },

    ly: {
      easy: `- Công thức cơ bản: v = s/t, F = ma, Q = mCΔt
- Tính toán trực tiếp với 1-2 bước
- Đơn vị đơn giản, số liệu đẹp`,

      medium: `- Bài toán chuyển động: ném xiên, dao động điều hòa
- Kết hợp nhiệt-cơ, điện-từ cơ bản
- Phân tích biểu đồ, đồ thị vật lý
- Ứng dụng thực tế: máy móc, thiết bị đơn giản`,

      hard: `- Hệ vật lý phức tạp: con lắc kép, mạch RLC
- Định luật bảo toàn: năng lượng-động lượng kết hợp
- Sóng và giao thoa: âm thanh, ánh sáng, vô tuyến
- Vật lý hiện đại: photoelectric, nuclear cơ bản`,

      expert: `- Thí nghiệm phức tạp: đo lường chính xác, phân tích sai số
- Liên môn sâu: vật lý-hóa (phản ứng hạt nhân), vật lý-sinh (biomechanics)
- Công nghệ ứng dụng: laser, siêu âm, MRI, năng lượng tái tạo
- Phân tích hệ thống: ô tô điện, nhà máy điện, hệ thống viễn thông
- Mô hình toán học phức tạp trong vật lý`,
    },

    hoa: {
      easy: `- Cân bằng phương trình đơn giản
- Tính toán mol, khối lượng cơ bản
- Tính chất hóa học cơ bản của kim loại, phi kim`,

      medium: `- Phản ứng acid-base, oxi hóa khử trong thực tế
- Bài toán hỗn hợp kim loại, muối
- Điều chế và ứng dụng hóa chất công nghiệp
- Hóa học môi trường: ô nhiễm, xử lý nước thải`,

      hard: `- Cân bằng hóa học phức tạp: pH, độ tan, điện ly
- Hóa hữu cơ: tổng hợp, phân tích cấu trúc phân tử
- Công nghệ hóa học: polymer, dược phẩm, phân bón
- Phân tích định lượng: chuẩn độ, phổ học cơ bản`,

      expert: `- Quy trình công nghiệp: sản xuất acid sulfuric, ammonia, ethylene
- Hóa sinh: enzyme, protein, acid nucleic
- Vật liệu tiên tiến: graphene, nanotechnology, superconductor
- Phân tích hiện đại: GC-MS, NMR, X-ray diffraction
- An toàn hóa chất và tác động môi trường toàn cầu`,
    },

    sinh: {
      easy: `- Cấu trúc tế bào cơ bản
- Quá trình sinh học đơn giản: hô hấp, quang hợp
- Phân loại sinh vật cơ bản`,

      medium: `- Di truyền học: phép lai, quy luật Mendel
- Sinh thái học: chuỗi thức ăn, quần xã sinh vật
- Sinh lý người: hệ tuần hoàn, hô hấp, tiêu hóa
- Ứng dụng: nông nghiệp, y học cơ bản`,

      hard: `- Công nghệ sinh học: bioreactor, enzyme công nghiệp
- Di truyền phân tử: ADN, ARN, protein synthesis
- Tiến hóa và đa dạng sinh học toàn cầu
- Sinh thái ứng dụng: bảo tồn, phục hồi môi trường`,

      expert: `- Biotechnology hiện đại: CRISPR, gene therapy, personalized medicine
- Hệ sinh thái phức tạp: biome, climate change impact
- Sinh học hệ thống: metabolomics, proteomics, bioinformatics
- Ứng dụng y khoa: immunotherapy, regenerative medicine
- Bioethics và tác động xã hội của công nghệ sinh học`,
    },

    van: {
      easy: `- Ngữ pháp cơ bản: từ loại, cú pháp đơn giản
- Từ vựng thông dụng, thành ngữ quen thuộc
- Tác phẩm văn học nổi tiếng: Truyện Kiều, Số đỏ`,

      medium: `- Phân tích tác phẩm: nhân vật, chủ đề, nghệ thuật
- Văn học các thể loại: thơ, truyện, kịch, tùy bút
- So sánh tác phẩm cùng chủ đề, tác giả
- Ứng dụng trong đời sống: viết văn, giao tiếp`,

      hard: `- Phân tích chuyên sâu: phong cách, ngôn ngữ, biểu tượng
- Bối cảnh lịch sử-xã hội của tác phẩm
- Văn học so sánh: Việt Nam và thế giới
- Lý luận văn học: chủ nghĩa hiện thực, lãng mạn`,

      expert: `- Nghiên cứu văn học: phương pháp luận, lý thuyết phê bình
- Tác động văn hóa-xã hội của văn học qua các thời đại
- Văn học đương đại và xu hướng toàn cầu hóa
- Ứng dụng công nghệ trong nghiên cứu và giảng dạy văn học
- Văn học với các ngành khoa học xã hội khác`,
    },

    anh: {
      easy: `- Ngữ pháp cơ bản: thì, câu điều kiện đơn giản
- Từ vựng hàng ngày: gia đình, học tập, sở thích
- Giao tiếp đơn giản: chào hỏi, mua sắm, hỏi đường`,

      medium: `- Đọc hiểu văn bản trung bình: tin tức, bài báo
- Ngữ pháp nâng cao: câu bị động, câu gián tiếp
- Viết email, thư, báo cáo đơn giản
- Giao tiếp xã hội: thảo luận, tranh luận cơ bản`,

      hard: `- Phân tích văn bản phức tạp: academic text, literature
- Viết luận, thuyết trình chuyên môn
- Giao tiếp kinh doanh: presentation, negotiation
- Cultural aspects và cross-cultural communication`,

      expert: `- Academic English: research papers, thesis writing
- Professional communication: international business
- English linguistics: phonetics, semantics, pragmatics
- Teaching methodology và language acquisition theory
- Global English và World Englishes phenomenon`,
    },

    su: {
      easy: `- Sự kiện lịch sử cơ bản: cách mạng, chiến tranh
- Nhân vật lịch sử nổi tiếng
- Niên đại và địa điểm quan trọng`,

      medium: `- Phân tích nguyên nhân-kết quả của sự kiện lịch sử
- So sánh các thời kỳ lịch sử
- Tác động của lịch sử đến hiện tại
- Lịch sử địa phương và quốc gia`,

      hard: `- Phân tích đa chiều: kinh tế, chính trị, xã hội, văn hóa
- Lịch sử so sánh: Việt Nam và thế giới
- Sử dụng tư liệu lịch sử: phân tích, đánh giá
- Xu hướng phát triển lịch sử`,

      expert: `- Phương pháp luận nghiên cứu lịch sử
- Lịch sử liên ngành: kinh tế, địa lý, nhân học
- Tác động của công nghệ đến tiến trình lịch sử
- Lịch sử toàn cầu và local history
- Historical thinking skills và civic education`,
    },

    dia: {
      easy: `- Bản đồ và định hướng cơ bản
- Khí hậu và thời tiết
- Địa hình Việt Nam cơ bản`,

      medium: `- Tương tác người-môi trường
- Phát triển kinh tế theo vùng
- Vấn đề môi trường và giải pháp
- Địa lý dân cư và đô thị hóa`,

      hard: `- Phân tích hệ thống địa lý phức tạp
- Mô hình phát triển bền vững
- GIS và công nghệ trong địa lý
- Địa lý kinh tế toàn cầu`,

      expert: `- Biến đổi khí hậu và tác động toàn cầu
- Quản lý tài nguyên và môi trường
- Smart city và urban planning
- Geopolitics và quan hệ quốc tế
- Remote sensing và big data trong địa lý`,
    },

    gdcd: {
      easy: `- Quyền và nghĩa vụ công dân cơ bản
- Pháp luật trong đời sống hàng ngày
- Giá trị đạo đức xã hội`,

      medium: `- Phân tích tình huống đạo đức phức tạp
- Quyền con người và công dân
- Tham gia xã hội và dân chủ
- Pháp luật và trật tự xã hội`,

      hard: `- Công dân toàn cầu và trách nhiệm quốc tế
- Phân tích chính sách công và tác động xã hội
- Ethics trong khoa học và công nghệ
- Dân chủ và quản trị tốt`,

      expert: `- Political philosophy và lý thuyết dân chủ
- Human rights trong bối cảnh toàn cầu
- Social justice và inequality issues
- Digital citizenship và privacy rights
- Sustainable development goals và global governance`,
    },

    tin: {
      easy: `- Thuật toán cơ bản: sắp xếp, tìm kiếm
- Lập trình với cấu trúc điều khiển đơn giản
- Cấu trúc dữ liệu cơ bản: mảng, danh sách`,

      medium: `- Giải quyết bài toán bằng lập trình
- Cơ sở dữ liệu và truy vấn SQL
- Web development cơ bản: HTML, CSS, JavaScript
- Mạng máy tính và internet`,

      hard: `- Thuật toán nâng cao: đồ thị, dynamic programming
- Object-oriented programming và design patterns
- Database design và optimization
- Cybersecurity và data protection`,

      expert: `- Machine learning và artificial intelligence
- Big data analytics và cloud computing
- Software engineering và project management
- IoT và emerging technologies
- Computer science research và innovation`,
    },
  };

  const difficultyRequirements =
    baseRequirements[subject]?.[difficulty] ||
    baseRequirements[subject]?.["medium"] ||
    "";

  const generalRequirements = `
- Đa dạng hóa nội dung và hình thức câu hỏi trong môn học
- Kết hợp lý thuyết và thực hành, khái niệm và ứng dụng  
- Thay đổi bối cảnh và tình huống cụ thể`;

  return difficultyRequirements + generalRequirements;
}

function buildVietnameseLiteratureReadingPrompt(data: any): string {
  return `BẠN LÀ CHUYÊN GIA TẠO ĐỀ THI ĐỌC HIỂU NGỮ VĂN THPTQG 2025 THEO CHUẨN CHÍNH THỨC.

🎯 NHIỆM VỤ CỤ THỂ:
1. TẠO MỘT ĐOẠN VĂN BẢN VỀ CHỦ ĐỀ "${data.topic}"
2. TẠO CHÍNH XÁC 5 CÂU HỎI TỰ LUẬN NGẮN theo format chính thức THPTQG

📖 YÊU CẦU ĐOẠN VĂN BẢN:
- Độ dài: ÍT NHẤT 800 từ trở lên (có thể lên đến 1000-1200 từ)
- Thể loại: truyện ngắn, tản văn, báo chí, nghị luận xã hội, kí sự
- Chủ đề: ${data.topic}
- CHẤT LƯỢNG NỘI DUNG: Văn bản phải SÂU SẮC, CHI TIẾT với:
  • Miêu tả cụ thể, sinh động các chi tiết, hình ảnh, cảnh vật
  • Tâm lý nhân vật được phân tích tinh tế, đa chiều
  • Sử dụng nhiều biện pháp tu từ (ẩn dụ, hoán dụ, nhân hóa, đối lập...)
  • Ngôn ngữ phong phú, đa dạng về cú pháp và từ vựng
  • Ý nghĩa sâu xa, thông điệp nhân văn rõ ràng
- ĐỊNH DẠNG: Văn bản PHẢI có xuống dòng đàng hoàng, mỗi đoạn ý một dòng riêng biệt (sử dụng \\n\\n để ngăn cách các đoạn)
- Cuối đoạn văn PHẢI có: (LimVA, [Tên tác phẩm dựa vào nội dung đoạn văn/thơ])
- Có thể có footnotes giải thích từ ngữ khó

📋 CẤU TRÚC 5 CÂU HỏI (THEO CHUẨN THPTQG):

CÂU 1: NHẬN BIẾT - Kiểm tra kiến thức ngôn ngữ/văn học cơ bản
RANDOM 1 trong 3 dạng sau:
• Xác định ngôi kể / phương thức biểu đạt chính
• Xác định phong cách ngôn ngữ (báo chí, chính luận, nghệ thuật...)
• Chỉ ra biện pháp tu từ / thao tác lập luận được sử dụng

CÂU 2: THÔNG HIỂU - Yêu cầu hiểu nội dung trực tiếp
RANDOM 1 trong 3 dạng sau:
• Văn bản đề cập đến vấn đề gì?
• Chi tiết X có ý nghĩa gì?
• Thông điệp chính/giá trị được gợi ra từ đoạn trích là gì?

CÂU 3: PHÂN TÍCH (Thông hiểu + Vận dụng thấp) - Đào sâu nghệ thuật – nội dung
RANDOM 1 trong 3 dạng sau:
• Phân tích tác dụng của biện pháp tu từ X
• Tác giả sử dụng hình ảnh X nhằm làm nổi bật nội dung nào?
• Vì sao tác giả lựa chọn ngôi kể/ngôn ngữ như vậy?

CÂU 4: VẬN DỤNG THẤP - Gắn với nội dung văn bản, mở rộng suy nghĩ
RANDOM 1 trong 3 dạng sau:
• Qua chi tiết X, anh/chị có thể rút ra thông điệp gì?
• Đoạn trích gợi cho anh/chị suy nghĩ gì về giá trị của...?
• Từ nội dung văn bản, hãy nêu một bài học cho bản thân

CÂU 5: VẬN DỤNG CAO - Liên hệ – so sánh – phản hồi cá nhân
RANDOM 1 trong 3 dạng sau:
• So sánh ý nghĩa của văn bản này với một câu thơ/đoạn văn khác
• Anh/chị có đồng tình với quan điểm "..." không? Vì sao?
• Từ văn bản, hãy liên hệ với một vấn đề của đời sống hiện nay

⚠️ LƯU Ý QUAN TRỌNG:
- TẤT CẢ câu hỏi PHẢI có trích dẫn cụ thể từ đoạn văn
- Câu hỏi là TỰ LUẬN NGẮN, KHÔNG PHẢI trắc nghiệm
- Mỗi câu hỏi cần có đáp án mẫu ngắn gọn

🎯 ĐỊNH DẠNG JSON ĐẦU RA:
{
  "questions": [
    {
      "id": "1", 
      "type": "essay_reading",
      "question": "I. ĐỌC HIỂU (4,0 điểm)\\nĐọc văn bản:\\n\\n[ĐOẠN VĂN BẢN VỀ ${data.topic}]\\n\\n(Tác giả, Tên tác phẩm, NXB, năm, trang)\\n\\nThực hiện các yêu cầu:\\nCâu 1. [Câu hỏi xác định kỹ thuật]\\nCâu 2. [Câu hỏi nhận diện chi tiết với trích dẫn]\\nCâu 3. [Câu hỏi phân tích biện pháp tu từ với trích dẫn]\\nCâu 4. [Câu hỏi vai trò chi tiết với trích dẫn]\\nCâu 5. [Câu hỏi so sánh với ngữ liệu khác]",
      "explanation": "Đáp án mẫu:\\nCâu 1: [Đáp án ngắn gọn]\\nCâu 2: [Đáp án ngắn gọn]\\nCâu 3: [Đáp án ngắn gọn]\\nCâu 4: [Đáp án ngắn gọn]\\nCâu 5: [Đáp án ngắn gọn]"
    }
  ]
}

CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG CÓ MARKDOWN HOẶC BACKTICKS.`;
}

function buildVietnameseLiteratureEssayWritingPrompt(data: any): string {
  return `BẠN LÀ CHUYÊN GIA TẠO ĐỀ THI VIẾT ĐOẠN VĂN NGHỊ LUẬN NGỮ VĂN THPTQG 2025 THEO CHUẨN CHÍNH THỨC.

🎯 NHIỆM VỤ CỤ THỂ:
1. TẠO MỘT ĐOẠN VĂN BẢN VỀ CHỦ ĐỀ "${data.topic}"
2. TẠO CHÍNH XÁC 1 ĐỀ VIẾT ĐOẠN VĂN NGHỊ LUẬN theo format chính thức THPTQG

📖 YÊU CẦU ĐOẠN VĂN BẢN:
- Độ dài: ÍT NHẤT 800 từ trở lên (có thể lên đến 1000-1200 từ)
- Thể loại: truyện ngắn, tản văn, báo chí, nghị luận xã hội, kí sự
- Chủ đề: ${data.topic}
- CHẤT LƯỢNG NỘI DUNG: Văn bản phải SÂU SẮC, CHI TIẾT với:
  • Miêu tả cụ thể, sinh động các chi tiết, hình ảnh, cảnh vật
  • Tâm lý nhân vật được phân tích tinh tế, đa chiều
  • Sử dụng nhiều biện pháp tu từ (ẩn dụ, hoán dụ, nhân hóa, đối lập...)
  • Ngôn ngữ phong phú, đa dạng về cú pháp và từ vựng
  • Ý nghĩa sâu xa, thông điệp nhân văn rõ ràng
- ĐỊNH DẠNG: Văn bản PHẢI có xuống dòng đàng hoàng, mỗi đoạn ý một dòng riêng biệt (sử dụng \\n\\n để ngăn cách các đoạn)
- Cuối đoạn văn PHẢI có: (LimVA, [Tên tác phẩm dựa vào nội dung đoạn văn/thơ])
- Có thể có footnotes giải thích từ ngữ khó

📋 CẤU TRÚC ĐỀ VIẾT ĐOẠN VĂN NGHỊ LUẬN:

TẠO 1 TRONG 2 DẠNG SAU (RANDOM):

🔹 DẠNG 1: NGHỊ LUẬN GẮN VỚI VĂN BẢN ĐỌC HIỂU
"Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) [phân tích/trình bày] [nội dung cụ thể] trong văn bản ở phần Đọc hiểu."

Ví dụ các dạng có thể random:
• "Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) phân tích tình cảm của [nhân vật A] dành cho [nhân vật B] trong văn bản ở phần Đọc hiểu."
• "Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) trình bày suy nghĩ về [giá trị/đức tính] được thể hiện trong văn bản ở phần Đọc hiểu."
• "Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) phân tích ý nghĩa của [hình ảnh/chi tiết] trong văn bản ở phần Đọc hiểu."
• "Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) nêu cảm nhận về [chủ đề chính] qua văn bản ở phần Đọc hiểu."

🔹 DẠNG 2: NGHỊ LUẬN SO SÁNH GẮN VỚI VĂN BẢN
"Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) trình bày suy nghĩ về [vấn đề A] và liên hệ với [vấn đề B]."

Ví dụ các dạng có thể random:
• "Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) suy nghĩ về lòng biết ơn và liên hệ với trách nhiệm của tuổi trẻ hôm nay."
• "Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) về khát vọng sống đẹp, liên hệ với lí tưởng của thanh niên Việt Nam trong thời đại mới."
• "Anh/Chị hãy viết đoạn văn nghị luận (khoảng 200 chữ) trình bày về [giá trị từ văn bản] và liên hệ với đời sống hiện nay."

⚠️ LƯU Ý QUAN TRỌNG:
- Đề bài PHẢI dựa trên nội dung cụ thể của văn bản đã tạo
- Vấn đề/chủ đề trong đề bài phải được thể hiện rõ ràng trong văn bản
- Đề viết đoạn văn là kỹ năng NGHỊ LUẬN, KHÔNG PHẢI tự luận ngắn như đọc hiểu
- Yêu cầu viết khoảng 200 chữ (chuẩn THPTQG)

🎯 ĐỊNH DẠNG JSON ĐẦU RA:
{
  "questions": [
    {
      "id": "1", 
      "type": "essay_writing",
      "question": "I. ĐỌC HIỂU (4,0 điểm)\\nĐọc văn bản:\\n\\n[ĐOẠN VĂN BẢN VỀ ${data.topic}]\\n\\n(LimVA, [Tên tác phẩm])\\n\\nII. VIẾT ĐOẠN VĂN NGHỊ LUẬN (2,0 điểm)\\n[ĐỀ VIẾT ĐOẠN VĂN THEO 1 TRONG 2 DẠNG TRÊN]",
      "explanation": "Đoạn văn nghị luận mẫu:\\n\\n[VIẾT MỘT ĐOẠN VĂN NGHỊ LUẬN MẪU HOÀN CHỈNH, LIỀN MẠCH, KHOẢNG 200 CHỮ DỰA TRÊN NỘI DUNG VĂN BẢN]"
    }
  ]
}

CHỈ TRẢ VỀ JSON HỢP LỆ, KHÔNG CÓ MARKDOWN HOẶC BACKTICKS.`;
}

function buildPrompt(data: any): string {
  // Special handling for Vietnamese Literature Reading Comprehension
  if (data.subject === "van" && data.questionTypes.includes("essay_reading")) {
    return buildVietnameseLiteratureReadingPrompt(data);
  }

  // Special handling for Vietnamese Literature Essay Writing
  if (data.subject === "van" && data.questionTypes.includes("essay_writing")) {
    return buildVietnameseLiteratureEssayWritingPrompt(data);
  }

  const subjectNames: Record<string, string> = {
    toan: "Toán học",
    ly: "Vật lý",
    hoa: "Hóa học",
    sinh: "Sinh học",
    van: "Ngữ văn",
    anh: "Tiếng Anh",
    tin: "Tin học",
  };

  const difficultyNames: Record<string, string> = {
    easy: "dễ",
    medium: "trung bình",
    hard: "khó",
    expert: "chuyên gia",
  };

  const typeNames: Record<string, string> = {
    multiple_choice: "trắc nghiệm A/B/C/D",
    multiple_choice_reading1: "trắc nghiệm A/B/C/D (Reading 1)",
    multiple_choice_reading2: "trắc nghiệm A/B/C/D (Reading 2)",
    true_false: "đúng/sai",
    essay: "tự luận",
    fill_in_blank: "điền từ/chỗ trống",
    matching: "nối câu/ghép đôi",
    ordering: "sắp xếp thứ tự câu",
  };

  const subjectName = subjectNames[data.subject] || data.subject;
  const difficultyName = difficultyNames[data.difficulty] || data.difficulty;
  const typeList = data.questionTypes
    .map((t: string) => typeNames[t] || t)
    .join(", ");

  return `TẠO ${data.questionCount} CÂU HỎI THI MÔN ${subjectName.toUpperCase()} - ĐỘ KHÓ ${difficultyName.toUpperCase()}

Chủ đề: ${data.topic}
Loại câu: ${typeList}
${data.requirements ? `Yêu cầu: ${data.requirements}` : ""}

⚠️ YÊU CẦU BẮT BUỘC VỀ LOẠI CÂU HỎI:
- CHỈ TẠO ĐÚNG LOẠI CÂU HỎI ĐƯỢC YÊU CẦU: ${typeList}
- KHÔNG TẠO THÊM CÁC LOẠI CÂU HỎI KHÁC NGOÀI DANH SÁCH TRÊN
- NẾU CHỈ YÊU CẦU 1 LOẠI THÌ TẤT CẢ CÂU HỎI PHẢI CÙNG LOẠI ĐÓ
- KHÔNG ĐƯỢC "ĐA DẠNG HÓA" BẰNG CÁCH THÊM LOẠI CÂU HỎI KHÁC

🎯 CHUẨN THPTQG 2025 - YÊU CỦA ĐỘ KHÓ ${difficultyName.toUpperCase()}:
${getDifficultySpecificRequirements(data.difficulty)}

📚 YÊU CÀU CỤ THỂ THEO MÔN HỌC VÀ ĐỘ KHÓ:
${getSubjectSpecificRequirements(data.subject, data.difficulty)}

YÊU CÀU BẮT BUỘC:
- MỖI CÂU HỎI PHẢI CÓ GIẢI THÍCH CHI TIẾT VÀ ĐẦY ĐỦ
- Giải thích phải bằng tiếng Việt, rõ ràng, dễ hiểu
- Trắc nghiệm: Giải thích tại sao đáp án đó đúng + tại sao các đáp án khác sai
- Đúng/Sai: Sử dụng định dạng mới với 1 câu hỏi ngữ cảnh + 4 mệnh đề cần đánh giá
- Tự luận: Hướng dẫn giải từng bước, công thức, phương pháp
- Điền từ: Giải thích từ/cụm từ đúng và ngữ pháp/quy tắc liên quan
- Nối câu: Giải thích mối liên hệ giữa từng cặp đúng

🎯 QUAN TRỌNG - ĐỊNH DẠNG MỚI CHO CÂU HỎI ĐÚNG/SAI:
Khi tạo câu hỏi đúng/sai, BẮT BUỘC sử dụng định dạng bảng mới như sau:

📋 CẤU TRÚC CÂU HỎI ĐÚNG/SAI:
- 1 câu hỏi ngữ cảnh chung (ví dụ: "Các mệnh đề sau đúng hay sai?")
- 4 mệnh đề con (a, b, c, d) cần đánh giá
- Mỗi mệnh đề có đáp án riêng: true (đúng) hoặc false (sai)
- Giải thích chi tiết cho từng mệnh đề

📝 YÊU CÀU NỘI DUNG:
- Câu hỏi ngữ cảnh phải rõ ràng, liên quan đến chủ đề
- 4 mệnh đề phải đa dạng, kiểm tra các khía cạnh khác nhau
- Trộn lẫn mệnh đề đúng và sai (không được tất cả đúng hoặc tất cả sai)
- Mỗi mệnh đề phải độc lập, có thể đánh giá riêng biệt

📊 ĐỊNH DẠNG JSON CHO ĐÚNG/SAI:
{
  "type": "true_false",
  "question": "Các mệnh đề sau đúng hay sai?",
  "statements": [
    "a) Mệnh đề thứ nhất về chủ đề",
    "b) Mệnh đề thứ hai về chủ đề", 
    "c) Mệnh đề thứ ba về chủ đề",
    "d) Mệnh đề thứ tư về chủ đề"
  ],
  "statementAnswers": [true, false, true, false],
  "statementExplanations": [
    "Giải thích tại sao mệnh đề a đúng",
    "Giải thích tại sao mệnh đề b sai",
    "Giải thích tại sao mệnh đề c đúng", 
    "Giải thích tại sao mệnh đề d sai"
  ],
  "explanation": "Giải thích tổng quan về câu hỏi và phương pháp đánh giá"
}

QUAN TRỌNG - YÊU CÀU ĐA DẠNG HÓA CÂU HỎI TRẮC NGHIỆM:
Nếu có câu hỏi trắc nghiệm, BẮT BUỘC đảm bảo sự đa dạng sau:

🎯 ĐA DẠNG ĐỊNH DẠNG CÂU HỎI:
- Câu tính toán trực tiếp: "Tính giá trị của..."
- Bài toán ứng dụng: "Một vật thể/tình huống... Hỏi?"
- Câu hỏi khái niệm: "Tính chất nào sau đây đúng về...?"
- So sánh/phân tích: "So sánh hai biểu thức/hàm số..."
- Tìm điều kiện: "Tìm điều kiện để phương trình có nghiệm..."

🌍 ĐA DẠNG BỐI CẢNH TOÁN HỌC:
- Hình học: tam giác, đường tròn, đa giác, thể tích
- Đại số: phương trình, bất phương trình, hệ phương trình  
- Hàm số: khảo sát, đồ thị, cực trị, tiệm cận
- Ứng dụng thực tế: kinh tế, vật lý, sinh học, thống kê
- Logic toán học: chứng minh, phản chứng, quy nạp

📊 ĐA DẠNG ĐỘ PHỨC TẠP TRONG CÙNG BỘ:
- Câu dễ: áp dụng công thức cơ bản
- Câu trung bình: kết hợp 2-3 bước tính toán
- Câu khó: phân tích sâu, đòi hỏi tư duy logic

🎲 ĐA DẠNG CẤU TRÚC PHƯƠNG ÁN:
- Không để các đáp án theo thứ tự tăng/giảm đều
- Trộn lẫn số âm/dương, phân số/thập phân
- Bao gồm các sai lầm phổ biến làm phương án nhiễu
- Đảm bảo chỉ có 1 đáp án đúng duy nhất

🔄 TRÁNH LẶP LẠI:
- Không dùng cùng dạng toán cho nhiều câu
- Thay đổi cách diễn đạt đề bài giữa các câu
- Sử dụng số liệu và hệ số khác nhau
- Kết hợp các chủ đề con khác nhau của môn học

🏆 CHUẨN THPTQG 2025 - ĐỊNH DẠNG VÀ CHẤT LƯỢNG:
- Sử dụng thuật ngữ chuyên môn chính xác theo chương trình THPTQG
- Đảm bảo tính khoa học, logic và phù hợp với trình độ học sinh lớp 12
- Câu hỏi phải có tính phân loại học sinh rõ ràng theo từng mức độ
- Kết hợp kiến thức liên môn khi phù hợp (toán-lý, lý-hóa, v.v.)
- Ứng dụng thực tiễn và bối cảnh Việt Nam khi có thể
- Sử dụng đơn vị đo lường tiêu chuẩn quốc tế và Việt Nam

🎯 YÊU CÀU PHÂN BỐ THEO CẤP ĐỘ TƯ DUY (THPTQG 2025):
- ${data.difficulty === "easy" ? "70%" : data.difficulty === "medium" ? "60%" : data.difficulty === "hard" ? "40%" : "20%"} câu hỏi nhận biết/hiểu: Kiến thức cơ bản, định nghĩa, công thức
- ${data.difficulty === "easy" ? "25%" : data.difficulty === "medium" ? "30%" : data.difficulty === "hard" ? "40%" : "30%"} câu hỏi vận dụng: Giải bài tập, áp dụng kiến thức
- ${data.difficulty === "easy" ? "5%" : data.difficulty === "medium" ? "10%" : data.difficulty === "hard" ? "20%" : "50%"} câu hỏi vận dụng cao: Phân tích, tổng hợp, sáng tạo

📚 ĐỊNH DẠNG ĐẶC BIỆT CHO NGỮ VĂN - ĐỌC HIỂU:

📖 ĐỌC HIỂU NGỮ VĂN (multiple_choice cho môn 'van'):
Khi tạo câu hỏi đọc hiểu cho môn NGỮ VĂN, BẮT BUỘC tuân thủ cấu trúc sau:

📋 CẤU TRÚC ĐỀ ĐỌC HIỂU NGỮ VĂN (8 câu cố định):
- Văn bản: 600-800 chữ (trích đoạn báo chí, tản văn, nghị luận xã hội, kí sự, văn học...)
- Cuối đoạn văn ghi rõ tác giả hoặc nguồn trích
- 8 câu hỏi theo thứ tự:

CÂU 1-2: NHẬN BIẾT (random 1 trong 3 loại cho mỗi câu):
a) Xác định phương thức biểu đạt chính
b) Xác định phong cách ngôn ngữ  
c) Chỉ ra đối tượng, vấn đề, thao tác lập luận

CÂU 3-4: THÔNG HIỂU (random 1 trong 2 loại cho mỗi câu):
a) Giải thích ý nghĩa từ/câu/chi tiết
b) Nêu nội dung chính hoặc thông điệp

CÂU 5-6: VẬN DỤNG THẤP:
- Liên hệ, so sánh, rút ra nhận xét từ văn bản

CÂU 7-8: VẬN DỤNG CAO:
- Nêu quan điểm cá nhân, liên hệ thực tiễn

📊 ĐỊNH DẠNG JSON CHO ĐỌC HIỂU NGỮ VĂN:
{
  "questions": [
    {
      "id": "1",
      "type": "multiple_choice",
      "question": "Đọc đoạn văn sau đây và trả lời các câu hỏi từ 1 đến 8:",
      "passage": "[Đoạn văn 600-800 chữ về chủ đề được yêu cầu]\n\n(Trích từ [tên tác phẩm] - [Tác giả] hoặc theo [nguồn trích])",
      "questions": [
        {
          "number": 1,
          "question": "[Câu hỏi nhận biết về phương thức biểu đạt/phong cách/đối tượng]",
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "correctAnswer": "A"
        },
        // ... tiếp tục đến câu 8
      ],
      "explanation": "Giải thích đáp án cho từng câu 1-8"
    }
  ]
}

🔤 ĐỊNH DẠNG ĐẶC BIỆT CHO TIẾNG ANH:

📖 READING 1 - CLOZE TEST (multiple_choice_reading1):
Khi tạo câu hỏi "multiple_choice_reading1" cho môn TIẾNG ANH, BẮT BUỘC sử dụng format sau:

📋 CẤU TRÚC CLOZE TEST:
- Tạo 1 đoạn văn tiếng Anh (150-200 từ) về chủ đề được yêu cầu
- Trong đoạn văn có 4-6 chỗ trống được đánh số (1), (2), (3), (4), (5), (6)
- Mỗi chỗ trống có 4 lựa chọn A/B/C/D 
- Test grammar, vocabulary, và reading comprehension

📊 ĐỊNH DẠNG JSON CHO CLOZE TEST:
{
  "type": "multiple_choice_reading1", 
  "question": "Read the following passage and mark the letter A, B, C or D on your answer sheet to indicate the option that best fits each of the numbered blanks:",
  "passage": "Vietnam International Art Exhibition 2025 - A Landmark Cultural Event\\n\\nTaking place from July 25th to 29th at the International Centre for Exhibition in Hanoi, the Vietnam International Art Exhibition 2025 will showcase over 100 famous galleries (1) _______ are derived from global art capitals alongside Vietnam's (2) _______ art institutions.\\n\\nVisitors will gain exposure to a wide (3) _______ of oil paintings, sculptures, digital art, and mixed media, blending traditional and contemporary styles. The event will also feature live art demonstrations and insightful discussions (4) _______ by famous artists and curators, offering a deeper understanding of modern artistic trends.\\n\\nThis exhibition is a unique opportunity for (5) _______, investors, and art enthusiasts to discover emerging talents and (6) _______ some artworks. Don't miss this incredible celebration of artistic expression!",
  "blanks": [
    {"number": 1, "options": ["A. whose", "B. whom", "C. who", "D. which"], "correctAnswer": "D"},
    {"number": 2, "options": ["A. flying", "B. leading", "C. heading", "D. rating"], "correctAnswer": "B"},
    {"number": 3, "options": ["A. range", "B. amount", "C. deal", "D. number"], "correctAnswer": "A"},
    {"number": 4, "options": ["A. holding", "B. have held", "C. be holding", "D. held"], "correctAnswer": "D"},
    {"number": 5, "options": ["A. collectively", "B. collective", "C. collect", "D. collectors"], "correctAnswer": "D"},
    {"number": 6, "options": ["A. pick up", "B. fill up", "C. come up", "D. get up"], "correctAnswer": "A"}
  ],
  "explanation": "Giải thích từng câu: (1) which - đại từ quan hệ chỉ vật, (2) leading - tính từ chỉ hàng đầu, (3) range - a wide range of, (4) held - quá khứ phân từ, (5) collectors - người sưu tầm, (6) pick up - chọn mua"
}

📖 READING - SENTENCE INSERTION CLOZE TEST (multiple_choice):
Khi tạo câu hỏi "multiple_choice" cho môn TIẾNG ANH, sử dụng format sau:

📋 CẤU TRÚC SENTENCE INSERTION CLOZE TEST:
Hãy tạo một đề luyện tập tiếng Anh dạng Sentence Insertion Cloze Test theo format sau:
- Cho một đoạn văn (150–200 từ) có 5 chỗ trống được đánh số (30), (31), (32), (33), (34)
- Mỗi chỗ trống cần một câu/ý hoàn chỉnh để làm đoạn văn mạch lạc
- Với mỗi chỗ trống, cung cấp 4 lựa chọn (A, B, C, D), trong đó chỉ có 1 lựa chọn đúng
- Phải có passage với numbered blanks và blanks array
- Trả về JSON với format được chỉ định

📊 ĐỊNH DẠNG JSON CHO SENTENCE INSERTION CLOZE TEST:
{
  "type": "multiple_choice",
  "question": "Read the following passage and mark the letter A, B, C or D on your answer sheet to indicate the option that best fits each of the numbered blanks from 30 to 34:",
  "passage": "All holidays involve some element of risk, whether in the form of illness, bad weather, being unable to get what we want if we delay booking, or (30) _______. We ask ourselves what risks we would run if we went there, if there is a high likelihood of their occurrence, if the risks are avoidable and how significant the consequences would be.\\n\\nSome tourists, of course, relish a degree of risk, as this gives an edge of excitement to the holiday. (31) _______. Others, however, are risk averse and will studiously avoid risk whenever possible. Clearly, the significance of the risk will be a key factor. (32) _______. The risk averse will book early, choose to return to the same resort and hotel they have visited, knowing its reliability, or book a package tour rather than travel independently.\\n\\n(33) _______. There is evidence that much of the continuing reluctance shown by some tourists to seek information and make bookings through Internet providers can be attributed, in part, to the lack of face-to-face contact with a trusted – and, hopefully, expert – travel agent and, in part, (34) _______ in favour of the information provided.",
  "blanks": [
    {"number": 30, "options": ["A. what are the products we will be certainly seeing directly", "B. until we certainly see its products directly", "C. being uncertain about the product until seeing it directly", "D. for a certain product to be seen directly"], "correctAnswer": "C"},
    {"number": 31, "options": ["A. but do not present any risks and barriers to tourism itself", "B. so the presence of risk in tourism itself is a barrier to tourism", "C. and tourism itself does not present any barriers or risks", "D. if the barrier of tourism itself is not in the presence of risk"], "correctAnswer": "B"},
    {"number": 32, "options": ["A. People, by contrast, will be far less concerned about the risk of crime than about that of poor weather", "B. As a result, there will be much less concern about the risk of poor weather than about the risk of crime", "C. As earlier mentioned, the risk of crime will be of much greater concern to people than that of poor weather", "D. Similarly, the concern about the risk of poor weather will be much greater than that about the risk of crime"], "correctAnswer": "A"},
    {"number": 33, "options": ["A. Customers also book their holidays by choosing the methods without risky factors", "B. Risk is also a factor in the methods chosen by customers to book their holidays", "C. Holidays are also booked after customers choose factors and methods without risk", "D. Also, the factors and methods customers choose to book their holidays are risky"], "correctAnswer": "B"},
    {"number": 34, "options": ["A. the suspicion that information received through the Internet will be biased", "B. thanks to the biased information received through the Internet with the suspicion", "C. due to the Internet, through which biased and suspicious information is received", "D. the biased information received through the Internet will be suspicious"], "correctAnswer": "A"}
  ],
  "explanation": "Giải thích từng câu: (30) C - logic về sự không chắc chắn khi đặt chỗ, (31) B - risk có thể là barrier cho tourism, (32) A - contrast về mức độ lo lắng giữa crime vs weather, (33) B - risk cũng ảnh hưởng đến cách book holiday, (34) A - suspicion về thông tin Internet"
}

📖 READING 2 - READING COMPREHENSION (multiple_choice_reading2):
Khi tạo câu hỏi "multiple_choice_reading2", BẮT BUỘC sử dụng format sau:

📋 CẤU TRÚC READING COMPREHENSION:
- Tạo 1 đoạn văn tiếng Anh dài (250-400 từ) về chủ đề được yêu cầu
- Tạo 4-6 câu hỏi riêng biệt về đoạn văn
- Mỗi câu hỏi có 4 lựa chọn A/B/C/D
- Test các kỹ năng: main idea, inference, vocabulary in context, specific details, author's purpose

📊 ĐỊNH DẠNG JSON CHO READING COMPREHENSION:
{
  "type": "multiple_choice_reading2",
  "question": "Read the passage and mark the letter A, B, C or D on your answer sheet to indicate the best answer to each of the following questions from 20 to 29:",
  "passage": "We are living through a boom in greenwashing - the strategic use of comforting environmental claims to disguise business-as-usual pollution. Picture a chief executive whose company emits mountains of carbon yet boasts of 'net-zero' commitments...[full passage continues]",
  "questions": [
    {
      "number": 20,
      "question": "According to paragraph 1, genuine decarbonisation _______",
      "options": ["A. involves hiring an expert agency", "B. is costly and demanding", "C. requires hiring marketing staff", "D. physically injures those involved"],
      "correctAnswer": "B"
    },
    {
      "number": 21, 
      "question": "Which of the following best summarises paragraph 2?",
      "options": ["A. The exponential growth of greenwashing", "B. Strong environmental claims", "C. Chief executives' opinions", "D. The great pressure"],
      "correctAnswer": "A"
    }
  ],
  "explanation": "Giải thích đáp án: Question 20 - B vì đoạn văn nhấn mạnh decarbonisation thực sự tốn kém và khó khăn. Question 21 - A vì đoạn 2 mô tả sự gia tăng nhanh chóng của greenwashing."
}

🔤 SẮP XẾP THỨ TỰ CÂU (ordering):
Khi tạo câu hỏi "ordering" cho môn Tiếng Anh, BẮT BUỘC sử dụng format sau:

📋 CẤU TRÚC JUMBLED SENTENCES:
Hãy tạo một đề luyện tập tiếng Anh dạng jumbled sentences (sắp xếp câu thành đoạn hội thoại hoặc đoạn văn hợp lý).
- Cho mỗi câu hỏi gồm 5 câu (a, b, c, d, e) bị xáo trộn thứ tự
- Nội dung có thể thuộc một trong các chủ đề: đối thoại hằng ngày, sức khỏe, du lịch, công nghệ, thư tín, hoặc mô tả thành phố
- Đảm bảo chỉ có một đáp án đúng
- Sau mỗi câu hỏi, đưa ra 4 lựa chọn (A, B, C, D), mỗi lựa chọn là một thứ tự sắp xếp khác nhau
- BẮT BUỘC: Options phải dùng en-dash với spaces: "A. a – b – c – d – e" (KHÔNG dùng hyphens như "a-b-c")

📊 ĐỊNH DẠNG JSON CHO JUMBLED SENTENCES:
{
  "type": "ordering",
  "question": "Choose the correct order to form a coherent dialogue/paragraph:",
  "items": [
    "a. Hello, I'd like to book a table for tonight.",
    "b. How many people will be dining?",
    "c. What time would you prefer?",
    "d. Just two, please.",
    "e. Around 7:30 PM would be perfect."
  ],
  "options": ["A. a – b – c – d – e", "B. a – d – b – c – e", "C. a – c – e – b – d", "D. b – a – d – c – e"],
  "correctAnswer": "B",
  "correctOrder": [0, 3, 1, 2, 4],
  "explanation": "Giải thích logic của cuộc hội thoại: a (khách hàng chào và đặt bàn) → d (trả lời số người) → b (nhân viên hỏi số người) → c (hỏi giờ) → e (trả lời giờ)"
}

⚠️ ĐỊNH DẠNG THEO MÔN HỌC:

🧮 **CHỈ CHO CÁC MÔN TỰ NHIÊN** (Toán, Lý, Hóa, Sinh):
- **BẮT BUỘC** sử dụng LaTeX cho TẤT CẢ công thức, biểu thức, phương trình
- LaTeX: Sử dụng \\\\Delta thay vì \\Delta, \\\\frac{a}{b} thay vì \\frac{a}{b}
- Inline math: $x^2$, Display math: $$x^2$$  
- QUAN TRỌNG: Trong JSON, phải dùng double backslash (\\\\) cho LaTeX commands
- Ví dụ: "explanation": "Phương trình có \\\\Delta = b^2 - 4ac > 0"

🔬 VÍ DỤ BẮT BUỘC CHO 4 MÔN TỰ NHIÊN:
TOÁN: $f'(x) = 2x$, $\\\\int x^2 dx = \\\\frac{x^3}{3} + C$, $\\\\Delta = b^2 - 4ac$
LÝ: $F = ma$, $E = mc^2$, $v = \\\\frac{s}{t}$, $P = \\\\frac{W}{t}$
HÓA: $H_2SO_4$, $CaCO_3 + 2HCl \\\\rightarrow CaCl_2 + H_2O + CO_2$
SINH: $C_6H_{12}O_6$, tỷ lệ $3:1$, $2n = 46$ nhiễm sắc thể

⚠️ **CHỈ VỚI MÔN TỰ NHIÊN**: KHÔNG ĐƯỢC VIẾT: "x bình phương" → PHẢI VIẾT: "$x^2$"
⚠️ **CHỈ VỚI MÔN TỰ NHIÊN**: KHÔNG ĐƯỢC VIẾT: "delta" → PHẢI VIẾT: "$\\\\Delta$"

📚 **CÁC MÔN KHÁC** (Ngữ văn, Tiếng Anh, Tin học):
- LaTeX KHÔNG bắt buộc, chỉ cần format chuẩn theo yêu cầu môn học
- Tập trung vào chất lượng nội dung và định dạng chuẩn THPTQG 2025

⚠️ QUAN TRỌNG: PHẢI TẠO ĐÚNG ${data.questionCount} CÂU HỎI!
- Nếu yêu cầu 4 câu thì PHẢI có 4 items trong array "questions"
- Nếu yêu cầu 2 câu thì PHẢI có 2 items trong array "questions"  
- KHÔNG ĐƯỢC tạo ít hơn hoặc nhiều hơn số được yêu cầu

TRẢ VỀ JSON CÓ CẤU TRÚC SAU (KHÔNG COMMENT):
{
  "questions": [
    {
      "id": "1",
      "type": "multiple_choice|true_false|essay|fill_in_blank|matching|ordering", 
      "question": "Nội dung câu hỏi với LaTeX nếu cần",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "blanks": ["đáp án 1", "đáp án 2"],
      "leftItems": ["Item 1", "Item 2"],
      "rightItems": ["Option A", "Option B"],
      "correctMatches": {"Item 1": "Option A", "Item 2": "Option B"},
      "items": ["Item 1", "Item 2", "Item 3"],
      "correctOrder": [2, 0, 1],
      "statements": ["a) Mệnh đề thứ nhất", "b) Mệnh đề thứ hai", "c) Mệnh đề thứ ba", "d) Mệnh đề thứ tư"],
      "statementAnswers": [true, false, true, false],
      "statementExplanations": ["Giải thích mệnh đề a", "Giải thích mệnh đề b", "Giải thích mệnh đề c", "Giải thích mệnh đề d"],
      "explanation": "Giải thích ngắn gọn và rõ ràng cách giải quyết bài tập này. Sử dụng LaTeX cho toán học."
    }
  ]
}`;
}

function sanitizeJsonForLatex(jsonStr: string): string {
  // More robust approach: Fix LaTeX escaping issues in JSON strings
  try {
    // First, let's try to parse as-is in case it's already valid
    JSON.parse(jsonStr);
    return jsonStr;
  } catch (e) {
    console.log("JSON parsing failed, attempting to fix LaTeX escaping...");
  }

  // Strategy: Fix common LaTeX escaping issues in JSON
  let result = jsonStr;

  // Fix single backslashes that should be double backslashes in JSON
  // This regex matches single backslashes followed by common LaTeX commands
  result = result.replace(/\\([a-zA-Z]+|[^\\])/g, "\\\\$1");

  // Fix cases where we now have triple or quadruple backslashes (fix over-escaping)
  result = result.replace(/\\\\\\\\+/g, "\\\\\\\\");
  result = result.replace(/\\\\\\([^\\])/g, "\\\\\\\\$1");

  // Try parsing the fixed result
  try {
    JSON.parse(result);
    console.log("Successfully fixed LaTeX escaping issues");
    return result;
  } catch (e2) {
    console.log(
      "Still failed after LaTeX cleaning, trying more aggressive fix",
    );
  }

  // More aggressive approach: Replace all backslashes with double backslashes
  result = jsonStr.replace(/\\/g, "\\\\");

  try {
    JSON.parse(result);
    console.log("Fixed with aggressive backslash replacement");
    return result;
  } catch (e3) {
    console.log("All fixes failed, falling back to original");
    return jsonStr;
  }
}

function parseAIResponse(content: string, data: any): GeneratedQuestion[] {
  try {
    // Try to extract JSON from response, looking for ```json...``` blocks first
    let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      jsonMatch = content.match(/\{[\s\S]*\}/);
    }

    if (jsonMatch) {
      let jsonStr = jsonMatch[1] || jsonMatch[0];

      console.log("Raw JSON string:", jsonStr.substring(0, 500) + "...");

      // Sanitize JSON to handle LaTeX escape sequences
      const sanitizedJson = sanitizeJsonForLatex(jsonStr);
      console.log(
        "Sanitized JSON string:",
        sanitizedJson.substring(0, 500) + "...",
      );

      const parsed = JSON.parse(sanitizedJson);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        const validQuestions = parsed.questions.map((q: any, index: number) => {
          const questionType =
            q.type || data.questionTypes[0] || "multiple_choice";

          // Fix parsing for English Reading: convert questions to clozeBlanks if needed
          let clozeBlanks = q.blanks || undefined;
          let readingQuestions = q.questions || undefined;

          // If this is multiple_choice (Reading) and AI returned questions instead of blanks, convert it
          if (
            questionType === "multiple_choice" &&
            data.subject === "anh" &&
            !clozeBlanks &&
            readingQuestions
          ) {
            console.log(
              "Converting Reading Comprehension format to Cloze Test format for multiple_choice",
            );
            clozeBlanks = readingQuestions.map((readingQ: any) => ({
              number: readingQ.number,
              options: readingQ.options,
              correctAnswer: readingQ.correctAnswer,
            }));
            readingQuestions = undefined; // Clear readingQuestions since we converted to clozeBlanks
          }

          return {
            id: q.id || `${index + 1}`,
            type: questionType,
            question: q.question || "",
            options: q.options || undefined,
            correctAnswer: q.correctAnswer || undefined,
            explanation: q.explanation || "",
            // New question type fields
            blanks: q.blanks || undefined,
            leftItems: q.leftItems || undefined,
            rightItems: q.rightItems || undefined,
            correctMatches: q.correctMatches || undefined,
            items: q.items || undefined,
            correctOrder: q.correctOrder || undefined,
            // Cloze test fields (multiple_choice_reading1 and multiple_choice for English)
            passage: q.passage || undefined,
            clozeBlanks: clozeBlanks,
            // Reading comprehension fields (multiple_choice_reading2 only)
            readingQuestions: readingQuestions,
            // New True/False format fields
            statements: q.statements || undefined,
            statementAnswers: q.statementAnswers || undefined,
            statementExplanations: q.statementExplanations || undefined,
          };
        });

        console.log(
          `Successfully parsed ${validQuestions.length} questions from AI response`,
        );
        return validQuestions;
      }
    }

    // Fallback: create realistic sample questions if parsing fails
    console.log("Using fallback questions due to parsing error");
    const fallbackQuestions = createFallbackQuestions(data);
    return fallbackQuestions;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    console.log("Falling back to sample questions due to JSON parsing error");
    const fallbackQuestions = createFallbackQuestions(data);
    return fallbackQuestions;
  }
}

function createFallbackQuestions(data: any): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  let questionId = 1;

  for (const type of data.questionTypes.slice(0, data.questionCount)) {
    if (type === "multiple_choice") {
      // Generate appropriate fallback based on subject
      if (data.subject === "anh") {
        // English Reading - Sentence Insertion Cloze Test
        questions.push({
          id: questionId.toString(),
          type: "multiple_choice",
          question:
            "Read the following passage and mark the letter A, B, C or D on your answer sheet to indicate the option that best fits each of the numbered blanks from 30 to 34:",
          passage:
            "Environmental protection is crucial for sustainable development. Many countries are implementing policies to reduce carbon emissions. (30) _______. Renewable energy sources such as solar and wind power are becoming more popular. (31) _______. However, the transition requires significant investment and planning. (32) _______. Public awareness campaigns help educate citizens about environmental issues. (33) _______. International cooperation is essential for addressing global climate change. (34) _______.",
          clozeBlanks: [
            {
              number: 30,
              options: [
                "A. These policies focus on industrial regulations.",
                "B. Environmental laws are often ignored by companies.",
                "C. Climate change affects all countries equally.",
                "D. Pollution levels continue to rise globally.",
              ],
              correctAnswer: "A",
            },
            {
              number: 31,
              options: [
                "A. Traditional energy sources remain the primary choice.",
                "B. These alternatives offer cleaner and sustainable solutions.",
                "C. Nuclear power is the only viable option.",
                "D. Energy consumption has decreased significantly.",
              ],
              correctAnswer: "B",
            },
            {
              number: 32,
              options: [
                "A. Most governments lack the necessary resources.",
                "B. Private companies show little interest in green technology.",
                "C. Careful planning ensures smooth implementation of new policies.",
                "D. Environmental initiatives often fail due to poor execution.",
              ],
              correctAnswer: "C",
            },
            {
              number: 33,
              options: [
                "A. Citizens are generally uninterested in environmental matters.",
                "B. Education plays a vital role in promoting eco-friendly behaviors.",
                "C. Public campaigns have proven ineffective in changing attitudes.",
                "D. Social media spreads misinformation about climate issues.",
              ],
              correctAnswer: "B",
            },
            {
              number: 34,
              options: [
                "A. Countries prefer to address environmental issues independently.",
                "B. Global partnerships are unnecessary for environmental protection.",
                "C. Working together allows nations to share resources and expertise.",
                "D. International agreements rarely produce meaningful results.",
              ],
              correctAnswer: "C",
            },
          ],
          explanation:
            "This is a Sentence Insertion Cloze Test focusing on environmental topics suitable for English language learners.",
        });
      } else {
        // Math fallback for other subjects
        questions.push({
          id: questionId.toString(),
          type: "multiple_choice",
          question: `Giải phương trình $x^2 - 4x + 3 = 0$ và tìm tổng các nghiệm:`,
          options: ["A. $S = 4$", "B. $S = 3$", "C. $S = -4$", "D. $S = -3$"],
          correctAnswer: "A",
          explanation:
            "**Bước 1:** Nhận dạng phương trình bậc hai $x^2 - 4x + 3 = 0$ với $a=1, b=-4, c=3$ ==> **Bước 2:** Áp dụng định lý Vieta: tổng nghiệm $S = -\\frac{b}{a} = -\\frac{-4}{1} = 4$ ==> **Bước 3:** Kiểm tra bằng cách giải: $(x-1)(x-3)=0 \\Rightarrow x_1=1, x_2=3$ ==> **KẾT QUẢ:** $S = 1 + 3 = 4$.",
        });
      }
    } else if (type === "true_false") {
      questions.push({
        id: questionId.toString(),
        type: "true_false",
        question: `Các mệnh đề về phương trình và hàm số sau đúng hay sai?`,
        statements: [
          "a) Phương trình $x^2 + 2x + 5 = 0$ có hai nghiệm thực phân biệt",
          "b) Hàm số $f(x) = x^3 - 3x + 1$ đạt cực trị tại $x = ±1$",
          "c) Giới hạn $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$",
          "d) Đạo hàm của $y = e^{x^2}$ là $y' = 2xe^{x^2}$",
        ],
        statementAnswers: [false, true, true, true],
        statementExplanations: [
          "a) SAI: Biệt thức $\\Delta = 4 - 20 = -16 < 0$ nên phương trình vô nghiệm thực.",
          "b) ĐÚNG: $f'(x) = 3x^2 - 3 = 0 \\Rightarrow x = ±1$. Kiểm tra đạo hàm cấp hai xác nhận có cực trị.",
          "c) ĐÚNG: Đây là giới hạn cơ bản quan trọng trong giải tích.",
          "d) ĐÚNG: Áp dụng quy tắc chuỗi: $(e^{x^2})' = e^{x^2} \\cdot (x^2)' = e^{x^2} \\cdot 2x = 2xe^{x^2}$.",
        ],
        explanation:
          "**Bước 1:** Phân tích từng mệnh đề một cách độc lập ==> **Bước 2:** Áp dụng lý thuyết tương ứng (biệt thức, đạo hàm, giới hạn) ==> **Bước 3:** Tính toán cụ thể cho từng trường hợp ==> **KẾT QUẢ:** Xác định đúng/sai từng mệnh đề.",
      });
    } else if (type === "essay") {
      questions.push({
        id: questionId.toString(),
        type: "essay",
        question: `Giải và biện luận phương trình: $(m-1)x^2 + 2mx + m + 3 = 0$ theo tham số $m$.`,
        explanation: `**Hướng dẫn trả lời:**
1. **Xét $m = 1$:** Phương trình trở thành $2x + 4 = 0 \\Rightarrow x = -2$.
2. **Xét $m \\neq 1$:** Tính biệt thức $\\Delta = (2m)^2 - 4(m-1)(m+3) = 4m^2 - 4(m^2 + 2m - 3) = -8m + 12$.
3. **Biện luận:**
   - $\\Delta > 0 \\Leftrightarrow m < \\frac{3}{2}$: Hai nghiệm phân biệt
   - $\\Delta = 0 \\Leftrightarrow m = \\frac{3}{2}$: Nghiệm kép $x = -\\frac{3}{2}$
   - $\\Delta < 0 \\Leftrightarrow m > \\frac{3}{2}$: Vô nghiệm thực`,
      });
    } else if (type === "fill_in_blank") {
      questions.push({
        id: questionId.toString(),
        type: "fill_in_blank",
        question: `Phương trình bậc hai $ax^2 + bx + c = 0$ có nghiệm khi _____ ≥ 0.`,
        blanks: ["Δ", "delta", "b² - 4ac", "biệt thức"],
        correctAnswer: "Δ",
        explanation:
          "**Bước 1:** Nhận dạng phương trình bậc hai $ax^2 + bx + c = 0$ ==> **Bước 2:** Áp dụng điều kiện có nghiệm ==> **Bước 3:** Tính biệt thức $\\Delta = b^2 - 4ac$ ==> **KẾT QUẢ:** Phương trình có nghiệm khi $\\Delta \\geq 0$.",
      });
    } else if (type === "matching") {
      questions.push({
        id: questionId.toString(),
        type: "matching",
        question: `Ghép các hàm số với đạo hàm tương ứng:`,
        leftItems: ["$x^2$", "$\\sin x$", "$e^x$", "$\\ln x$"],
        rightItems: ["$2x$", "$\\cos x$", "$e^x$", "$\\frac{1}{x}$"],
        correctMatches: {
          "$x^2$": "$2x$",
          "$\\sin x$": "$\\cos x$",
          "$e^x$": "$e^x$",
          "$\\ln x$": "$\\frac{1}{x}$",
        },
        explanation:
          "**Bước 1:** Xác định loại hàm số của từng item ==> **Bước 2:** Áp dụng công thức đạo hàm tương ứng ==> **Bước 3:** Ghép từng hàm với đạo hàm đúng ==> **KẾT QUẢ:** $(x^2)' = 2x$, $(\\sin x)' = \\cos x$, $(e^x)' = e^x$, $(\\ln x)' = \\frac{1}{x}$.",
      });
    }
    questionId++;
  }

  return questions;
}
