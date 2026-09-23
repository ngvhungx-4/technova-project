package com.vmas.CartService.repository;

import com.vmas.CartService.entity.Cart; 
import org.springframework.data.jpa.repository.JpaRepository; 
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Integer> {
    Optional<Cart> findByUserId(Integer userId);
    
 // Thêm hàm tìm theo Session ID
    Optional<Cart> findBySessionId(String sessionId);
    
 // THÊM MỚI: Xóa giỏ hàng vãng lai cũ
    @Modifying
    @Query("DELETE FROM Cart c WHERE c.userId IS NULL AND c.updatedAt < :cutoffDate")
    void deleteAbandonedGuestCarts(@Param("cutoffDate") LocalDateTime cutoffDate);
}