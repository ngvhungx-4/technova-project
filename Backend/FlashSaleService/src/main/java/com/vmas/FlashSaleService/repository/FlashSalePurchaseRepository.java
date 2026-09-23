package com.vmas.FlashSaleService.repository;

import com.vmas.FlashSaleService.entity.FlashSalePurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface FlashSalePurchaseRepository extends JpaRepository<FlashSalePurchase, Integer> {
    
    // Đã có sẵn: Kiểm tra xem user đã mua chưa
    boolean existsByUserIdAndFlashSaleItemId(Integer userId, Integer flashSaleItemId);

    // MỚI THÊM: Tìm bản ghi mua hàng dựa trên userId và productId
    @Query("SELECT p FROM FlashSalePurchase p WHERE p.userId = :userId AND p.flashSaleItem.productId = :productId")
    Optional<FlashSalePurchase> findByUserIdAndProductId(@Param("userId") Integer userId, @Param("productId") Integer productId);
}