package com.vmas.CartService.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class ProductClient {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    // Cổng kết nối tới ProductService
    private final String PRODUCT_API_URL = "http://localhost:8082/api/products/";
    
    private final String FLASH_SALE_CHECK_PURCHASED_URL = "http://localhost:8085/api/flash-sales/internal/check-purchased";
    
    // MỚI: Cổng kết nối tới API Flash Sale (Hoặc API Gateway của bạn)
    // LƯU Ý: Nếu FlashSaleService hoặc Gateway của bạn không chạy ở port 8080, hãy sửa số 8080 bên dưới nhé!
    private final String FLASH_SALE_API_URL = "http://localhost:8080/api/flash-sales/public/active";
    
    private Map<String, Object> cachedFlashSale = null;
    private long lastFetchTime = 0;
    private final long CACHE_DURATION = 3000; // Lưu cache trong 3 giây (3000ms)

    private Map<String, Object> getFlashSaleData() {
        long now = System.currentTimeMillis();
        // Nếu chưa quá 3 giây, dùng lại cache để tránh gọi API liên tục
        if (cachedFlashSale != null && (now - lastFetchTime) < CACHE_DURATION) {
            return cachedFlashSale;
        }
        
        try {
            // BƯỚC 1: Gọi API và nhận về dạng String thô để tránh lỗi ép kiểu
            org.springframework.http.ResponseEntity<String> responseEntity = 
                restTemplate.getForEntity(FLASH_SALE_API_URL, String.class);
                
            String rawResponse = responseEntity.getBody();

            // BƯỚC 2: Kiểm tra xem dữ liệu trả về có phải là JSON Object không (bắt đầu bằng '{')
            if (rawResponse != null && rawResponse.trim().startsWith("{")) {
                // Nếu đúng là JSON, dùng objectMapper để parse thành Map an toàn
                cachedFlashSale = objectMapper.readValue(rawResponse, Map.class);
                lastFetchTime = now;
            } else {
                // Nếu là chuỗi thông báo "Hiện không có...", đặt cache thành null
                cachedFlashSale = null;
            }
        } catch (Exception e) {
            if (cachedFlashSale == null) {
                System.out.println("Lỗi API Flash Sale: " + e.getMessage());
            }
        }
        return cachedFlashSale;
    }

 // Hàm cũ: Mặc định số lượng là 1 và userId là null
    public ProductDTO getProductById(Integer productId) {
        return getProductById(productId, 1, null);
    }

    // HÀM MỚI: Bổ sung tham số userId để xác thực thành viên
    public ProductDTO getProductById(Integer productId, Integer cartQuantity, Integer userId) {
        try {
            // Lấy thông tin sản phẩm gốc
            Map response = restTemplate.getForObject(PRODUCT_API_URL + productId, Map.class);
            if (response == null) throw new RuntimeException("Product Service trả về null");

            BigDecimal salePrice = BigDecimal.ZERO;
            if (response.get("salePrice") != null) {
                salePrice = new BigDecimal(String.valueOf(response.get("salePrice")));
            }

            BigDecimal basePrice = BigDecimal.ZERO;
            if (response.get("basePrice") != null) {
                basePrice = new BigDecimal(String.valueOf(response.get("basePrice")));
            }

            Integer stock = 0;
            if (response.get("stock") != null) {
                stock = Integer.parseInt(String.valueOf(response.get("stock")));
            }

         // ==================================================
            // ĐIỀU KIỆN MỚI: Chỉ áp dụng giá Flash Sale nếu mua 1 chiếc, đã đăng nhập (userId != null),
            // VÀ chưa từng mua sản phẩm này trong đợt Flash Sale.
            // ==================================================
            if (cartQuantity != null && cartQuantity <= 1 && userId != null) {
                try {
                    Map<String, Object> flashSale = getFlashSaleData();
                    if (flashSale != null && flashSale.get("items") != null) {
                        List<Map<String, Object>> items = (List<Map<String, Object>>) flashSale.get("items");
                                                 
                        for (Map<String, Object> item : items) {
                            Integer fsProductId = Integer.parseInt(String.valueOf(item.get("productId")));
                            if (fsProductId.equals(productId)) {
                                
                                // 1. KIỂM TRA LỊCH SỬ MUA
                                boolean alreadyBought = checkUserPurchasedProduct(userId, productId);
                                
                                // 2. KIỂM TRA SỐ LƯỢNG SUẤT FLASH SALE
                                int soldQuantity = 0;
                                if (item.get("soldQuantity") != null) {
                                    soldQuantity = Integer.parseInt(String.valueOf(item.get("soldQuantity")));
                                }
                                
                                int allocatedQuantity = 1;
                                if (item.get("allocatedQuantity") != null) {
                                    allocatedQuantity = Integer.parseInt(String.valueOf(item.get("allocatedQuantity")));
                                }
                                
                                boolean isSoldOut = soldQuantity >= allocatedQuantity;
                                
                                // 3. QUYẾT ĐỊNH ÁP DỤNG GIÁ
                                if (!alreadyBought && !isSoldOut) {
                                    // CHƯA MUA & CÒN SUẤT -> Áp dụng giá Flash Sale
                                    salePrice = new BigDecimal(String.valueOf(item.get("flashSalePrice")));
                                    basePrice = new BigDecimal(String.valueOf(item.get("originalPrice")));
                                } else {
                                    // ĐÃ MUA HOẶC HẾT SUẤT -> Giữ nguyên giá gốc từ Product Service
                                    if (alreadyBought) {
                                        System.out.println("Giỏ hàng: User " + userId + " đã mua SP " + productId + " -> Trả về giá gốc.");
                                    } else if (isSoldOut) {
                                        System.out.println("Giỏ hàng: SP " + productId + " đã hết suất Flash Sale -> Trả về giá gốc.");
                                    }
                                }
                                break; 
                            }
                        }
                    }
                } catch (Exception e) {
                    System.out.println("Lỗi lấy thông tin Flash Sale: " + e.getMessage());
                }
            }
            // ==================================================

            List<ColorDTO> colors = Collections.emptyList();
            if (response.get("colors") != null) {
                try {
                    colors = objectMapper.convertValue(response.get("colors"),
                            new com.fasterxml.jackson.core.type.TypeReference<List<ColorDTO>>() {});
                } catch (Exception e) {
                    System.err.println("Lỗi parse colors: " + e.getMessage());
                }
            }

            return ProductDTO.builder()
                    .id((Integer) response.get("id"))
                    .name((String) response.get("name"))
                    .thumbnail((String) response.get("thumbnail"))
                    .salePrice(salePrice) 
                    .basePrice(basePrice) 
                    .sku((String) response.get("sku"))
                    .stock(stock) 
                    .colors(colors)
                    .build();

        } catch (Exception e) {
            e.printStackTrace();
            return ProductDTO.builder().id(productId).name("Sản phẩm lỗi").build();
        }
    }
    
    private boolean checkUserPurchasedProduct(Integer userId, Integer productId) {
        if (userId == null) return false;
        try {
            String url = FLASH_SALE_CHECK_PURCHASED_URL + "?userId=" + userId + "&productId=" + productId;
            Boolean hasBought = restTemplate.getForObject(url, Boolean.class);
            return Boolean.TRUE.equals(hasBought);
        } catch (Exception e) {
            System.out.println("Lỗi kiểm tra lịch sử mua Flash Sale (Giỏ hàng): " + e.getMessage());
            return false;
        }
    }

    // Các class DTO giữ nguyên như thiết kế ban đầu của bạn
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductDTO {
        private Integer id;
        private String name;
        private String thumbnail;
        private BigDecimal salePrice;
        private BigDecimal basePrice;
        private String sku;
        private Integer stock;
        private List<ColorDTO> colors;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColorDTO {
        private String colorName;
        private String colorImageUrl;
    }
}