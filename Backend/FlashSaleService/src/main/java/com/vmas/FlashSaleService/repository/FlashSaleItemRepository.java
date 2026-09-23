package com.vmas.FlashSaleService.repository;

import com.vmas.FlashSaleService.entity.FlashSaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlashSaleItemRepository extends JpaRepository<FlashSaleItem, Integer> {
    
    // Tìm tất cả các sản phẩm thuộc về một đợt Flash Sale cụ thể
    List<FlashSaleItem> findByFlashSaleId(Integer flashSaleId);
    
}