package com.vmas.ProductService.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vmas.ProductService.dto.ProductResponse;
import com.vmas.ProductService.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatbotService {

    @Autowired
    private ProductRepository productRepository;

    // Đã tiêm ProductService để sử dụng hàm tìm kiếm mạnh mẽ
    @Autowired
    private ProductService productService; 

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> processMessage(String userMessage, String userName) {
        Map<String, Object> finalResult = new HashMap<>();
        String customerName = (userName != null && !userName.trim().isEmpty()) ? userName : "bạn";

        try {
            // ==========================================
            // PHA 1: NHỜ GEMINI PHÂN TÍCH Ý ĐỊNH & THÔNG SỐ (JSON)
            // ==========================================
        	String intentPrompt = """
                    Bạn là AI phân tích dữ liệu mua sắm. Phân tích tin nhắn và trả về DUY NHẤT một chuỗi JSON.
                    Định dạng: {"action": "SEARCH" hoặc "CHAT", "keyword": "tên hãng/mã SP", "minPrice": số, "maxPrice": số, "specs": {"tên_thông_số": "giá_trị"}}
                    Quy tắc: 
                    - keyword: CHỈ trích xuất tên hãng (Asus, Dell...) hoặc mã sản phẩm. Nếu không có, BẮT BUỘC để rỗng "".
                    - specs: Trích xuất thông số kỹ thuật. Dùng chính xác các khóa: "cpu", "gpu", "ram_capacity", "storage", "os", "screen_size".
                    - minPrice, maxPrice: Nếu khách KHÔNG nhắc đến ngân sách, BẮT BUỘC đặt minPrice là 0 và maxPrice là 999999999. Không được đặt bằng 0.
                    - Nếu khách chào hỏi/tán gẫu -> action: CHAT.
                    Tin nhắn khách: "%s"
                    """.formatted(userMessage);

            String intentJsonString = cleanJsonString(callGemini(intentPrompt));
            JsonNode intentData = objectMapper.readTree(intentJsonString);
            
         // ĐÃ THÊM: Dòng log để bạn dễ dàng kiểm tra (Debug) xem AI bóc tách đúng chưa
            System.out.println("=== KẾT QUẢ AI BÓC TÁCH (JSON) ===");
            System.out.println(intentJsonString);
            
            String action = intentData.path("action").asText("CHAT");
            String keyword = intentData.path("keyword").asText("");
            Double minPrice = intentData.path("minPrice").asDouble(0.0);
            Double maxPrice = intentData.path("maxPrice").asDouble(999999999.0);
            
            if (maxPrice <= 0.0) {
                maxPrice = 999999999.0;
            }
            
            // Trích xuất chuỗi JSON cấu hình
            JsonNode specsNode = intentData.path("specs");
            String specsString = specsNode.isMissingNode() ? "{}" : specsNode.toString();

            // ==========================================
            // PHA 2: TÌM KIẾM TRONG DATABASE VỚI BỘ LỌC ĐỘNG
            // ==========================================
            List<ProductResponse> suggestedProducts = new ArrayList<>();
            if ("SEARCH".equals(action)) {
                String searchKeyword = keyword.isEmpty() ? null : keyword;
                java.math.BigDecimal minB = java.math.BigDecimal.valueOf(minPrice);
                java.math.BigDecimal maxB = java.math.BigDecimal.valueOf(maxPrice);
                
                // Sử dụng hàm searchPublicProducts
                com.vmas.ProductService.dto.ProductPageResponse searchResult = 
                    productService.searchPublicProducts(searchKeyword, null, minB, maxB, null, specsString, 0, 5, "salePrice", "asc");
                
                suggestedProducts = searchResult.getContent();
            }

            // ==========================================
            // PHA 3: TẠO CÂU TRẢ LỜI CHO CHATBOT
            // ==========================================
            String finalReply = "";
            if ("CHAT".equals(action)) {
                String chatPrompt = "Bạn là tư vấn viên thân thiện. Tên khách: " + customerName + 
                                    ". Tin nhắn: " + userMessage + ". Trả lời ngắn gọn 2 câu, vui vẻ.";
                finalReply = callGemini(chatPrompt);
            } else {
                if (suggestedProducts.isEmpty()) {
                    finalReply = "Dạ, hiện tại TechNova không tìm thấy sản phẩm nào khớp với cấu hình mà " + customerName + " yêu cầu 😢. Bạn xem thử đổi thông số khác nhé!";
                } else {
                    finalReply = "Dạ, " + customerName + " tham khảo ngay các mẫu có cấu hình cực chuẩn như bạn cần bên dưới nhé! 👇";
                }
            }
            finalResult.put("reply", finalReply);

            // ==========================================
            // ĐÍNH KÈM SẢN PHẨM VÀO GIAO DIỆN
            // ==========================================
            List<Map<String, Object>> productPayload = new ArrayList<>();
            if ("SEARCH".equals(action) && !suggestedProducts.isEmpty()) {
                productPayload = suggestedProducts.stream().map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", p.getId());
                    m.put("name", p.getName());
                    m.put("salePrice", p.getSalePrice());
                    m.put("thumbnail", p.getThumbnail());
                    return m;
                }).toList();
            }
            finalResult.put("products", productPayload);

        } catch (Exception e) {
            e.printStackTrace();
            finalResult.put("reply", "Hệ thống đang tải dữ liệu cấu hình. Bạn chờ mình giây lát rồi nhắn lại nhé!");
            finalResult.put("products", new ArrayList<>());
        }
        return finalResult;
    }

    private String callGemini(String prompt) {
        try {
            String fullUrl = apiUrl + apiKey;
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            Map<String, Object> response = restTemplate.postForObject(fullUrl, request, Map.class);

            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                return (String) parts.get(0).get("text");
            }
        } catch (Exception e) {
            System.err.println("Lỗi gọi API Gemini: " + e.getMessage());
        }
        return "{}";
    }

    private String cleanJsonString(String rawString) {
        String cleanString = rawString.trim();
        if (cleanString.startsWith("```json")) {
            cleanString = cleanString.substring(7);
        } else if (cleanString.startsWith("```")) {
            cleanString = cleanString.substring(3);
        }
        if (cleanString.endsWith("```")) {
            cleanString = cleanString.substring(0, cleanString.length() - 3);
        }
        return cleanString.trim();
    }
}