package com.vmas.OrderService.controller;

import com.vmas.OrderService.dto.*;
import com.vmas.OrderService.enums.OrderStatus;
import com.vmas.OrderService.enums.PaymentMethod;
import com.vmas.OrderService.enums.PaymentStatus;
import com.vmas.OrderService.entity.Order;
import com.vmas.OrderService.service.OrderService;
import com.vmas.OrderService.service.PayOSService; // Thêm thư viện PayOSService
import com.vmas.OrderService.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;

import java.util.Map;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final JwtUtil jwtUtil;
    private final PayOSService payOSService;

    private Integer getUserId(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            return jwtUtil.extractUserId(token.substring(7));
        }
        return null; // Khách vãng lai sẽ trả về null
    }

 // 2. Cập nhật API Tạo đơn hàng
    @PostMapping("/create")
    public ResponseEntity<?> createOrder(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestHeader(value = "Session-Id", required = false) String sessionId,
            @RequestBody OrderRequest request) {

        try {
            Integer userId = getUserId(token);
            // Truyền thêm sessionId vào service
            Order savedOrder = orderService.createOrder(userId, sessionId, request);
            return ResponseEntity.ok(savedOrder);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
 // TÍCH HỢP PAYOS - API TẠO LINK THANH TOÁN
    @PostMapping("/{orderCode}/generate-payos-link")
    public ResponseEntity<?> generatePayosLink(@PathVariable("orderCode") String orderCode) {
        try {
            // Lấy thông tin đơn hàng
            Order order = orderService.getOrderByCode(orderCode);
            
            // Do PayOS bắt buộc orderCode phải là số nguyên, ta dùng ID
            long numericOrderCode = order.getId();
            
            // BẮT ĐẦU THÊM MỚI: XÁC ĐỊNH SỐ TIỀN CẦN THANH TOÁN QUA LINK
            long amount = 0;
            if (order.getPaymentMethod() == PaymentMethod.COD && order.getDepositAmount().compareTo(BigDecimal.ZERO) > 0) {
                // Nếu là COD và có tiền cọc -> Số tiền cần thanh toán PayOS là tiền cọc
                amount = order.getDepositAmount().longValue(); 
            } else {
                // Nếu không phải COD (ví dụ chọn Bank Transfer ngay từ đầu) -> Thanh toán toàn bộ
                amount = order.getTotalAmount().longValue(); 
            }

            // Gọi PayOSService để sinh link
            String paymentLink = payOSService.createPaymentLinkForMicroservice(orderCode, numericOrderCode, amount);
            
            // Trả về link dưới dạng chuỗi (String)
            return ResponseEntity.ok(paymentLink);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi sinh link PayOS: " + e.getMessage());
        }
    }
    
    // API XÓA CỨNG ĐƠN HÀNG (KHI HỦY THANH TOÁN)
    @DeleteMapping("/{orderCode}")
    public ResponseEntity<?> deleteOrder(@PathVariable("orderCode") String orderCode) {
        try {
            orderService.deleteOrderByCode(orderCode);
            return ResponseEntity.ok("Đã hủy và xóa đơn hàng thành công");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi xóa đơn: " + e.getMessage());
        }
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<Order>> getMyOrders(
            @RequestHeader("Authorization") String token) {
            
        Integer userId = getUserId(token);
        return ResponseEntity.ok(orderService.getOrdersByUser(userId));
    }

 // 3. Cập nhật API Lấy chi tiết đơn hàng (Để khách vãng lai xem được đơn của họ sau khi đặt)
    @GetMapping("/{orderCode}")
    public ResponseEntity<Order> getOrderByCode(
            @RequestHeader(value = "Authorization", required = false) String token,
            @PathVariable("orderCode") String orderCode) {

        Integer userId = getUserId(token); 
        Order order = orderService.getOrderByCode(orderCode);
        
        // Bảo mật: Nếu có userId (đã đăng nhập) nhưng userId không khớp với chủ đơn hàng -> chặn
        if (userId != null && order.getUserId() != null && !order.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        // Lưu ý: Nếu order.getUserId() == null (đơn vãng lai), ai có mã orderCode đều xem được.
        
        return ResponseEntity.ok(order);
    }
    
    @PutMapping("/{orderCode}/cancel")
    public ResponseEntity<?> cancelOrder(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestHeader(value = "Session-Id", required = false) String sessionId,
            @PathVariable("orderCode") String orderCode) {
        try {
            Integer userId = getUserId(token);
            // Truyền thêm sessionId để Service xác thực
            Order cancelledOrder = orderService.cancelOrder(orderCode, userId, sessionId);
            return ResponseEntity.ok(cancelledOrder);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PutMapping("/{orderCode}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable("orderCode") String orderCode,
            @RequestParam(value = "status", required = false) OrderStatus status,
            @RequestParam(value = "paymentStatus", required = false) PaymentStatus paymentStatus) {
        try {
            // Gọi hàm mới đã viết ở trên
            Order updatedOrder = orderService.updateOrderStatuses(orderCode, status, paymentStatus);
            return ResponseEntity.ok(updatedOrder);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
 // Cập nhật API XIN YÊU CẦU TRẢ HÀNG
    @PostMapping(value = "/returns", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createReturnRequest(
            @RequestParam("orderCode") String orderCode,
            @RequestParam("productId") Integer productId,
            @RequestParam("reason") String reason,
            // SỬA: Nhận một danh sách (List) các tệp thay vì một tệp duy nhất
            @RequestParam(value = "evidenceImages", required = false) List<org.springframework.web.multipart.MultipartFile> evidenceImages) {
        try {
            com.vmas.OrderService.entity.ReturnRequest request = orderService.createReturnRequest(orderCode, productId, reason, evidenceImages);
            return ResponseEntity.ok(request);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi tạo yêu cầu: " + e.getMessage());
        }
    }
 // API Lấy danh sách yêu cầu trả hàng của User hiện tại
    @GetMapping("/returns/my-returns")
    public ResponseEntity<?> getMyReturnRequests(@RequestHeader("Authorization") String token) {
        try {
            Integer userId = getUserId(token);
            return ResponseEntity.ok(orderService.getUserReturnRequests(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi lấy dữ liệu trả hàng: " + e.getMessage());
        }
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin")
    public ResponseEntity<Page<Order>> getAllOrdersAdmin(
    		@RequestParam(value = "keyword", defaultValue = "") String keyword,
            @RequestParam(value = "status", defaultValue = "") String status,
            @RequestParam(value = "startDate", defaultValue = "") String startDate,
            @RequestParam(value = "endDate", defaultValue = "") String endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        
    	return ResponseEntity.ok(orderService.getAllOrdersForAdmin(keyword, status, startDate, endDate, page, size));
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/{orderCode}")
    public ResponseEntity<Order> getOrderDetailsForAdmin(@PathVariable("orderCode") String orderCode) {
        return ResponseEntity.ok(orderService.getOrderByCode(orderCode));
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics")
    public ResponseEntity<Map<String, Long>> getOrderStatistics() {
        return ResponseEntity.ok(orderService.getOrderStatistics());
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/revenue")
    public ResponseEntity<List<RevenueStatResponse>> getRevenueStatistics(
    		@RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getRevenueStatistics(filter, date));
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/categories")
    public ResponseEntity<List<CategoryRevenueStatResponse>> getCategoryRevenueStatistics(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getCategoryRevenueStatistics(filter, date));
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/dashboard")
    public ResponseEntity<DashboardStatResponse> getDashboardStatistics(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getDashboardStatistics(filter, date));
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/inventory")
    public ResponseEntity<Map<String, List<ProductStockResponse>>> getInventoryReport() {
        return ResponseEntity.ok(orderService.getInventoryReport());
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/top-products")
    public ResponseEntity<List<TopProductResponse>> getTopSellingProducts(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        return ResponseEntity.ok(orderService.getTopSellingProducts(filter, date));
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PutMapping("/admin/{orderCode}/refund")
    public ResponseEntity<?> confirmRefund(@PathVariable("orderCode") String orderCode) {
        try {
            // Gọi hàm xác nhận hoàn tiền ở Service
            Order updatedOrder = orderService.confirmRefund(orderCode);
            return ResponseEntity.ok(updatedOrder);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/{orderCode}/returns")
    public ResponseEntity<?> getOrderReturnRequests(@PathVariable("orderCode") String orderCode) {
        try {
            return ResponseEntity.ok(orderService.getReturnRequestsByOrder(orderCode));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi lấy dữ liệu: " + e.getMessage());
        }
    }
    
 // API XỬ LÝ DUYỆT/TỪ CHỐI TRẢ HÀNG
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PutMapping("/admin/returns/{requestId}/status")
    public ResponseEntity<?> updateReturnStatus(
            @PathVariable("requestId") Integer requestId,
            @RequestParam("status") com.vmas.OrderService.enums.ReturnRequestStatus status) {
        try {
            return ResponseEntity.ok(orderService.updateReturnRequestStatus(requestId, status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi cập nhật trạng thái: " + e.getMessage());
        }
    }
    
 // Thêm API này vào trong class OrderController
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/users/{userId}/total-spending")
    public ResponseEntity<BigDecimal> getTotalSpendingByUser(@PathVariable("userId") Integer userId) {
        try {
            BigDecimal totalSpending = orderService.getTotalSpendingByUserId(userId);
            return ResponseEntity.ok(totalSpending);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(BigDecimal.ZERO);
        }
    }
}