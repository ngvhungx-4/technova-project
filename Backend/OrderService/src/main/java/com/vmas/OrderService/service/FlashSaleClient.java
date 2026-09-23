package com.vmas.OrderService.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class FlashSaleClient {

    private final RestTemplate restTemplate;
    // URL chỉ tới FlashSaleService (cổng 8085)
    private final String FLASH_SALE_URL = "http://localhost:8085/api/flash-sales";

    public void claimItem(Integer userId, Integer flashSaleItemId) {
        // Tạo URL với các query parameters
        String url = FLASH_SALE_URL + "/internal/claim?userId=" + userId + "&flashSaleItemId=" + flashSaleItemId;
        
        try {
            // Gửi request POST
            Boolean isSuccess = restTemplate.postForObject(url, null, Boolean.class);
            if (Boolean.FALSE.equals(isSuccess)) {
                throw new RuntimeException("Không thể chốt quyền mua Flash Sale.");
            }
        } catch (Exception e) {
            // Nếu FlashSaleService ném lỗi (ví dụ: đã hết hàng, đã mua rồi), bắt lỗi và ném lại cho OrderService
            throw new RuntimeException("Lỗi Flash Sale: " + e.getMessage());
        }
    }
    
    public boolean checkUserPurchasedProduct(Integer userId, Integer productId) {
        String url = FLASH_SALE_URL + "/internal/check-purchased?userId=" + userId + "&productId=" + productId;
        try {
            Boolean hasBought = restTemplate.getForObject(url, Boolean.class);
            return Boolean.TRUE.equals(hasBought);
        } catch (Exception e) {
            return false;
        }
    }
    
 // Gọi sang FlashSaleService để đặt mua khi đơn PENDING
    public void claimFlashSaleItemByProductId(Integer userId, Integer productId) {
        String url = FLASH_SALE_URL + "/internal/claim-by-product?userId=" + userId + "&productId=" + productId;
        try {
            Boolean isSuccess = restTemplate.postForObject(url, null, Boolean.class);
            if (Boolean.FALSE.equals(isSuccess)) {
                // Nếu false, nghĩa là sản phẩm thường (không thuộc Flash Sale) -> Bỏ qua, mua bình thường
                return; 
            }
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            // Bắt lỗi 400 (Bad Request) từ FlashSaleService khi vi phạm: "Hết lượt mua" hoặc "Hết hàng"
            String errorMessage = e.getResponseBodyAsString();
            throw new RuntimeException(errorMessage);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi kết nối đến Flash Sale: " + e.getMessage());
        }
    }

    // Gọi sang FlashSaleService để hoàn lại lượt mua khi đơn CANCELLED
    public void cancelFlashSaleClaim(Integer userId, Integer productId) {
        String url = FLASH_SALE_URL + "/internal/cancel-claim?userId=" + userId + "&productId=" + productId;
        try {
            restTemplate.postForObject(url, null, String.class);
        } catch (Exception e) {
            System.err.println("Lỗi khi gọi hoàn lượt Flash Sale: " + e.getMessage());
        }
    }
 // MỚI THÊM: Gọi API kiểm tra hết suất
    public boolean checkSoldOut(Integer productId) {
        String url = FLASH_SALE_URL + "/internal/check-sold-out?productId=" + productId;
        try {
            Boolean isSoldOut = restTemplate.getForObject(url, Boolean.class);
            return Boolean.TRUE.equals(isSoldOut);
        } catch (Exception e) {
            return true; // Nếu lỗi mạng, mặc định trả về true (hết suất) để ép về giá gốc cho an toàn
        }
    }
}