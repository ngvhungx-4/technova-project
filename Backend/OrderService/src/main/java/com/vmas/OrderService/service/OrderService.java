package com.vmas.OrderService.service;

import com.vmas.OrderService.dto.OrderRequest;
import com.vmas.OrderService.dto.StockUpdateRequest;
import com.vmas.OrderService.dto.TopProductResponse;
import com.vmas.OrderService.entity.Order;
import com.vmas.OrderService.entity.OrderItem;
import com.vmas.OrderService.entity.Voucher;
import com.vmas.OrderService.enums.DiscountType;
import com.vmas.OrderService.enums.OrderStatus;
import com.vmas.OrderService.enums.PaymentMethod;
import com.vmas.OrderService.enums.PaymentStatus;
import com.vmas.OrderService.repository.OrderRepository;
import com.vmas.OrderService.repository.VoucherRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vmas.OrderService.dto.DashboardStatResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.vmas.OrderService.dto.RevenueStatResponse;
import com.vmas.OrderService.dto.CategoryRevenueStatResponse;
import com.vmas.OrderService.dto.ProductCategoryInfoResponse;
import com.vmas.OrderService.dto.ProductStockResponse;

import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;


@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductServiceClient productServiceClient;
    private final VoucherRepository voucherRepository;
    
 // Khai báo bộ ký tự an toàn
    private static final String ALLOWED_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    
    private final JwtService jwtService;
    private final EmailService emailService;
    
    private final com.vmas.OrderService.repository.ReturnRequestRepository returnRequestRepository;
    
    private final FlashSaleClient flashSaleClient;
    private final InventorySyncService inventorySyncService;
    private final AuthServiceClient authServiceClient;

    @Transactional
    public Order createOrder(Integer userId, String sessionId, OrderRequest request) {
    	java.util.List<Integer> validFlashSaleProductIds = new java.util.ArrayList<>();

        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            // Luôn lấy sẵn giá gốc từ ProductService để dự phòng
            com.vmas.OrderService.dto.ProductResponse product = productServiceClient.getProductById(itemReq.getProductId());
            
            if (userId != null) {
                // Kiểm tra 2 điều kiện: Đã mua chưa? Hết suất chưa?
                boolean alreadyBought = flashSaleClient.checkUserPurchasedProduct(userId, itemReq.getProductId());
                boolean isSoldOut = flashSaleClient.checkSoldOut(itemReq.getProductId());
                
                if (alreadyBought || isSoldOut) {
                    // Nếu ĐÃ MUA hoặc HẾT SUẤT -> Vô hiệu hóa quyền lợi Flash Sale
                    System.out.println("Sản phẩm ID " + itemReq.getProductId() + " (Đã mua: " + alreadyBought + ", Hết suất: " + isSoldOut + "). Ép về giá gốc.");
                    
                    if (product != null) {
                        itemReq.setUnitPrice(product.getSalePrice()); 
                        itemReq.setFlashSaleItemId(null); 
                    }
                } else {
                    // Hợp lệ -> Đưa vào danh sách để Tí nữa trừ lượt Flash Sale
                    validFlashSaleProductIds.add(itemReq.getProductId());
                }
            } else {
                // BẢO MẬT: Nếu không đăng nhập (Khách vãng lai), luôn ép về giá gốc
                if (product != null) {
                    itemReq.setUnitPrice(product.getSalePrice());
                    itemReq.setFlashSaleItemId(null);
                }
            }
        }
    	// TẠO MÃ ĐƠN HÀNG
        String orderCode = generateOrderCode();

        // Tính toán tổng tiền
        BigDecimal subTotal = BigDecimal.ZERO;
        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            BigDecimal itemTotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            subTotal = subTotal.add(itemTotal);
        }

        // Tính tiền giảm
        BigDecimal discount = BigDecimal.ZERO;
        String voucherCode = request.getVoucherCode();

     // Tạm thời truyền null cho nhóm khách hàng (Cần gọi AuthServiceClient để lấy tier thực tế nếu bạn muốn bảo mật cao hơn)
        if (voucherCode != null && !voucherCode.trim().isEmpty()) {
            Map<String, Object> validationResult = validateAndCalculateDiscount(voucherCode, subTotal, request.getEmail(), null, userId);

            if ((Boolean) validationResult.get("isValid")) {
                discount = (BigDecimal) validationResult.get("discountAmount");
                incrementVoucherUsage(voucherCode); // Tăng lượt sử dụng voucher lên 1
            } else {
                // Nếu mã không hợp lệ, không cho tạo đơn
                throw new RuntimeException((String) validationResult.get("message"));
            }
        }

        BigDecimal shipping = request.getShippingFee() != null ? request.getShippingFee() : BigDecimal.ZERO;

        BigDecimal calculatedTotal = subTotal.subtract(discount).add(shipping);
        BigDecimal totalAmount = calculatedTotal.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : calculatedTotal;

        BigDecimal depositAmount = BigDecimal.ZERO;
        if (request.getPaymentMethod() == PaymentMethod.COD) {
            if (totalAmount.compareTo(new BigDecimal("30000000")) > 0) {
                depositAmount = totalAmount.multiply(new BigDecimal("0.30"));
            } else if (totalAmount.compareTo(new BigDecimal("10000000")) > 0) {
                depositAmount = totalAmount.multiply(new BigDecimal("0.20"));
            } else if (totalAmount.compareTo(new BigDecimal("1000000")) >= 0) {
                depositAmount = totalAmount.multiply(new BigDecimal("0.10"));
            }
        }
        
        Order order = Order.builder()
                .userId(userId)
                .sessionId(sessionId)
                .orderCode(orderCode)
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .email(request.getEmail())
                .shippingAddress(request.getShippingAddress())
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(PaymentStatus.PENDING)
                .orderStatus(OrderStatus.PENDING)
                .voucherCode(voucherCode)
                .subTotal(subTotal)
                .discountAmount(discount)
                .shippingFee(shipping)
                .totalAmount(totalAmount)
                .depositAmount(depositAmount)
                .build();

        // Map Order Items
        List<OrderItem> items = request.getItems().stream().map(reqItem -> OrderItem.builder()
                .order(order)
                .productId(reqItem.getProductId())
                .productName(reqItem.getProductName())
                .productThumbnail(reqItem.getProductThumbnail())
                .quantity(reqItem.getQuantity())
                .unitPrice(reqItem.getUnitPrice())
                // Lấy giá vốn, nếu null thì tạm tính bằng 70% giá bán
                .costPrice(reqItem.getCostPrice() != null ? reqItem.getCostPrice() : reqItem.getUnitPrice().multiply(new BigDecimal("0.7")))
                .totalPrice(reqItem.getUnitPrice().multiply(BigDecimal.valueOf(reqItem.getQuantity())))
                .isFlashSale(validFlashSaleProductIds.contains(reqItem.getProductId()))
                .build()
        ).collect(Collectors.toList());

        order.setItems(items);

        List<StockUpdateRequest> stockRequests = request.getItems().stream()
                .map(item -> new StockUpdateRequest(item.getProductId(), item.getQuantity()))
                .collect(Collectors.toList()); 

        try {
            // 1. Trừ tồn kho và cộng lượt bán thông thường trong ProductService
            productServiceClient.decreaseStock(stockRequests);
            productServiceClient.increaseSold(stockRequests);

            // 2. CHỐT LƯỢT FLASH SALE (Chỉ áp dụng cho SP hợp lệ)
            if (userId != null) {
                for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
                    // Chì gọi API Flash Sale nếu sản phẩm nằm trong danh sách hợp lệ (chưa mua)
                    if (validFlashSaleProductIds.contains(itemReq.getProductId())) {
                        flashSaleClient.claimFlashSaleItemByProductId(userId, itemReq.getProductId());
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Rất tiếc! " + e.getMessage());
        }
                  
        return orderRepository.save(order);
    }
   

    // Xử lý voucher và tính toán
    @Transactional(readOnly = true)
    public Map<String, Object> validateAndCalculateDiscount(String code, BigDecimal orderSubTotal, String userEmail, String userCustomerGroup, Integer userId) {
        Map<String, Object> response = new HashMap<>();

        try {
            Voucher voucher = voucherRepository.findByVoucherCodeAndIsActiveTrue(code)
                    .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại hoặc đã bị khóa"));

            LocalDateTime now = LocalDateTime.now();

            if (voucher.getStartDate() != null && now.isBefore(voucher.getStartDate())) {
                throw new RuntimeException("Mã giảm giá chưa tới thời gian sử dụng");
            }
            if (voucher.getEndDate() != null && now.isAfter(voucher.getEndDate())) {
                throw new RuntimeException("Mã giảm giá đã hết hạn");
            }

            int currentUsedCount = voucher.getUsedCount() != null ? voucher.getUsedCount() : 0;
            if (voucher.getUsageLimit() != null && currentUsedCount >= voucher.getUsageLimit()) {
                throw new RuntimeException("Mã giảm giá đã hết lượt sử dụng");
            }

            if (voucher.getMinOrderAmount() != null && orderSubTotal.compareTo(voucher.getMinOrderAmount()) < 0) {
                throw new RuntimeException("Đơn hàng chưa đạt giá trị tối thiểu " + voucher.getMinOrderAmount() + " để áp dụng mã này");
            }

            // --- KIỂM TRA ĐIỀU KIỆN EMAIL ---
            if (voucher.getTargetEmail() != null && !voucher.getTargetEmail().isEmpty()) {
                // Kiểm tra xem khách đã đăng nhập chưa (Nếu chưa, userId sẽ là null)
                if (userId == null) {
                    throw new RuntimeException("Bạn phải đăng nhập bằng tài khoản " + voucher.getTargetEmail() + " để sử dụng mã này!");
                }
                
                // Kiểm tra xem email có khớp không
                if (userEmail == null || !voucher.getTargetEmail().equalsIgnoreCase(userEmail.trim())) {
                    throw new RuntimeException("Mã giảm giá này chỉ dành riêng cho tài khoản có email: " + voucher.getTargetEmail());
                }
            }

         // --- KIỂM TRA ĐIỀU KIỆN NHÓM KHÁCH HÀNG (ÁP DỤNG CẤP BẬC THỪA KẾ) ---
            if (voucher.getCustomerGroup() != null && !voucher.getCustomerGroup().isEmpty()) {
                
                // 1. Khởi tạo hạng thực tế bằng giá trị truyền vào (mặc định đang là null)
                String actualTier = userCustomerGroup;
                
                // 2. Nếu đã đăng nhập (có userId), tự động gọi AuthService để lấy hạng chuẩn xác
                if (userId != null) {
                    String fetchedTier = authServiceClient.getCurrentUserTier();
                    if (fetchedTier != null) {
                        actualTier = fetchedTier;
                    }
                }

                // 3. Quy đổi ra số để so sánh lớn bé
                int voucherWeight = getTierWeight(voucher.getCustomerGroup());
                int userWeight = getTierWeight(actualTier);

                // 4. Kiểm tra điều kiện
                if (userWeight < voucherWeight) {
                    throw new RuntimeException("Rất tiếc! Mã giảm giá này yêu cầu hạng thành viên từ " 
                            + voucher.getCustomerGroup().toUpperCase() + " trở lên.");
                }
            }

            // Tính số tiền được giảm
            BigDecimal discountAmount = BigDecimal.ZERO;

            if (voucher.getDiscountType() == DiscountType.FIXED_AMOUNT) {
                discountAmount = voucher.getDiscountValue();
            } else if (voucher.getDiscountType() == DiscountType.PERCENTAGE) {
                discountAmount = orderSubTotal.multiply(voucher.getDiscountValue()).divide(new BigDecimal("100"));

                // Nếu vượt quá mức giảm tối đa thì gán bằng mức giảm tối đa
                if (voucher.getMaxDiscountAmount() != null && discountAmount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                    discountAmount = voucher.getMaxDiscountAmount();
                }
            }

            // Đảm bảo không giảm giá lố tiền hàng
            if (discountAmount.compareTo(orderSubTotal) > 0) {
                discountAmount = orderSubTotal;
            }

            response.put("isValid", true);
            response.put("discountAmount", discountAmount);
            response.put("voucherCode", voucher.getVoucherCode());
            response.put("message", "Áp dụng mã thành công!");
            return response;

        } catch (Exception e) {
            response.put("isValid", false);
            response.put("discountAmount", BigDecimal.ZERO);
            response.put("message", e.getMessage());
            return response;
        }
    }

    private void incrementVoucherUsage(String code) {
        voucherRepository.findByVoucherCodeAndIsActiveTrue(code).ifPresent(voucher -> {
            voucher.setUsedCount(voucher.getUsedCount() + 1);
            voucherRepository.save(voucher);
        });
    }

    public List<Order> getOrdersByUser(Integer userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // Hàm sinh mã đơn hàng
    private String generateOrderCode() {
        String prefix = "TN";

        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));

        StringBuilder randomPart = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            randomPart.append(ALLOWED_CHARACTERS.charAt(RANDOM.nextInt(ALLOWED_CHARACTERS.length())));
        }

        return prefix + datePart + randomPart.toString();
    }

    @Transactional(readOnly = true)
    public Order getOrderByCode(String identifier) {
        // Thử tìm theo ID trước
        try {
            Integer id = Integer.parseInt(identifier);
            Optional<Order> orderById = orderRepository.findById(id);
            if (orderById.isPresent()) {
                return orderById.get();
            }
        } catch (NumberFormatException e) {
            // Nếu không phải là số, tìm theo OrderCode
        }

        // Nếu không phải ID, thì tìm theo OrderCode
        return orderRepository.findByOrderCode(identifier)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với thông tin: " + identifier));
    }

    @Transactional
    public Order cancelOrder(String orderCode, Integer userId, String sessionId) {
        Order order = getOrderByCode(orderCode);

        // 1. Kiểm tra quyền sở hữu của người dùng đối với đơn hàng
        if (order.getUserId() != null) {
            if (!order.getUserId().equals(userId)) {
                throw new RuntimeException("Bạn không có quyền thao tác đơn hàng này!");
            }
        } else {
            if (sessionId == null || !sessionId.equals(order.getSessionId())) {
                throw new RuntimeException("Bạn không có quyền thao tác đơn hàng này!");
            }
        }

        // 2. Chặn các trạng thái không được phép hủy
        OrderStatus currentStatus = order.getOrderStatus();
        if (currentStatus != OrderStatus.PENDING && currentStatus != OrderStatus.DEPOSIT_PAID) {
            throw new RuntimeException("Chỉ có thể hủy đơn hàng khi đang chờ xác nhận hoặc mới đặt cọc!");
        }

        // 3. Xử lý trạng thái thanh toán (PaymentStatus)
        if (currentStatus == OrderStatus.DEPOSIT_PAID) {
            // Đã cọc -> Khách hủy -> Trạng thái thanh toán là CHỜ HOÀN TIỀN
            order.setPaymentStatus(PaymentStatus.REFUND_PENDING);
        } else {
            // Chưa cọc (PENDING) -> Trạng thái thanh toán là FAILED
            order.setPaymentStatus(PaymentStatus.FAILED);
        }

        // 4. Đổi trạng thái đơn hàng thành ĐÃ HỦY
        order.setOrderStatus(OrderStatus.CANCELLED);
        Order savedOrder = orderRepository.save(order);

        List<StockUpdateRequest> stockRequests = savedOrder.getItems().stream()
                .map(item -> new StockUpdateRequest(item.getProductId(), item.getQuantity()))
                .collect(Collectors.toList());

        try {
            // Hoàn tồn kho và lượt bán thường
            productServiceClient.increaseStock(stockRequests);
            productServiceClient.decreaseSold(stockRequests); 

            // Hoàn lượt mua Flash Sale
            if (savedOrder.getUserId() != null) {
                for (OrderItem item : savedOrder.getItems()) {
                	if (Boolean.TRUE.equals(item.getIsFlashSale())) {
                        flashSaleClient.cancelFlashSaleClaim(savedOrder.getUserId(), item.getProductId());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi hoàn kho và Flash Sale: " + e.getMessage());
        }

        return savedOrder;
    }

    @Transactional
    public Order updateOrderStatuses(String orderCode, OrderStatus newStatus, PaymentStatus newPaymentStatus) {
        Order order = getOrderByCode(orderCode);
        
        if (newStatus != null && order.getOrderStatus() != newStatus) {
            OrderStatus currentStatus = order.getOrderStatus();
            if (currentStatus == OrderStatus.DELIVERED || currentStatus == OrderStatus.CANCELLED) {
                throw new RuntimeException("Đơn hàng đã hoàn tất (Hoặc đã hủy), không thể thay đổi trạng thái!");
            }
            
            if (newStatus != OrderStatus.CANCELLED) {
                // 1. Chặn quay ngược trạng thái (Vì đang Giao Hàng không thể lùi về Chờ Xác Nhận)
                if (newStatus.ordinal() < currentStatus.ordinal()) {
                    throw new RuntimeException("Lỗi nghiêm trọng: Không thể quay ngược trạng thái đơn hàng!");
                }
                // 2. Lấy thông tin loại thanh toán để kiểm tra
                boolean isCOD = (order.getPaymentMethod() == com.vmas.OrderService.enums.PaymentMethod.COD);
                boolean hasDeposit = (order.getDepositAmount() != null && order.getDepositAmount().compareTo(java.math.BigDecimal.ZERO) > 0);
                
                // 3. Quy tắc cho trạng thái DEPOSIT_PAID
                if (newStatus == OrderStatus.DEPOSIT_PAID) {
                    if (!isCOD || !hasDeposit) {
                        throw new RuntimeException("Lỗi: Trạng thái 'Đã cọc' chỉ dành cho đơn COD có cọc!");
                    }
                }

                // 4. Quy tắc nhảy PENDING -> CONFIRMED
                if (currentStatus == OrderStatus.PENDING && newStatus == OrderStatus.CONFIRMED) {
                    if (isCOD && hasDeposit) {
                        throw new RuntimeException("Lỗi: Đơn COD có cọc. Khách phải thanh toán cọc trước khi xác nhận!");
                    }
                    if (order.getPaymentMethod() == com.vmas.OrderService.enums.PaymentMethod.BANK_TRANSFER) {
                        order.setPaymentStatus(PaymentStatus.PAID);
                        newPaymentStatus = null; 
                    }
                }
                
                // 5. Chặn việc nhảy cóc sai quy định khác
                if (newStatus.ordinal() > currentStatus.ordinal() + 1) {
                    if (!(currentStatus == OrderStatus.PENDING && newStatus == OrderStatus.CONFIRMED)) {
                        throw new RuntimeException("Lỗi nghiêm trọng: Đang bỏ qua một bước trạng thái đơn hàng!");
                    }
                }
            } else {
                // ==========================================
                // BỔ SUNG MỚI: XỬ LÝ KHI TRẠNG THÁI CHUYỂN SANG CANCELLED BỞI ADMIN
                // ==========================================
                List<StockUpdateRequest> stockRequests = order.getItems().stream()
                        .map(item -> new StockUpdateRequest(item.getProductId(), item.getQuantity()))
                        .collect(Collectors.toList());
                try {
                    // 1. Hoàn lại tồn kho và trừ lượt bán trong ProductService
                    productServiceClient.increaseStock(stockRequests);
                    productServiceClient.decreaseSold(stockRequests);
                    
                    // 2. Hoàn lại lượt mua Flash Sale và trừ sold_quantity
                    if (order.getUserId() != null) {
                        for (OrderItem item : order.getItems()) {
                        	if (Boolean.TRUE.equals(item.getIsFlashSale())) {
                                flashSaleClient.cancelFlashSaleClaim(order.getUserId(), item.getProductId());
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Lỗi hoàn kho và Flash Sale khi Admin hủy đơn: " + e.getMessage());
                }
            }
            
            if (newStatus == OrderStatus.DELIVERED) {
                // THỰC HIỆN GỬI EMAIL ĐÁNH GIÁ
                if (order.getEmail() != null && !order.getEmail().isEmpty()) {
                    try {
                        String reviewToken = jwtService.generateReviewToken(order.getId(), order.getEmail());
                        String reviewLink = "http://localhost:5501/review.html?token=" + reviewToken + "&orderId=" + order.getId();
                        
                        String subject = "Cảm ơn bạn đã mua hàng tại TechNova!";
                        String content = "<h3>Chào " + order.getReceiverName() + ",</h3>"
                                + "<p>Đơn hàng <b>" + order.getOrderCode() + "</b> đã được giao thành công.</p>"
                                + "<p>Hãy dành chút thời gian đánh giá sản phẩm giúp chúng tôi nhé:</p>"
                                + "<a href=\"" + reviewLink + "\" style=\"display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;\">Đánh giá ngay</a>"
                                + "<p>Cảm ơn bạn rất nhiều!</p>";
                        
                        emailService.sendEmail(order.getEmail(), subject, content);
                    } catch (Exception e) {
                        System.err.println("Lỗi khi gửi email đánh giá: " + e.getMessage());
                    }
                }
                if (order.getUserId() != null) {
                    int earnedPoints = order.getTotalAmount().divide(new java.math.BigDecimal("10000")).intValue();
                    if (earnedPoints > 0) {
                        authServiceClient.addPointsForUser(order.getUserId(), earnedPoints, order.getOrderCode());
                    }
                }
                order.setPaymentStatus(PaymentStatus.PAID);
            }
            order.setOrderStatus(newStatus);
        }

        // Logic cập nhật PaymentStatus thủ công
        if (newPaymentStatus != null && order.getPaymentStatus() != newPaymentStatus) {
            PaymentStatus currentPaymentStatus = order.getPaymentStatus();
            if (currentPaymentStatus == PaymentStatus.PAID) {
                throw new RuntimeException("Đơn hàng đã ghi nhận thanh toán thành công, không thể quay ngược!");
            }
            if (currentPaymentStatus == PaymentStatus.FAILED && newPaymentStatus == PaymentStatus.PENDING) {
                throw new RuntimeException("Không thể quay ngược trạng thái thanh toán!");
            }
            order.setPaymentStatus(newPaymentStatus);
        }
        
        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public Page<Order> getAllOrdersForAdmin(String keyword, String statusStr, String startDateStr, String endDateStr, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        OrderStatus status = null;
        if (statusStr != null && !statusStr.trim().isEmpty()) {
            try {
                status = OrderStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException e) {
            }
        }
        
        // XỬ LÝ LỌC NGÀY THÁNG
        LocalDateTime startDateTime = null;
        LocalDateTime endDateTime = null;
        if (startDateStr != null && !startDateStr.trim().isEmpty()) {
            startDateTime = LocalDate.parse(startDateStr).atStartOfDay();
        }
        if (endDateStr != null && !endDateStr.trim().isEmpty()) {
            endDateTime = LocalDate.parse(endDateStr).atTime(23, 59, 59);
        }
        
        // LẤY DANH SÁCH ĐƠN HÀNG TỪ REPOSITORY
        Page<Order> orders = orderRepository.searchOrdersForAdmin(keyword, status, startDateTime, endDateTime, pageable);

        // ==========================================
        // MÃ MỚI: KIỂM TRA YÊU CẦU TRẢ HÀNG
        // ==========================================
        List<String> orderCodes = orders.getContent().stream()
                .map(Order::getOrderCode)
                .collect(Collectors.toList());

        if (!orderCodes.isEmpty()) {
            // Lấy tất cả yêu cầu trả hàng có liên quan đến các mã đơn này
            List<com.vmas.OrderService.entity.ReturnRequest> returns = returnRequestRepository.findByOrderCodeIn(orderCodes);
            
            // Lọc ra tập hợp (Set) các mã đơn có yêu cầu trả hàng
            java.util.Set<String> orderCodesWithReturns = returns.stream()
                    .map(com.vmas.OrderService.entity.ReturnRequest::getOrderCode)
                    .collect(Collectors.toSet());

            // Đánh dấu cờ (flag) cho từng đơn hàng
            orders.getContent().forEach(o -> o.setHasReturnRequest(orderCodesWithReturns.contains(o.getOrderCode())));
        }

        return orders;
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getOrderStatistics() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", orderRepository.count());
        stats.put("pending", orderRepository.countByOrderStatus(OrderStatus.PENDING));
        stats.put("shipping", orderRepository.countByOrderStatus(OrderStatus.SHIPPING));
        stats.put("completed", orderRepository.countByOrderStatus(OrderStatus.DELIVERED));
        return stats;
    }

    @Transactional(readOnly = true)
    public List<RevenueStatResponse> getRevenueStatistics(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);
        LocalDateTime startDate = t.currentStart;
        LocalDateTime endDate = t.currentEnd;

        // CẬP NHẬT: Chấp nhận đơn đã PAID hoặc đã DELIVERED
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID || o.getOrderStatus() == OrderStatus.DELIVERED)
                .filter(o -> !o.getCreatedAt().isBefore(startDate) && !o.getCreatedAt().isAfter(endDate))
                .collect(Collectors.toList());

        Map<String, BigDecimal> dailyRevenue = new HashMap<>();
        Map<String, BigDecimal> dailyProfit = new HashMap<>();
        DateTimeFormatter formatter;

        boolean isSingleDay = (dateStr != null && !dateStr.trim().isEmpty()) || "today".equalsIgnoreCase(filter);
        boolean isYear = "year".equalsIgnoreCase(filter) && !isSingleDay;

        if (isSingleDay) {
            formatter = DateTimeFormatter.ofPattern("HH:00");
        } else if (isYear) {
            formatter = DateTimeFormatter.ofPattern("MM/yyyy");
        } else {
            formatter = DateTimeFormatter.ofPattern("dd/MM");
        }

        for (Order o : orders) {
            String label = o.getCreatedAt().format(formatter);

            BigDecimal currentRev = dailyRevenue.getOrDefault(label, BigDecimal.ZERO);
            dailyRevenue.put(label, currentRev.add(o.getTotalAmount()));

            BigDecimal totalCost = BigDecimal.ZERO;
            for(OrderItem item : o.getItems()) {
                BigDecimal itemCost = item.getCostPrice() != null ? item.getCostPrice() : BigDecimal.ZERO;
                totalCost = totalCost.add(itemCost.multiply(BigDecimal.valueOf(item.getQuantity())));
            }

            BigDecimal orderProfit = o.getTotalAmount().subtract(totalCost);
            BigDecimal currentProf = dailyProfit.getOrDefault(label, BigDecimal.ZERO);
            dailyProfit.put(label, currentProf.add(orderProfit));
        }

        List<RevenueStatResponse> response = new ArrayList<>();
        if (isSingleDay) {
            for (int i = 0; i <= 23; i++) {
                String label = String.format("%02d:00", i);
                response.add(RevenueStatResponse.builder()
                        .date(label)
                        .revenue(dailyRevenue.getOrDefault(label, BigDecimal.ZERO))
                        .profit(dailyProfit.getOrDefault(label, BigDecimal.ZERO))
                        .build());
            }
        } else if (isYear) {
            for (int i = 1; i <= 12; i++) {
                String label = String.format("%02d/%04d", i, startDate.getYear());
                response.add(RevenueStatResponse.builder()
                        .date(label)
                        .revenue(dailyRevenue.getOrDefault(label, BigDecimal.ZERO))
                        .profit(dailyProfit.getOrDefault(label, BigDecimal.ZERO))
                        .build());
            }
        } else {
            java.time.LocalDate curr = startDate.toLocalDate();
            java.time.LocalDate end = endDate.toLocalDate();
            while (!curr.isAfter(end)) {
                String label = curr.format(DateTimeFormatter.ofPattern("dd/MM"));
                response.add(RevenueStatResponse.builder()
                        .date(label)
                        .revenue(dailyRevenue.getOrDefault(label, BigDecimal.ZERO))
                        .profit(dailyProfit.getOrDefault(label, BigDecimal.ZERO))
                        .build());
                curr = curr.plusDays(1);
            }
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<CategoryRevenueStatResponse> getCategoryRevenueStatistics(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);
        LocalDateTime startDate = t.currentStart;
        LocalDateTime endDate = t.currentEnd;

        // CẬP NHẬT: Thống kê theo danh mục cho các đơn đã PAID hoặc DELIVERED
        List<Order> validOrders = orderRepository.findAll().stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID || o.getOrderStatus() == OrderStatus.DELIVERED)
                .filter(o -> !o.getCreatedAt().isBefore(startDate) && !o.getCreatedAt().isAfter(endDate))
                .collect(Collectors.toList());

        if (validOrders.isEmpty()) {
            return Collections.emptyList();
        }

        List<Integer> productIds = validOrders.stream()
                .flatMap(order -> order.getItems().stream())
                .map(OrderItem::getProductId)
                .distinct()
                .collect(Collectors.toList());
        List<ProductCategoryInfoResponse> categoryInfos = productServiceClient.getCategoryInfoForProducts(productIds);

        Map<Integer, String> productToCategoryMap = categoryInfos.stream()
                .collect(Collectors.toMap(ProductCategoryInfoResponse::getProductId, ProductCategoryInfoResponse::getCategoryName));

        Map<String, CategoryRevenueStatResponse> statMap = new HashMap<>();

        for (Order order : validOrders) {
            for (OrderItem item : order.getItems()) {
                String catName = productToCategoryMap.getOrDefault(item.getProductId(), "Khác");

                CategoryRevenueStatResponse stat = statMap.getOrDefault(catName,
                        CategoryRevenueStatResponse.builder()
                                .categoryName(catName)
                                .totalSold(0)
                                .totalRevenue(BigDecimal.ZERO)
                                .build());

                stat.setTotalSold(stat.getTotalSold() + item.getQuantity());
                BigDecimal itemRevenue = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                stat.setTotalRevenue(stat.getTotalRevenue().add(itemRevenue));
                statMap.put(catName, stat);
            }
        }

        return statMap.values().stream()
                .sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DashboardStatResponse getDashboardStatistics(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);

        List<Order> currentOrders = orderRepository.findAll().stream()
                .filter(o -> !o.getCreatedAt().isBefore(t.currentStart) && !o.getCreatedAt().isAfter(t.currentEnd))
                .collect(Collectors.toList());

        List<Order> prevOrders = orderRepository.findAll().stream()
                .filter(o -> !o.getCreatedAt().isBefore(t.prevStart) && !o.getCreatedAt().isAfter(t.prevEnd))
                .collect(Collectors.toList());

        long totalOrders = currentOrders.size();

        // CẬP NHẬT: Tính doanh thu thuần từ đơn PAID hoặc DELIVERED cho kỳ hiện tại
        BigDecimal netRevenue = currentOrders.stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID || o.getOrderStatus() == OrderStatus.DELIVERED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long cancelled = currentOrders.stream().filter(o -> o.getOrderStatus() == OrderStatus.CANCELLED).count();
        double cancelRate = totalOrders == 0 ? 0 : (double) cancelled / totalOrders * 100;

        long prevTotalOrders = prevOrders.size();

        // CẬP NHẬT: Tính doanh thu thuần từ đơn PAID hoặc DELIVERED cho kỳ trước
        BigDecimal prevNetRevenue = prevOrders.stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID || o.getOrderStatus() == OrderStatus.DELIVERED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long prevCancelled = prevOrders.stream().filter(o -> o.getOrderStatus() == OrderStatus.CANCELLED).count();
        double prevCancelRate = prevTotalOrders == 0 ? 0 : (double) prevCancelled / prevTotalOrders * 100;

        return DashboardStatResponse.builder()
                .totalOrders(totalOrders)
                .netRevenue(netRevenue)
                .cancelRate(Math.round(cancelRate * 100.0) / 100.0)
                .ordersGrowth(calculateGrowth(totalOrders, prevTotalOrders))
                .revenueGrowth(calculateGrowth(netRevenue.doubleValue(), prevNetRevenue.doubleValue()))
                .cancelRateGrowth(calculateGrowth(cancelRate, prevCancelRate))
                .build();
    }

    private Double calculateGrowth(double current, double prev) {
        if (prev == 0) return current > 0 ? 100.0 : 0.0;
        double growth = ((current - prev) / prev) * 100;
        return Math.round(growth * 10.0) / 10.0;
    }

    private LocalDateTime[] calculateTimeRange(Integer days, String dateStr) {
        LocalDateTime start;
        LocalDateTime end = LocalDateTime.now();

        if (dateStr != null && !dateStr.trim().isEmpty()) {
            LocalDate specificDate = LocalDate.parse(dateStr);
            start = specificDate.atStartOfDay();
            end = specificDate.atTime(23, 59, 59);
        } else {
            start = LocalDateTime.now().minusDays(days != null ? days : 30);
            if (days != null && days == 1) {
                start = LocalDate.now().atStartOfDay();
            }
        }
        return new LocalDateTime[]{start, end};
    }

    public static class TimeComparison {
        public java.time.LocalDateTime currentStart;
        public java.time.LocalDateTime currentEnd;
        public java.time.LocalDateTime prevStart;
        public java.time.LocalDateTime prevEnd;
    }

    private TimeComparison getTimeComparison(String filter, String dateStr) {
        TimeComparison t = new TimeComparison();

        if (dateStr != null && !dateStr.trim().isEmpty()) {
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            t.currentStart = date.atStartOfDay();
            t.currentEnd = date.atTime(23, 59, 59);
            t.prevStart = date.minusDays(1).atStartOfDay();
            t.prevEnd = date.minusDays(1).atTime(23, 59, 59);
            return t;
        }

        if (filter == null) filter = "month";
        java.time.LocalDate now = java.time.LocalDate.now();

        switch (filter.toLowerCase()) {
            case "today":
                t.currentStart = now.atStartOfDay();
                t.currentEnd = now.atTime(23, 59, 59);
                t.prevStart = now.minusDays(1).atStartOfDay();
                t.prevEnd = now.minusDays(1).atTime(23, 59, 59);
                break;
            case "week":
                java.time.LocalDate startOfWeek = now.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
                t.currentStart = startOfWeek.atStartOfDay();
                t.currentEnd = startOfWeek.plusDays(6).atTime(23, 59, 59);
                t.prevStart = startOfWeek.minusWeeks(1).atStartOfDay();
                t.prevEnd = startOfWeek.minusWeeks(1).plusDays(6).atTime(23, 59, 59);
                break;
            case "month":
                java.time.LocalDate startOfMonth = now.withDayOfMonth(1);
                java.time.LocalDate endOfMonth = now.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
                t.currentStart = startOfMonth.atStartOfDay();
                t.currentEnd = endOfMonth.atTime(23, 59, 59);

                java.time.LocalDate startOfPrevMonth = startOfMonth.minusMonths(1);
                java.time.LocalDate endOfPrevMonth = endOfMonth.minusMonths(1).with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
                t.prevStart = startOfPrevMonth.atStartOfDay();
                t.prevEnd = endOfPrevMonth.atTime(23, 59, 59);
                break;
            case "year":
                java.time.LocalDate startOfYear = now.withDayOfYear(1);
                java.time.LocalDate endOfYear = now.with(java.time.temporal.TemporalAdjusters.lastDayOfYear());
                t.currentStart = startOfYear.atStartOfDay();
                t.currentEnd = endOfYear.atTime(23, 59, 59);

                java.time.LocalDate startOfPrevYear = startOfYear.minusYears(1);
                java.time.LocalDate endOfPrevYear = endOfYear.minusYears(1).with(java.time.temporal.TemporalAdjusters.lastDayOfYear());
                t.prevStart = startOfPrevYear.atStartOfDay();
                t.prevEnd = endOfPrevYear.atTime(23, 59, 59);
                break;
        }
        return t;
    }

    @Transactional(readOnly = true)
    public Map<String, List<ProductStockResponse>> getInventoryReport() {
        Map<String, List<ProductStockResponse>> report = new HashMap<>();

        // Lấy top 5 sắp hết (tồn ít nhất - asc)
        report.put("lowStock", productServiceClient.getProductsByStock("asc").stream()
                .limit(5)
                .collect(Collectors.toList()));

        // Lấy top 5 tồn nhiều nhất (desc)
        report.put("highStock", productServiceClient.getProductsByStock("desc").stream()
                .limit(5)
                .collect(Collectors.toList()));

        return report;
    }

    // Sản phẩm bán chạy
    @Transactional(readOnly = true)
    public List<TopProductResponse> getTopSellingProducts(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);

        // CẬP NHẬT: Lấy top sản phẩm từ các đơn đã PAID hoặc DELIVERED
        List<Order> validOrders = orderRepository.findAll().stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID || o.getOrderStatus() == OrderStatus.DELIVERED)
                .filter(o -> !o.getCreatedAt().isBefore(t.currentStart) && !o.getCreatedAt().isAfter(t.currentEnd))
                .collect(Collectors.toList());

        Map<Integer, TopProductResponse> productMap = new HashMap<>();

        for (Order order : validOrders) {
            for (OrderItem item : order.getItems()) {
                TopProductResponse stat = productMap.getOrDefault(item.getProductId(),
                        TopProductResponse.builder()
                                .productId(item.getProductId())
                                .productName(item.getProductName())
                                .thumbnail(item.getProductThumbnail())
                                .totalQuantity(0)
                                .totalRevenue(BigDecimal.ZERO)
                                .build());

                stat.setTotalQuantity(stat.getTotalQuantity() + item.getQuantity());
                BigDecimal itemRev = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                stat.setTotalRevenue(stat.getTotalRevenue().add(itemRev));

                productMap.put(item.getProductId(), stat);
            }
        }

        return productMap.values().stream()
                .sorted((a, b) -> b.getTotalQuantity().compareTo(a.getTotalQuantity()))
                .limit(5)
                .collect(Collectors.toList());
    }

 // Xử lý khi thanh toán PayOS thất bại hoặc khách hủy thanh toán
    @Transactional
    public void handleFailedPayment(String orderCode) {
        Order order = getOrderByCode(orderCode);
                 
        // Chỉ xử lý nếu trạng thái chưa phải là CANCELLED
        if (order.getOrderStatus() != OrderStatus.CANCELLED) {
            order.setOrderStatus(OrderStatus.CANCELLED);
            order.setPaymentStatus(PaymentStatus.FAILED);
                         
            Order savedOrder = orderRepository.save(order);
                         
            List<StockUpdateRequest> stockRequests = savedOrder.getItems().stream()
                    .map(item -> new StockUpdateRequest(item.getProductId(), item.getQuantity()))
                    .collect(Collectors.toList());
            try {
                // 1. Hoàn tồn kho và giảm số lượng đã bán trong ProductService
                productServiceClient.increaseStock(stockRequests);
                productServiceClient.decreaseSold(stockRequests); 

                // 2. HOÀN LƯỢT MUA FLASH SALE (Bổ sung mới)
                if (savedOrder.getUserId() != null) {
                    for (OrderItem item : savedOrder.getItems()) {
                    	if (Boolean.TRUE.equals(item.getIsFlashSale())) {
                            flashSaleClient.cancelFlashSaleClaim(order.getUserId(), item.getProductId());
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi khi hoàn kho hoặc hoàn lượt Flash Sale: " + e.getMessage());
            }
        }
    }
         
    // Xử lý khi Admin xóa đơn hàng vĩnh viễn
    @Transactional
    public void deleteOrderByCode(String orderCode) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng mã: " + orderCode));
        
        List<StockUpdateRequest> stockRequests = order.getItems().stream()
                .map(item -> new StockUpdateRequest(item.getProductId(), item.getQuantity()))
                .collect(Collectors.toList());
        try {
            // 1. Hoàn tồn kho và giảm số lượng đã bán trong ProductService (Bổ sung decreaseSold)
            productServiceClient.increaseStock(stockRequests);
            productServiceClient.decreaseSold(stockRequests);

            // 2. HOÀN LƯỢT MUA FLASH SALE (Bổ sung mới)
            if (order.getUserId() != null) {
                for (OrderItem item : order.getItems()) {
                	if (Boolean.TRUE.equals(item.getIsFlashSale())) {
                        flashSaleClient.cancelFlashSaleClaim(order.getUserId(), item.getProductId());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi hoàn kho và Flash Sale khi xóa đơn: " + e.getMessage());
        }
        
        // Cuối cùng, xóa đơn hàng khỏi Database
        orderRepository.delete(order);
    }
    
    @Transactional
    public Order confirmRefund(String orderCode) {
        Order order = getOrderByCode(orderCode);

        // Chỉ cho phép hoàn tiền nếu đơn hàng đang ở trạng thái CHỜ HOÀN TIỀN
        if (order.getPaymentStatus() != PaymentStatus.REFUND_PENDING) {
            throw new RuntimeException("Lỗi: Đơn hàng này không ở trạng thái chờ hoàn tiền!");
        }

        // Đổi trạng thái thanh toán thành ĐÃ HOÀN TIỀN
        order.setPaymentStatus(PaymentStatus.REFUNDED);
        
        return orderRepository.save(order);
    }
    
    @Transactional
    public com.vmas.OrderService.entity.ReturnRequest createReturnRequest(String orderCode, Integer productId, String reason, List<org.springframework.web.multipart.MultipartFile> files) {
        // 1. Lấy thông tin đơn hàng
        Order order = getOrderByCode(orderCode);

        // 2. Kiểm tra trạng thái đơn hàng
        if (order.getOrderStatus() != OrderStatus.DELIVERED) {
            throw new RuntimeException("Lỗi: Chỉ yêu cầu trả hàng cho đơn đã giao thành công!");
        }

        // 3. Quy tắc 7 ngày
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(order.getUpdatedAt(), LocalDateTime.now());
        if (daysBetween > 7) {
            throw new RuntimeException("Lỗi: Đã quá hạn 7 ngày yêu cầu trả hàng/hoàn tiền!");
        }

        // 4. Quy tắc 1 lần
        if (returnRequestRepository.existsByOrderCodeAndProductId(orderCode, productId)) {
            throw new RuntimeException("Lỗi: Bạn đã gửi yêu cầu trả hàng cho sản phẩm này rồi!");
        }

        // 5. XỬ LÝ LƯU NHIỀU ẢNH
        List<String> imageUrls = new ArrayList<>();

        if (files != null && !files.isEmpty()) {
            try {
                String uploadDir = "uploads/returns/";
                java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir);
                if (!java.nio.file.Files.exists(uploadPath)) {
                    java.nio.file.Files.createDirectories(uploadPath);
                }

                // Duyệt qua từng file được gửi lên
                for (org.springframework.web.multipart.MultipartFile file : files) {
                    if (file != null && !file.isEmpty()) {
                        String fileName = java.util.UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                        java.nio.file.Path filePath = uploadPath.resolve(fileName);
                        java.nio.file.Files.copy(file.getInputStream(), filePath);

                        // Thêm URL của ảnh vừa lưu vào danh sách
                        imageUrls.add("http://localhost:8084/uploads/returns/" + fileName);
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi lưu file ảnh trả hàng: " + e.getMessage());
            }
        }

        // Nối các URL lại với nhau bằng dấu phẩy
        String joinedImages = String.join(",", imageUrls);

        // 6. Khởi tạo và lưu vào Database
        com.vmas.OrderService.entity.ReturnRequest request = com.vmas.OrderService.entity.ReturnRequest.builder()
                .orderCode(orderCode)
                .productId(productId)
                .reason(reason)
                .evidenceImages(joinedImages.isEmpty() ? null : joinedImages) // SỬA: Đổi tên biến
                .status(com.vmas.OrderService.enums.ReturnRequestStatus.PENDING)
                .build();

        return returnRequestRepository.save(request);
    }
    
    @Transactional(readOnly = true)
    public List<com.vmas.OrderService.entity.ReturnRequest> getReturnRequestsByOrder(String orderCode) {
        return returnRequestRepository.findByOrderCode(orderCode);
    }
    
    @Transactional
    public com.vmas.OrderService.entity.ReturnRequest updateReturnRequestStatus(Integer requestId, com.vmas.OrderService.enums.ReturnRequestStatus newStatus) {
        com.vmas.OrderService.entity.ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu trả hàng!"));

        // Chỉ cho phép xử lý khi yêu cầu đang ở trạng thái PENDING
        if (request.getStatus() != com.vmas.OrderService.enums.ReturnRequestStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể xử lý yêu cầu đang ở trạng thái chờ duyệt!");
        }

        request.setStatus(newStatus);
        
        // LƯU Ý: Nếu newStatus là APPROVED, bạn có thể gọi thêm logic hoàn tiền qua PayOS 
        // hoặc cập nhật trạng thái đơn hàng (OrderStatus) ở đây nếu cần thiết.

        return returnRequestRepository.save(request);
    }
    
    @Transactional(readOnly = true)
    public List<com.vmas.OrderService.entity.ReturnRequest> getUserReturnRequests(Integer userId) {
        List<Order> userOrders = getOrdersByUser(userId);
        if (userOrders.isEmpty()) return Collections.emptyList();
        
        // Lấy ra tất cả mã đơn hàng của User này
        List<String> orderCodes = userOrders.stream()
                .map(Order::getOrderCode)
                .collect(Collectors.toList());
        
        return returnRequestRepository.findByOrderCodeIn(orderCodes);
    }
 // Hàm phụ trợ: Quy đổi tên hạng thành trọng số (số nguyên) để dễ so sánh
    private int getTierWeight(String tier) {
        if (tier == null || tier.trim().isEmpty()) {
            return -1; // Khách vãng lai hoặc chưa có dữ liệu hạng
        }
        
        switch (tier.trim().toUpperCase()) {
            case "ELITE":
                return 3;
            case "GOLD":
                return 2;
            case "SILVER":
                return 1;
            case "BASIC":
                return 0;
            default:
                return -1;
        }
    }
    
 // Thêm hàm này vào trong class OrderService
    @Transactional(readOnly = true)
    public BigDecimal getTotalSpendingByUserId(Integer userId) {
        // Lấy tất cả đơn hàng của user
        List<Order> userOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        // Lọc các đơn thành công và tính tổng
        return userOrders.stream()
                .filter(o -> o.getPaymentStatus() == PaymentStatus.PAID || o.getOrderStatus() == OrderStatus.DELIVERED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}