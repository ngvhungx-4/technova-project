package com.vmas.OrderService.dto;

import com.vmas.OrderService.enums.PaymentMethod;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class OrderRequest {
    private String receiverName;
    private String receiverPhone;
    private String shippingAddress;
 // THÊM MỚI: Nhận email từ form đặt hàng
    private String email;
    private PaymentMethod paymentMethod;
    private String voucherCode;
    private BigDecimal shippingFee;
    private BigDecimal discountAmount;

    private List<OrderItemRequest> items;

    @Data
    public static class OrderItemRequest {
        private Integer productId;
        private String productName;
        private String productThumbnail;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal costPrice;
        
        private Integer flashSaleItemId;
    }
}