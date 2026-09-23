package com.vmas.FlashSaleService.controller;

import com.vmas.FlashSaleService.dto.FlashSaleResponse;
import com.vmas.FlashSaleService.service.FlashSaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/flash-sales")
@RequiredArgsConstructor
public class FlashSaleController {

    private final FlashSaleService flashSaleService; // Đã đổi từ Repository sang Service

    @GetMapping("/public/active")
    public ResponseEntity<?> getActiveFlashSale() {
        FlashSaleResponse response = flashSaleService.getActiveFlashSale();
        
        if (response != null) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.ok().body("Hiện không có chương trình Flash Sale nào diễn ra.");
        }
    }
    
    @PostMapping("/internal/claim")
    public ResponseEntity<?> claimItem(
            @RequestParam("userId") Integer userId, 
            @RequestParam("flashSaleItemId") Integer flashSaleItemId) {
        try {
            boolean success = flashSaleService.claimFlashSaleItem(userId, flashSaleItemId);
            return ResponseEntity.ok(success);
        } catch (RuntimeException e) {
            // Trả về lỗi 400 kèm câu thông báo chi tiết
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PostMapping("/internal/cancel-claim")
    public ResponseEntity<?> cancelClaim(
            @RequestParam("userId") Integer userId, 
            @RequestParam("productId") Integer productId) {
        try {
            flashSaleService.cancelFlashSaleClaim(userId, productId);
            return ResponseEntity.ok("Đã hoàn lại lượt mua Flash Sale thành công.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi khi hoàn lượt Flash Sale: " + e.getMessage());
        }
    }
    
    @PostMapping("/internal/claim-by-product")
    public ResponseEntity<?> claimItemByProductId(
            @RequestParam("userId") Integer userId, 
            @RequestParam("productId") Integer productId) {
        try {
            boolean success = flashSaleService.claimFlashSaleItemByProductId(userId, productId);
            return ResponseEntity.ok(success);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @GetMapping("/internal/check-purchased")
    public ResponseEntity<Boolean> checkPurchased(
            @RequestParam("userId") Integer userId,
            @RequestParam("productId") Integer productId) {
        return ResponseEntity.ok(flashSaleService.hasUserPurchasedProductInActiveFlashSale(userId, productId));
    }
    
    @PostMapping("/admin/create")
    public ResponseEntity<?> createFlashSale(@RequestBody com.vmas.FlashSaleService.dto.FlashSaleCreateRequest request) {
        try {
            return ResponseEntity.ok(flashSaleService.createFlashSale(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi khi tạo chiến dịch: " + e.getMessage());
        }
    }
    
 // Thêm các API này vào bên trong class FlashSaleController

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/dashboard/today")
    public ResponseEntity<?> getTodayDashboard() {
        try {
            return ResponseEntity.ok(flashSaleService.getTodayDashboard());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi lấy dữ liệu dashboard: " + e.getMessage());
        }
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/schedules/{id}/products")
    public ResponseEntity<?> getProductsBySchedule(@PathVariable("id") Integer id) {
        try {
            return ResponseEntity.ok(flashSaleService.getProductsBySchedule(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi lấy danh sách sản phẩm: " + e.getMessage());
        }
    }
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @org.springframework.web.bind.annotation.PutMapping("/admin/update/{id}")
    public ResponseEntity<?> updateFlashSale(
            @org.springframework.web.bind.annotation.PathVariable("id") Integer id, 
            @RequestBody com.vmas.FlashSaleService.dto.FlashSaleCreateRequest request) {
        try {
            return ResponseEntity.ok(flashSaleService.updateFlashSale(id, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi khi cập nhật chiến dịch: " + e.getMessage());
        }
    }
    
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @org.springframework.web.bind.annotation.DeleteMapping("/admin/delete/{id}")
    public ResponseEntity<?> deleteFlashSale(@org.springframework.web.bind.annotation.PathVariable("id") Integer id) {
        try {
            flashSaleService.deleteFlashSale(id);
            return ResponseEntity.ok("Xóa chiến dịch thành công.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi khi xóa chiến dịch: " + e.getMessage());
        }
    }
    
    @GetMapping("/public/today")
    public ResponseEntity<?> getTodaySchedules() {
        try {
            return ResponseEntity.ok(flashSaleService.getTodayPublicSchedules());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi lấy danh sách khung giờ: " + e.getMessage());
        }
    }
    
    @GetMapping("/public/schedules/{id}/products")
    public ResponseEntity<?> getPublicProductsBySchedule(@PathVariable("id") Integer id) {
        try {
            // Tái sử dụng lại logic đã có sẵn trong Service
            return ResponseEntity.ok(flashSaleService.getProductsBySchedule(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi lấy danh sách sản phẩm: " + e.getMessage());
        }
    }
    @GetMapping("/internal/check-sold-out")
    public ResponseEntity<Boolean> checkSoldOut(@RequestParam("productId") Integer productId) {
        return ResponseEntity.ok(flashSaleService.isFlashSaleSoldOut(productId));
    }
}