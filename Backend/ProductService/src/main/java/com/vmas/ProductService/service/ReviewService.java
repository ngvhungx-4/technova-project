package com.vmas.ProductService.service;

import com.vmas.ProductService.dto.ReviewRequest;
import com.vmas.ProductService.entity.Review;
import com.vmas.ProductService.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;

    @Transactional
    public Review addReview(Integer userId, Integer productId, ReviewRequest request) {

        if (reviewRepository.existsByUserIdAndProductIdAndOrderId(userId, productId, request.getOrderId())) {
            throw new RuntimeException("Bạn đã đánh giá sản phẩm này rồi!");
        }

        // MỚI: Thêm điều kiện kiểm tra NULL trước tiên để chống lỗi NullPointerException
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new RuntimeException("Số sao đánh giá không hợp lệ (Bắt buộc từ 1 đến 5)!");
        }

        Review review = Review.builder()
                .userId(userId)
                .productId(productId)
                .orderId(request.getOrderId())
                .rating(request.getRating())
                .comment(request.getComment())
                .reviewerName(request.getReviewerName())
                .reviewerAvatar(request.getReviewerAvatar())
                .build();

        return reviewRepository.save(review);
    }
    
    public List<Review> getProductReviews(Integer productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }
    
    @Transactional(readOnly = true)
    public List<String> getReviewedItemsByUser(Integer userId) {
        return reviewRepository.findReviewedItemsByUser(userId);
    }
    
    @Transactional
    public void syncUserInfo(Integer userId, String name, String avatar) {
        reviewRepository.syncUserInfo(userId, name, avatar);
    }
    
}