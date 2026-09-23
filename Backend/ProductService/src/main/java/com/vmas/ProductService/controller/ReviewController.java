package com.vmas.ProductService.controller;

import com.vmas.ProductService.dto.ReviewRequest;
import com.vmas.ProductService.entity.Review;
import com.vmas.ProductService.service.ReviewService;
import com.vmas.ProductService.util.JwtUtil;
import lombok.RequiredArgsConstructor;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;

    // 1. GỘP CHUNG API ĐÁNH GIÁ CHO CẢ USER ĐĂNG NHẬP VÀ KHÁCH VÃNG LAI
    @PostMapping("/{productId}/reviews")
    public ResponseEntity<?> createReview(
            @RequestHeader("Authorization") String token,
            @PathVariable("productId") Integer productId,
            @RequestBody ReviewRequest request) {
        try {
            // Làm sạch token
            String cleanToken = token.replace("Bearer ", "");
            
            // Cố gắng lấy userId (nếu là user đã đăng nhập)
            Integer userId = jwtUtil.extractUserId(cleanToken);
            
            // Nếu userId = null, hệ thống tự động hiểu đây là Khách vãng lai
            if (userId == null) {
                Integer orderId = jwtUtil.extractOrderId(cleanToken);
                
                // Kiểm tra tính hợp lệ của Token từ email
                if (orderId == null || !orderId.equals(request.getOrderId())) {
                    throw new RuntimeException("Đường dẫn đánh giá không hợp lệ hoặc đã hết hạn!");
                }
                
                userId = 0; // Áp dụng quy ước thông minh của bạn: Khách vãng lai = 0
                
                if (request.getReviewerName() == null || request.getReviewerName().trim().isEmpty()) {
                    request.setReviewerName("Khách hàng ẩn danh");
                }
            }
            
            Review savedReview = reviewService.addReview(userId, productId, request);
            return ResponseEntity.ok(savedReview);
            
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 2. LẤY DANH SÁCH ĐÁNH GIÁ CỦA SẢN PHẨM
    @GetMapping("/{productId}/reviews")
    public ResponseEntity<List<Review>> getProductReviews(@PathVariable("productId") Integer productId) {
        return ResponseEntity.ok(reviewService.getProductReviews(productId)); 
    }
    
    // 3. LẤY NHỮNG SẢN PHẨM ĐÃ ĐÁNH GIÁ (DÀNH CHO USER)
    @GetMapping("/reviews/my-reviewed-items")
    public ResponseEntity<?> getMyReviewedItems(@RequestHeader("Authorization") String token) {
        try {
            Integer userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
            
            // Bảo mật: Nếu khách vãng lai gọi nhầm API này, chặn không cho lấy dữ liệu
            if (userId == null || userId == 0) {
                return ResponseEntity.ok(Collections.emptyList());
            }
            
            List<String> reviewedItems = reviewService.getReviewedItemsByUser(userId);
            return ResponseEntity.ok(reviewedItems);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi lấy danh sách đánh giá: " + e.getMessage());
        }
    }
    
    // 4. ĐỒNG BỘ THÔNG TIN USER
    @PutMapping("/reviews/sync")
    public ResponseEntity<?> syncUserReviews(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> payload) {
        try {
            Integer userId = jwtUtil.extractUserId(token.replace("Bearer ", ""));
            if (userId != null && userId > 0) {
                String newName = payload.get("fullName");
                String newAvatar = payload.get("avatar");
                reviewService.syncUserInfo(userId, newName, newAvatar);
            }
            return ResponseEntity.ok("Đồng bộ thành công!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi đồng bộ: " + e.getMessage());
        }
    }
}