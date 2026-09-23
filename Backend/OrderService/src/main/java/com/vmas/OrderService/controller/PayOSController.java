package com.vmas.OrderService.controller;

import com.vmas.OrderService.entity.Order;
import com.vmas.OrderService.enums.PaymentStatus;
import com.vmas.OrderService.service.OrderService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;

@RestController
@RequestMapping("/api/payment/payos")
// BỎ @RequiredArgsConstructor để tự viết constructor cho an toàn[cite: 7]
public class PayOSController {

    private final OrderService orderService;

    public PayOSController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/return")
    public void handlePaymentReturn(
            @RequestParam(value = "code", required = false) String payosCode,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam("stringOrderCode") String stringOrderCode,
            HttpServletResponse response) throws IOException {

        // Kiểm tra mã thành công "00" và status "PAID"
        if ("PAID".equalsIgnoreCase(status) && "00".equals(payosCode)) {
            
            Order order = orderService.getOrderByCode(stringOrderCode);

            // VIẾT LẠI ĐIỀU KIỆN KIỂM TRA AN TOÀN HƠN (Chống NullPointerException)
            boolean isCOD = (order.getPaymentMethod() == com.vmas.OrderService.enums.PaymentMethod.COD);
            boolean hasDeposit = (order.getDepositAmount() != null && order.getDepositAmount().compareTo(java.math.BigDecimal.ZERO) > 0);

            if (isCOD && hasDeposit) {
                // ĐƠN COD CÓ CỌC: Chuyển trạng thái Order -> DEPOSIT_PAID
                orderService.updateOrderStatuses(stringOrderCode, com.vmas.OrderService.enums.OrderStatus.DEPOSIT_PAID, PaymentStatus.PENDING);
            } else {
                // SỬA TẠI ĐÂY - ĐƠN BANKING: Thanh toán xong tự động xác nhận đơn hàng (CONFIRMED) và đánh dấu đã thanh toán đủ (PAID)
                orderService.updateOrderStatuses(stringOrderCode, com.vmas.OrderService.enums.OrderStatus.CONFIRMED, PaymentStatus.PAID);
            }

            response.sendRedirect("http://localhost:5501/payment_success.html?orderCode=" + stringOrderCode);
            
        } else {
            System.out.println("Giao dịch thất bại, đang xử lý hủy đơn: " + stringOrderCode);
            try {
                orderService.handleFailedPayment(stringOrderCode);
            } catch (Exception e) {
                System.err.println("Lỗi khi xử lý đơn thất bại: " + e.getMessage());
            }
            response.sendRedirect("http://localhost:5501/cart.html?error=failed");
        }
    }

    @GetMapping("/cancel")
    public void handlePaymentCancel(
            @RequestParam("stringOrderCode") String stringOrderCode,
            HttpServletResponse response) throws IOException {

        System.out.println("Đang xử lý hủy đơn hàng (Khách bấm hủy): " + stringOrderCode);
        try {
            // BẮT ĐẦU SỬA: Gọi Service để đổi trạng thái đơn và CỘNG LẠI KHO thay vì xóa hẳn đơn
            orderService.handleFailedPayment(stringOrderCode);
            System.out.println("Đã cập nhật trạng thái hủy và hoàn kho thành công.");
        } catch (Exception e) {
            System.err.println("Lỗi khi hủy đơn: " + e.getMessage());
        }

        // Đưa khách về giỏ hàng kèm thông báo[cite: 7]
        response.sendRedirect("http://localhost:5501/cart.html?status=cancelled");
    }
}