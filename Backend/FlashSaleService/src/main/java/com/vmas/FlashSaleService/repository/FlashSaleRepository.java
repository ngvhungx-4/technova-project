package com.vmas.FlashSaleService.repository;

import com.vmas.FlashSaleService.entity.FlashSale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface FlashSaleRepository extends JpaRepository<FlashSale, Integer> {
    // Tìm chiến dịch đang diễn ra (hiện tại nằm giữa startTime và endTime)
    @Query("SELECT f FROM FlashSale f WHERE f.isActive = true AND f.startTime <= :now AND f.endTime >= :now")
    Optional<FlashSale> findActiveFlashSale(@Param("now") LocalDateTime now);
    
 // THÊM MỚI: Truy vấn kiểm tra xem có chiến dịch nào bị chồng chéo thời gian hay không
    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM FlashSale f " +
           "WHERE f.isActive = true " +
           "AND f.startTime < :endTime " +
           "AND f.endTime > :startTime")
    boolean existsOverlappingCampaign(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
    
 // THÊM MỚI: Truy vấn kiểm tra trùng lặp thời gian khi Cập nhật (bỏ qua ID hiện tại)
    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM FlashSale f " +
           "WHERE f.isActive = true AND f.id != :id " +
           "AND f.startTime < :endTime " +
           "AND f.endTime > :startTime")
    boolean existsOverlappingCampaignExcludingId(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime, @Param("id") Integer id);
}