package com.vmas.CartService.service;

import com.vmas.CartService.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CartCleanupService {

    private final CartRepository cartRepository;

    /**
     * Hàm này sẽ tự động chạy vào lúc 2:00 sáng mỗi ngày.
     * Cấu trúc Cron: "Giây Phút Giờ Ngày Tháng Thứ"
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanUpOldGuestCarts() {
        // Tìm và xóa các giỏ hàng vãng lai không có cập nhật gì trong 7 ngày qua
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(7);
        
        System.out.println("Bắt đầu dọn dẹp giỏ hàng vãng lai cũ trước ngày: " + cutoffDate);
        cartRepository.deleteAbandonedGuestCarts(cutoffDate);
        System.out.println("Dọn dẹp hoàn tất!");
    }
}
