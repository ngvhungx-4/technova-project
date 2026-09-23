package com.auth.AuthService.config;

import com.auth.AuthService.entity.User;
import com.auth.AuthService.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class TierResetScheduler {

    private final UserRepository userRepository;

    // Chạy vào 00:00 mỗi ngày để kiểm tra
    @Scheduled(cron = "0 0 0 * * ?") 
    @Transactional
    public void resetExpiredTiers() {
        // Lấy thời điểm chính xác của 1 năm (12 tháng) trước
        LocalDateTime oneYearAgo = LocalDateTime.now().minusYears(1);
        
        // SỬ DỤNG HÀM MỚI TẠO Ở ĐÂY:
        // Lấy ra tất cả các User có TierCycleStart nhỏ hơn 1 năm trước
        List<User> usersToReset = userRepository.findByTierCycleStartBefore(oneYearAgo);

        if (usersToReset.isEmpty()) {
            System.out.println("Hôm nay không có người dùng nào cần cập nhật lại chu kỳ hạng.");
            return;
        }

        for (User user : usersToReset) {
            int pts = user.getCyclePoints();
            
            // Đánh giá lại hạng
            if (pts >= 7000) user.setMembershipTier(com.auth.AuthService.enums.MembershipTier.ELITE);
            else if (pts >= 3000) user.setMembershipTier(com.auth.AuthService.enums.MembershipTier.GOLD);
            else if (pts >= 1000) user.setMembershipTier(com.auth.AuthService.enums.MembershipTier.SILVER);
            else user.setMembershipTier(com.auth.AuthService.enums.MembershipTier.BASIC);

            // Bắt đầu chu kỳ 12 tháng mới
            user.setCyclePoints(0);
            user.setTierCycleStart(LocalDateTime.now());
        }
        
        // Lưu lại toàn bộ các User đã thay đổi
        userRepository.saveAll(usersToReset);
        System.out.println("Đã cập nhật chu kỳ hạng mới cho " + usersToReset.size() + " người dùng.");
    }
}