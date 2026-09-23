package com.vmas.OrderService.repository;

import com.vmas.OrderService.enums.DiscountType;
import com.vmas.OrderService.entity.Voucher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Integer> {
    Optional<Voucher> findByVoucherCode(String voucherCode);
    Optional<Voucher> findByVoucherCodeAndIsActiveTrue(String voucherCode);
    List<Voucher> findByIsActiveTrue();

    @Query("SELECT v FROM Voucher v WHERE " +
            "(:keyword IS NULL OR LOWER(v.voucherCode) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:type IS NULL OR v.discountType = :type) " +
            "AND (:isActive IS NULL OR v.isActive = :isActive) ")
    Page<Voucher> searchVouchersForAdmin(
            @Param("keyword") String keyword,
            @Param("type") DiscountType type,
            @Param("isActive") Boolean isActive,
            Pageable pageable
    );
    
 // 1. Chỉ lấy những voucher ĐANG HOẠT ĐỘNG và KHÔNG YÊU CẦU ĐIỂM (null hoặc <= 0)
    @Query("SELECT v FROM Voucher v WHERE v.isActive = true AND (v.exchangePoints IS NULL OR v.exchangePoints <= 0)")
    List<Voucher> findStandardPublicVouchers();

    // 2. Chỉ lấy những voucher ĐANG HOẠT ĐỘNG và CÓ YÊU CẦU ĐIỂM (> 0)
    @Query("SELECT v FROM Voucher v WHERE v.isActive = true AND v.exchangePoints > 0")
    List<Voucher> findRedeemableVouchers();
}
