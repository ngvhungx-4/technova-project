package com.vmas.OrderService.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map; // Bổ sung thư viện Map

@Service
@RequiredArgsConstructor
public class AuthServiceClient {

    private final RestTemplate restTemplate;
    // Cổng 8081 là của AuthService
    private final String AUTH_SERVICE_URL = "http://localhost:8081/api/users";

    public void addPointsForUser(Integer userId, Integer points, String orderCode) {
        String url = AUTH_SERVICE_URL + "/internal/" + userId + "/add-points?points=" + points + "&orderCode=" + orderCode;
        try {
            restTemplate.postForObject(url, null, String.class);
            System.out.println("Cộng điểm thành công cho user: " + userId);
        } catch (Exception e) {
            System.err.println("Lỗi gọi AuthService cộng điểm: " + e.getMessage());
        }
    }

    // --- THÊM HÀM NÀY ĐỂ LẤY HẠNG THÀNH VIÊN ---
    public String getCurrentUserTier() {
        try {
            String url = AUTH_SERVICE_URL + "/profile";
            // RestTemplateConfig đã tự động đính kèm Token vào request này
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            
            if (response != null && response.containsKey("membershipTier")) {
                return (String) response.get("membershipTier");
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi lấy hạng thành viên từ AuthService: " + e.getMessage());
        }
        return null;
    }
 // Hàm mới: Trừ điểm của người dùng
    public void deductPointsForUser(Integer userId, Integer points, String reason) {
        // Gửi số âm (-points) để hệ thống hiểu là trừ điểm
        String url = AUTH_SERVICE_URL + "/internal/" + userId + "/add-points?points=" + (-points) + "&orderCode=" + reason + "&applyBonus=false";
        try {
            restTemplate.postForObject(url, null, String.class);
            System.out.println("Đã trừ " + points + " điểm của user: " + userId);
        } catch (Exception e) {
            // Ném lỗi ra để ngừng cấp voucher nếu trừ điểm thất bại
            throw new RuntimeException("Không đủ điểm khả dụng hoặc lỗi hệ thống!");
        }
    }
}