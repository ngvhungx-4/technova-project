package com.vmas.FlashSaleService.service;

import com.vmas.FlashSaleService.dto.FlashSaleItemDto;
import com.vmas.FlashSaleService.dto.FlashSaleResponse;
import com.vmas.FlashSaleService.dto.ProductDto;
import com.vmas.FlashSaleService.entity.FlashSale;
import com.vmas.FlashSaleService.entity.FlashSaleItem;
import com.vmas.FlashSaleService.repository.FlashSaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.ZoneId; // THÊM DÒNG NÀY
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.vmas.FlashSaleService.entity.FlashSalePurchase;
import com.vmas.FlashSaleService.repository.FlashSaleItemRepository;
import com.vmas.FlashSaleService.repository.FlashSalePurchaseRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FlashSaleService {
    private final FlashSaleRepository flashSaleRepository;
    private final FlashSaleItemRepository flashSaleItemRepository;
    private final FlashSalePurchaseRepository flashSalePurchaseRepository;
    private final RestTemplate restTemplate;
    
    private final String PRODUCT_SERVICE_URL = "http://localhost:8082/api/products/";

    public FlashSaleResponse getActiveFlashSale() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
 
        Optional<FlashSale> activeSaleOpt = flashSaleRepository.findActiveFlashSale(now);
        
        if (activeSaleOpt.isEmpty()) {
            return null; // Không có chiến dịch nào thỏa mãn
        }

        FlashSale flashSale = activeSaleOpt.get();
        List<FlashSaleItemDto> itemDtos = new ArrayList<>();

        // 2. Duyệt qua từng sản phẩm trong đợt sale
        for (FlashSaleItem item : flashSale.getItems()) {
            try {
                // 3. Gọi sang ProductService 
                ProductDto product = restTemplate.getForObject(PRODUCT_SERVICE_URL + item.getProductId(), ProductDto.class);
                
                if (product != null) {
                    // 4. Ghép vào thành 1 mảng hoàn chỉnh
                    FlashSaleItemDto dto = FlashSaleItemDto.builder()
                            .productId(product.getId())
                            .productName(product.getName())
                            .thumbnail(product.getThumbnail())
                            .originalPrice(product.getSalePrice()) 
                            .flashSalePrice(item.getFlashSalePrice()) 
                            .allocatedQuantity(item.getAllocatedQuantity())
                            .soldQuantity(item.getSoldQuantity())
                            .build();
                    itemDtos.add(dto);
                }
            } catch (Exception e) {
                System.err.println("Không thấy thông tin sản phẩm ID: " + item.getProductId());
            }
        }

        // 5. Đóng gói trả về
        return FlashSaleResponse.builder()
                .flashSaleId(flashSale.getId())
                .name(flashSale.getName())
                .startTime(flashSale.getStartTime())
                .endTime(flashSale.getEndTime())
                .items(itemDtos)
                .build();
    }
    
    @Transactional
    public boolean claimFlashSaleItem(Integer userId, Integer flashSaleItemId) {
        if (userId == null || userId == 0) {
            throw new RuntimeException("Bạn cần đăng nhập để tham gia Flash Sale!");
        }

        // 1. Tìm sản phẩm Flash Sale
        FlashSaleItem item = flashSaleItemRepository.findById(flashSaleItemId)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không nằm trong chương trình Flash Sale."));

        // 2. Kiểm tra chương trình còn hiệu lực không
        FlashSale flashSale = item.getFlashSale();
        LocalDateTime now = LocalDateTime.now();
        if (!flashSale.getIsActive() || now.isBefore(flashSale.getStartTime()) || now.isAfter(flashSale.getEndTime())) {
            throw new RuntimeException("Chương trình Flash Sale đã kết thúc hoặc chưa bắt đầu.");
        }

        // 3. Kiểm tra số lượng tồn kho của đợt Sale
        if (item.getSoldQuantity() >= item.getAllocatedQuantity()) {
            throw new RuntimeException("Sản phẩm Flash Sale đã bán hết.");
        }

        // 4. KIỂM TRA QUY TRÌNH "1 NGƯỜI - 1 LƯỢT"
        boolean alreadyBought = flashSalePurchaseRepository.existsByUserIdAndFlashSaleItemId(userId, flashSaleItemId);
        if (alreadyBought) {
            throw new RuntimeException("Bạn đã hết lượt mua sản phẩm này trong đợt Flash Sale hiện tại.");
        }

        // 5. Nếu vượt qua mọi bài kiểm tra: Trừ kho và Ghi nhận lịch sử
        item.setSoldQuantity(item.getSoldQuantity() + 1);
        flashSaleItemRepository.save(item);

        FlashSalePurchase purchase = FlashSalePurchase.builder()
                .userId(userId)
                .flashSaleItem(item)
                .build();
        flashSalePurchaseRepository.save(purchase);

        return true; // Claim thành công
    }
    
 // ==========================================
    // MỚI THÊM: HÀM HOÀN LẠI LƯỢT MUA KHI HỦY ĐƠN
    // ==========================================
    @Transactional
    public void cancelFlashSaleClaim(Integer userId, Integer productId) {
        if (userId == null || productId == null) return;

        // 1. Tìm lịch sử mua Flash Sale của user với sản phẩm này
        Optional<FlashSalePurchase> purchaseOpt = flashSalePurchaseRepository.findByUserIdAndProductId(userId, productId);
        
        if (purchaseOpt.isPresent()) {
            FlashSalePurchase purchase = purchaseOpt.get();
            FlashSaleItem item = purchase.getFlashSaleItem();

            // 2. Xóa lịch sử mua để người dùng có thể mua lại
            flashSalePurchaseRepository.delete(purchase);

            // 3. Hoàn lại số lượng đã bán (soldQuantity) cho chương trình Flash Sale
            if (item.getSoldQuantity() > 0) {
                item.setSoldQuantity(item.getSoldQuantity() - 1);
                flashSaleItemRepository.save(item);
            }
            System.out.println("Đã hoàn lại lượt mua Flash Sale cho User: " + userId + " | Product: " + productId);
        }
    }
    
 // ==========================================
    // CẬP NHẬT: HÀM CHỐT LƯỢT MUA DỰA TRÊN PRODUCT ID
    // ==========================================
    @Transactional
    public boolean claimFlashSaleItemByProductId(Integer userId, Integer productId) {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        
        // 1. Tìm chương trình Flash Sale đang hoạt động
        Optional<FlashSale> activeSaleOpt = flashSaleRepository.findActiveFlashSale(now);
        if (activeSaleOpt.isEmpty()) {
            return false; // Không có đợt Flash Sale nào đang diễn ra, trả về false để bỏ qua
        }
            
        // 2. Tìm sản phẩm trong chương trình đó
        FlashSaleItem item = activeSaleOpt.get().getItems().stream()
            .filter(i -> i.getProductId().equals(productId))
            .findFirst()
            .orElse(null);
            
        if (item == null) {
            return false; // Sản phẩm này không nằm trong đợt Flash Sale, trả về false
        }
            
        // 3. Nếu ĐÚNG là sản phẩm Flash Sale, tái sử dụng hàm để tăng số lượng và lưu lịch sử
        // Hàm này sẽ tự động ném lỗi nếu quá giới hạn (hết hàng, hết lượt)
        return claimFlashSaleItem(userId, item.getId());
    }
    
    public boolean hasUserPurchasedProductInActiveFlashSale(Integer userId, Integer productId) {
        if (userId == null) return false;
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        
        // 1. Tìm chương trình Flash Sale đang diễn ra
        java.util.Optional<FlashSale> activeSale = flashSaleRepository.findActiveFlashSale(now);
        if (activeSale.isEmpty()) return false;

        // 2. Kiểm tra xem sản phẩm có trong đợt sale này không và user đã mua chưa
        for (FlashSaleItem item : activeSale.get().getItems()) {
            if (item.getProductId().equals(productId)) {
                return flashSalePurchaseRepository.existsByUserIdAndFlashSaleItemId(userId, item.getId());
            }
        }
        return false;
    }
    
    @Transactional
    public FlashSale createFlashSale(com.vmas.FlashSaleService.dto.FlashSaleCreateRequest request) {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        // 1. Kiểm tra ngày quá khứ (Double check ở Backend cho an toàn)
        if (request.getStartTime().isBefore(now)) {
            throw new RuntimeException("Thời gian bắt đầu không được ở trong quá khứ.");
        }

        // 2. Kiểm tra giờ kết thúc phải sau giờ bắt đầu
        if (request.getStartTime().isAfter(request.getEndTime()) || request.getStartTime().isEqual(request.getEndTime())) {
            throw new RuntimeException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        }

        // 3. KIỂM TRA TRÙNG LẶP KHUNG GIỜ VỚI CƠ SỞ DỮ LIỆU
        if (flashSaleRepository.existsOverlappingCampaign(request.getStartTime(), request.getEndTime())) {
            throw new RuntimeException("Khung giờ này bị trùng lặp với một chiến dịch Flash Sale khác đang hoạt động.");
        }

        FlashSale flashSale = FlashSale.builder()
                .name(request.getName())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .isActive(true)
                .build();
                
        List<FlashSaleItem> items = request.getItems().stream().map(req -> 
             FlashSaleItem.builder()
                .flashSale(flashSale)
                .productId(req.getProductId())
                .flashSalePrice(req.getFlashSalePrice())
                .allocatedQuantity(req.getAllocatedQuantity())
                .soldQuantity(0)
                .build()
        ).collect(java.util.stream.Collectors.toList());
                
        flashSale.setItems(items);
        return flashSaleRepository.save(flashSale);
    }
    
 // ==========================================
    // API LẤY THỐNG KÊ DASHBOARD QUẢN LÝ
    // ==========================================
    public com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse getTodayDashboard() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        
        // 1. Lấy tất cả chiến dịch (có thể dùng Query thay thế nếu Data lớn)
        List<FlashSale> allSales = flashSaleRepository.findAll();
        
        // 2. Lọc các chiến dịch có ngày bắt đầu rơi vào hôm nay
        List<FlashSale> todaySales = allSales.stream()
            .filter(f -> f.getStartTime().toLocalDate().equals(now.toLocalDate()))
            .sorted(java.util.Comparator.comparing(FlashSale::getStartTime))
            .collect(java.util.stream.Collectors.toList());
            
        com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse.ActiveCampaignDto activeDto = null;
        List<com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse.ScheduleDto> scheduleDtos = new java.util.ArrayList<>();
        
        for (FlashSale sale : todaySales) {
            String status = "UPCOMING";
            if (now.isAfter(sale.getEndTime())) {
                status = "ENDED";
            } else if (now.isAfter(sale.getStartTime()) && now.isBefore(sale.getEndTime())) {
                status = "ACTIVE";
            }
            
            // Format khung giờ (VD: 09:00 - 12:00)
            String timeRange = String.format("%02d:%02d - %02d:%02d", 
                sale.getStartTime().getHour(), sale.getStartTime().getMinute(),
                sale.getEndTime().getHour(), sale.getEndTime().getMinute());
                
            scheduleDtos.add(com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse.ScheduleDto.builder()
                .id(sale.getId())
                .name(sale.getName())
                .timeRange(timeRange)
                .status(status)
                .productCount(sale.getItems().size())
                .build());
                
            // Nếu có ca đang chạy, trích xuất dữ liệu làm Hero Banner
            if ("ACTIVE".equals(status) && activeDto == null) {
                // Tính toán doanh thu tạm tính: Giá Sale * Số lượng đã bán
                java.math.BigDecimal revenue = java.math.BigDecimal.ZERO;
                for (FlashSaleItem item : sale.getItems()) {
                    revenue = revenue.add(item.getFlashSalePrice().multiply(new java.math.BigDecimal(item.getSoldQuantity())));
                }
                
                // Tính toán thời gian còn lại (đếm ngược)
                java.time.Duration duration = java.time.Duration.between(now, sale.getEndTime());
                long s = duration.getSeconds();
                String timeLeft = String.format("%02d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60);
                
                activeDto = com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse.ActiveCampaignDto.builder()
                    .id(sale.getId())
                    .name(sale.getName())
                    .timeLeft(timeLeft)
                    .totalProducts(sale.getItems().size())
                    .estimatedRevenue(revenue)
                    .build();
            }
        }
        
        return com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse.builder()
            .activeCampaign(activeDto)
            .schedules(scheduleDtos)
            .build();
    }

    // ==========================================
    // API LẤY SẢN PHẨM TRONG 1 KHUNG GIỜ
    // ==========================================
    public List<com.vmas.FlashSaleService.dto.FlashSaleScheduleProductDto> getProductsBySchedule(Integer scheduleId) {
        FlashSale sale = flashSaleRepository.findById(scheduleId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy chiến dịch"));
            
        List<com.vmas.FlashSaleService.dto.FlashSaleScheduleProductDto> result = new java.util.ArrayList<>();
        
        for (FlashSaleItem item : sale.getItems()) {
             try {
                // Giao tiếp với ProductService để lấy thông tin Tên, Hình ảnh, Giá gốc
                ProductDto product = restTemplate.getForObject(PRODUCT_SERVICE_URL + item.getProductId(), ProductDto.class);
                if (product != null) {
                    result.add(com.vmas.FlashSaleService.dto.FlashSaleScheduleProductDto.builder()
                        .productId(product.getId())
                        .name(product.getName())
                        .thumbnail(product.getThumbnail())
                        .originalPrice(product.getSalePrice()) // Lấy giá gốc từ Product Service
                        .flashSalePrice(item.getFlashSalePrice()) // Lấy giá giảm từ Flash Sale
                        .sold(item.getSoldQuantity())
                        .stock(item.getAllocatedQuantity())
                        .build());
                }
             } catch (Exception e) {
                System.err.println("Lỗi đồng bộ sản phẩm (ID: " + item.getProductId() + "): " + e.getMessage());
             }
        }
        return result;
    }
 // ==========================================
    // MỚI THÊM: HÀM CẬP NHẬT CHIẾN DỊCH FLASH SALE
    // ==========================================
    @Transactional
    public FlashSale updateFlashSale(Integer id, com.vmas.FlashSaleService.dto.FlashSaleCreateRequest request) {
        FlashSale flashSale = flashSaleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chiến dịch Flash Sale."));

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        // 1. Kiểm tra: Không cho phép sửa chiến dịch đã kết thúc
        if (flashSale.getEndTime().isBefore(now)) {
            throw new RuntimeException("Không thể sửa chiến dịch đã kết thúc.");
        }

        if (request.getStartTime().isAfter(request.getEndTime()) || request.getStartTime().isEqual(request.getEndTime())) {
            throw new RuntimeException("Thời gian kết thúc phải sau thời gian bắt đầu.");
        }

        // 2. Kiểm tra trùng lặp khung giờ (Trừ chính chiến dịch này ra)
        if (flashSaleRepository.existsOverlappingCampaignExcludingId(request.getStartTime(), request.getEndTime(), id)) {
            throw new RuntimeException("Khung giờ này bị trùng lặp với một chiến dịch Flash Sale khác.");
        }

        // 3. Cập nhật thông tin cơ bản
        flashSale.setName(request.getName());
        flashSale.setStartTime(request.getStartTime());
        flashSale.setEndTime(request.getEndTime());

        // 4. Xử lý danh sách sản phẩm: Giữ lại số lượng đã bán nếu sản phẩm cũ vẫn tồn tại
        List<FlashSaleItem> existingItems = flashSale.getItems();
        List<FlashSaleItem> updatedItems = new ArrayList<>();
        List<FlashSaleItem> itemsToDelete = new ArrayList<>(existingItems); // Chứa các item sẽ bị xóa

        for (com.vmas.FlashSaleService.dto.FlashSaleItemCreateRequest reqItem : request.getItems()) {
            // Tìm xem sản phẩm này đã có trong chiến dịch cũ chưa
            Optional<FlashSaleItem> oldItemOpt = existingItems.stream()
                    .filter(i -> i.getProductId().equals(reqItem.getProductId()))
                    .findFirst();

            if (oldItemOpt.isPresent()) {
                // NẾU ĐÃ CÓ: Cập nhật giá và slot, giữ nguyên số đã bán
                FlashSaleItem oldItem = oldItemOpt.get();
                
                if (reqItem.getAllocatedQuantity() < oldItem.getSoldQuantity()) {
                    throw new RuntimeException("Số Slot cấp phát cho sản phẩm ID " + reqItem.getProductId() + " không được nhỏ hơn số lượng đã bán (" + oldItem.getSoldQuantity() + ").");
                }
                
                oldItem.setFlashSalePrice(reqItem.getFlashSalePrice());
                oldItem.setAllocatedQuantity(reqItem.getAllocatedQuantity());
                
                updatedItems.add(oldItem);
                itemsToDelete.remove(oldItem); // Bỏ ra khỏi danh sách xóa
            } else {
                // NẾU LÀ SẢN PHẨM MỚI: Thêm mới hoàn toàn
                updatedItems.add(FlashSaleItem.builder()
                        .flashSale(flashSale)
                        .productId(reqItem.getProductId())
                        .flashSalePrice(reqItem.getFlashSalePrice())
                        .allocatedQuantity(reqItem.getAllocatedQuantity())
                        .soldQuantity(0)
                        .build());
            }
        }

        // 5. Xóa các sản phẩm cũ bị người dùng loại bỏ khỏi chiến dịch
        if (!itemsToDelete.isEmpty()) {
            flashSaleItemRepository.deleteAll(itemsToDelete);
        }

        // 6. Cập nhật lại danh sách và lưu
        existingItems.clear();
        existingItems.addAll(updatedItems);

        return flashSaleRepository.save(flashSale);
    }
    @Transactional
    public void deleteFlashSale(Integer id) {
        FlashSale flashSale = flashSaleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chiến dịch Flash Sale."));

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        // Chỉ cho phép xóa khi chiến dịch chưa diễn ra (UPCOMING)
        if (!now.isBefore(flashSale.getStartTime())) {
            throw new RuntimeException("Chỉ có thể xóa các chiến dịch sắp diễn ra.");
        }

        flashSaleRepository.delete(flashSale);
    }
    
 // ==========================================
    // MỚI THÊM: API LẤY LỊCH TRÌNH FLASH SALE TRONG NGÀY (PUBLIC)
    // ==========================================
    public List<com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse.ScheduleDto> getTodayPublicSchedules() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        
        // 1. Lấy tất cả chiến dịch
        List<FlashSale> allSales = flashSaleRepository.findAll();
        
        // 2. Lọc các chiến dịch của ngày hôm nay và sắp xếp theo thời gian bắt đầu
        List<FlashSale> todaySales = allSales.stream()
            .filter(f -> f.getStartTime().toLocalDate().equals(now.toLocalDate()))
            .sorted(java.util.Comparator.comparing(FlashSale::getStartTime))
            .collect(java.util.stream.Collectors.toList());
            
        List<com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse.ScheduleDto> scheduleDtos = new java.util.ArrayList<>();
        
        // 3. Đóng gói dữ liệu để trả về
        for (FlashSale sale : todaySales) {
            String status = "UPCOMING";
            if (now.isAfter(sale.getEndTime())) {
                status = "ENDED";
            } else if (now.isAfter(sale.getStartTime()) && now.isBefore(sale.getEndTime())) {
                status = "ACTIVE";
            }
            
            // Định dạng chuỗi giờ (VD: 09:00 - 12:00)
            String timeRange = String.format("%02d:%02d - %02d:%02d", 
                sale.getStartTime().getHour(), sale.getStartTime().getMinute(),
                sale.getEndTime().getHour(), sale.getEndTime().getMinute());
                
            scheduleDtos.add(com.vmas.FlashSaleService.dto.FlashSaleDashboardResponse.ScheduleDto.builder()
                .id(sale.getId())
                .name(sale.getName())
                .timeRange(timeRange)
                .status(status)
                .build());
        }
        
        return scheduleDtos;
    }
 // ==========================================
    // MỚI THÊM: HÀM KIỂM TRA SẢN PHẨM CÒN SUẤT FLASH SALE KHÔNG
    // ==========================================
    public boolean isFlashSaleSoldOut(Integer productId) {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        java.util.Optional<FlashSale> activeSale = flashSaleRepository.findActiveFlashSale(now);
        
        // Nếu không có Flash Sale nào, mặc định là "hết suất" (để mua giá thường)
        if (activeSale.isEmpty()) return true;

        for (FlashSaleItem item : activeSale.get().getItems()) {
            if (item.getProductId().equals(productId)) {
                return item.getSoldQuantity() >= item.getAllocatedQuantity();
            }
        }
        return true; // Sản phẩm không nằm trong Flash Sale
    }
}