package com.vmas.OrderService.controller;

import com.vmas.OrderService.entity.Voucher;
import com.vmas.OrderService.service.OrderService;
import com.vmas.OrderService.service.VoucherService;
import com.vmas.OrderService.util.JwtUtil;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class VoucherController {
    private final VoucherService voucherService;
    private final OrderService orderService;
    private final JwtUtil jwtUtil;

    @GetMapping("/admin/all")
    public ResponseEntity<Page<Voucher>> getAll(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "isActive", required = false) Boolean isActive,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "6") int size) {

        return ResponseEntity.ok(voucherService.getAllVouchers(keyword, type, isActive, page, size));
    }

    @PostMapping("/admin/add")
    public ResponseEntity<Voucher> add(@RequestBody Voucher voucher) {
        return ResponseEntity.ok(voucherService.createVoucher(voucher));
    }

    @PutMapping("/admin/update/{id}")
    public ResponseEntity<Voucher> update(@PathVariable("id") Integer id, @RequestBody Voucher voucher) {
        return ResponseEntity.ok(voucherService.updateVoucher(id, voucher));
    }

    @DeleteMapping("/admin/delete/{id}")
    public ResponseEntity<?> delete(@PathVariable("id") Integer id) {
        voucherService.deleteVoucher(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateVoucher(
            @RequestHeader(value = "Authorization", required = false) String token, // THÊM LẤY TOKEN
            @RequestParam("code") String code,
            @RequestParam("subTotal") BigDecimal subTotal,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "customerGroup", required = false) String customerGroup) {
            
        // 1. Giải mã Token để lấy userId (Nếu là khách vãng lai, userId sẽ là null)
        Integer userId = null;
        if (token != null && token.startsWith("Bearer ")) {
            userId = jwtUtil.extractUserId(token.substring(7));
        }

        // 2. Truyền thêm userId vào lớp xử lý lõi
        Map<String, Object> result = orderService.validateAndCalculateDiscount(code, subTotal, email, customerGroup, userId);
        
        if ((Boolean) result.get("isValid")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }
    @GetMapping("/public/active")
    public ResponseEntity<List<Voucher>> getActiveVouchers() {
        return ResponseEntity.ok(voucherService.getPublicActiveVouchers());
    }
    
    @GetMapping("/public/redeemable")
    public ResponseEntity<List<Voucher>> getRedeemableVouchers() {
        return ResponseEntity.ok(voucherService.getRedeemableVouchers());
    }
 // Hãy chắc chắn bạn đã khai báo JwtUtil jwtUtil; ở đầu file Controller (như bước trước chúng ta đã làm)

    @PostMapping("/redeem/{id}")
    public ResponseEntity<?> redeemVoucher(
            @RequestHeader("Authorization") String token, 
            @PathVariable("id") Integer id, 
            @RequestParam("cost") int cost) {
            
        try {
            // Trích xuất thông tin từ Token của người dùng đã đăng nhập
            Integer userId = jwtUtil.extractUserId(token.substring(7));
            String userEmail = jwtUtil.extractUsername(token.substring(7));
            
            if (userId == null) {
                throw new RuntimeException("Vui lòng đăng nhập để đổi điểm!");
            }

            Voucher newPersonalVoucher = voucherService.redeemVoucher(id, userId, userEmail, cost);
            return ResponseEntity.ok(newPersonalVoucher);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("message", e.getMessage()));
        }
    }
}
