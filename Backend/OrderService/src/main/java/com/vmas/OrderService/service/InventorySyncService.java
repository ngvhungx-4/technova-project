package com.vmas.OrderService.service;

import com.vmas.OrderService.dto.StockUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventorySyncService {

    private final RestTemplate restTemplate;

    private final String PRODUCT_SERVICE_URL = "http://localhost:8082/api/products";
    private final String FLASH_SALE_SERVICE_URL = "http://localhost:8085/api/flash-sales";

    /**
     * Đồng bộ tồn kho và ghi nhận Flash Sale khi đơn hàng thành công
     */
//    public void syncInventoryOnOrderSuccess(Integer userId, List<StockUpdateRequest> purchasedItems, boolean isFlashSaleOrder, Integer flashSaleProductId) {
//        HttpHeaders headers = new HttpHeaders();
//        headers.setContentType(MediaType.APPLICATION_JSON);
//        HttpEntity<List<StockUpdateRequest>> requestEntity = new HttpEntity<>(purchasedItems, headers);
//
//        try {
//            if (isFlashSaleOrder && flashSaleProductId != null) {
//                try {
//                    String claimUrl = FLASH_SALE_SERVICE_URL + "/internal/claim-by-product?userId=" + userId + "&productId=" + flashSaleProductId;
//                    restTemplate.postForObject(claimUrl, null, Boolean.class);
//                } catch (Exception ex) {
//                    // Nếu gọi Flash Sale lỗi (do không có chương trình, hết hạn,...), chỉ in cảnh báo, không làm sập luồng
//                    System.err.println("Cảnh báo Flash Sale: Đơn hàng không thuộc chương trình hoặc lỗi cấu hình (" + ex.getMessage() + ")");
//                }
//            }
//
//            System.out.println("Đồng bộ Tồn kho & Flash Sale hoàn tất!");
//
//        } catch (Exception e) {
//            System.err.println("Lỗi đồng bộ: " + e.getMessage());
//            throw new RuntimeException("Không thể đồng bộ dữ liệu sau khi đặt hàng: " + e.getMessage());
//        }
//    }
}