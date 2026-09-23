package com.vmas.ProductService.repository;

import com.vmas.ProductService.entity.Review;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Integer> {
    
    // Spring Boot sẽ tự động tạo lệnh SQL chuẩn xác, không bao giờ bị lỗi dấu hỏi chấm
    boolean existsByUserIdAndProductIdAndOrderId(Integer userId, Integer productId, Integer orderId);
    
    List<Review> findByProductIdOrderByCreatedAtDesc(Integer productId);
    
    @Query("SELECT CONCAT(r.orderId, '-', r.productId) FROM Review r WHERE r.userId = :userId")
    List<String> findReviewedItemsByUser(@Param("userId") Integer userId);
    
    @Modifying
    @Query("UPDATE Review r SET r.reviewerName = :name, r.reviewerAvatar = :avatar WHERE r.userId = :userId")
    void syncUserInfo(@Param("userId") Integer userId, @Param("name") String name, @Param("avatar") String avatar);
}