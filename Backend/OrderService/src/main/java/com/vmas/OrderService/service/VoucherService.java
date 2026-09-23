package com.vmas.OrderService.service;

import com.vmas.OrderService.enums.DiscountType;
import com.vmas.OrderService.entity.Voucher;
import com.vmas.OrderService.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VoucherService {
    @Autowired
    private VoucherRepository voucherRepository;

    public Page<Voucher> getAllVouchers(String keyword, String typeStr, Boolean isActive, int page, int size) {
        DiscountType type = null;
        if (typeStr != null && !typeStr.trim().isEmpty()) {
            try {
                type = DiscountType.valueOf(typeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
            }
        }

        String kw = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;

        // Tạo đối tượng phân trang, sắp xếp theo ngày tạo giảm dần
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        return voucherRepository.searchVouchersForAdmin(kw, type, isActive, pageable);
    }

    public Voucher createVoucher(Voucher voucher) {
        if(voucherRepository.findByVoucherCode(voucher.getVoucherCode()).isPresent()){
            throw new RuntimeException("Mã voucher đã tồn tại!");
        }
        return voucherRepository.save(voucher);
    }

    public Voucher updateVoucher(Integer id, Voucher details) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Voucher"));

        voucher.setVoucherCode(details.getVoucherCode());
        voucher.setDiscountType(details.getDiscountType());
        voucher.setDiscountValue(details.getDiscountValue());
        voucher.setMinOrderAmount(details.getMinOrderAmount());
        voucher.setMaxDiscountAmount(details.getMaxDiscountAmount());
        voucher.setUsageLimit(details.getUsageLimit());
        voucher.setStartDate(details.getStartDate());
        voucher.setEndDate(details.getEndDate());
        voucher.setActive(details.isActive());

        // --- BỔ SUNG LƯU 3 TRƯỜNG MỚI ---
        voucher.setCustomerGroup(details.getCustomerGroup() != null && !details.getCustomerGroup().isEmpty() ? details.getCustomerGroup() : null);
        voucher.setTargetEmail(details.getTargetEmail() != null && !details.getTargetEmail().isEmpty() ? details.getTargetEmail() : null);
        voucher.setExchangePoints(details.getExchangePoints());

        return voucherRepository.save(voucher);
    }

    public void deleteVoucher(Integer id) {
        voucherRepository.deleteById(id);
    }

    public List<Voucher> getPublicActiveVouchers() {
        return voucherRepository.findStandardPublicVouchers(); 
    }
    
 // Bổ sung hàm mới: Lấy voucher dành riêng cho trang đổi điểm
    public List<Voucher> getRedeemableVouchers() {
        return voucherRepository.findRedeemableVouchers();
    }
    @Autowired
    private com.vmas.OrderService.service.AuthServiceClient authServiceClient;

    @org.springframework.transaction.annotation.Transactional
    public Voucher redeemVoucher(Integer originalVoucherId, Integer userId, String userEmail, int costPoints) {
        // 1. Kiểm tra voucher gốc có tồn tại không
        Voucher original = voucherRepository.findById(originalVoucherId)
                .orElseThrow(() -> new RuntimeException("Voucher không tồn tại hoặc đã hết hạn"));

        // 2. Gọi sang AuthService để trừ điểm
        String reason = "Đổi mã giảm giá từ Cửa hàng Đổi Điểm";
        authServiceClient.deductPointsForUser(userId, costPoints, reason);

        // 3. Tạo một mã cá nhân hóa độc quyền cho khách hàng này
        String uniqueCode = "REDEEM-" + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        
        Voucher personalVoucher = Voucher.builder()
                .voucherCode(uniqueCode)
                .discountType(original.getDiscountType())
                .discountValue(original.getDiscountValue())
                .minOrderAmount(original.getMinOrderAmount())
                .maxDiscountAmount(original.getMaxDiscountAmount())
                .usageLimit(1) // Mỗi mã cá nhân chỉ dùng 1 lần
                .targetEmail(userEmail) // Gắn chặt với email khách hàng (bảo mật từ bước trước)
                .isActive(true)
                .build();
                
        return voucherRepository.save(personalVoucher);
    }
}
