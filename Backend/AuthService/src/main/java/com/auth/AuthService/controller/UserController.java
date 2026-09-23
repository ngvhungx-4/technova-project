package com.auth.AuthService.controller;

import com.auth.AuthService.dto.UserProfileResponse;
import com.auth.AuthService.dto.UserUpdateRequest;
import com.auth.AuthService.entity.PointHistory;
import com.auth.AuthService.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import com.auth.AuthService.dto.ChangePasswordRequest;

import java.security.Principal;
import java.util.List;

import com.auth.AuthService.dto.AdminUpdateProfileRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import com.auth.AuthService.dto.AdminUpdateCustomerRequest;
import com.auth.AuthService.dto.AddressRequest;
import com.auth.AuthService.dto.AddressResponse;
import com.auth.AuthService.dto.AdminCreateCustomerRequest;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(@RequestBody UserUpdateRequest request, Principal principal) {
        return ResponseEntity.ok(userService.updateProfile(principal.getName(), request));
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(Principal principal) {
        return ResponseEntity.ok(userService.getProfile(principal.getName()));
    }
    
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadAvatar(@RequestParam("file") MultipartFile file, Principal principal) {
        String newAvatarUrl = userService.uploadAvatar(principal.getName(), file);
        return ResponseEntity.ok(newAvatarUrl);
    }
    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(@RequestBody ChangePasswordRequest request, Principal principal) {
        userService.changePassword(principal.getName(), request);
        return ResponseEntity.ok("Đổi mật khẩu thành công");
    }
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PutMapping("/admin/profile")
    public ResponseEntity<?> updateAdminProfile(@RequestBody AdminUpdateProfileRequest request, Principal principal) {
        try {
            return ResponseEntity.ok(userService.updateAdminProfile(principal.getName(), request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/customers")
    public ResponseEntity<?> getCustomers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tier, // Thêm tham số tier
            @RequestParam(required = false) Boolean isActive, // Thêm tham số isActive
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(userService.getCustomers(keyword, tier, isActive, page, size));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PutMapping("/admin/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Integer id) {
        try {
            String message = userService.toggleUserStatus(id);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/customers/{id}")
    public ResponseEntity<?> getCustomerById(@PathVariable Integer id) {
        return ResponseEntity.ok(userService.getCustomerById(id));
    }

    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PutMapping("/admin/customers/{id}")
    public ResponseEntity<?> updateCustomerByAdmin(@PathVariable Integer id, @RequestBody AdminUpdateCustomerRequest request) {
        try {
            return ResponseEntity.ok(userService.updateCustomerByAdmin(id, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PostMapping(value = "/admin/upload-avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> adminUploadAvatar(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(userService.uploadFileOnly(file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PostMapping("/admin/customers")
    public ResponseEntity<?> createCustomerByAdmin(@RequestBody AdminCreateCustomerRequest request) {
        try {
            return ResponseEntity.ok(userService.createCustomerByAdmin(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/new-users")
    public ResponseEntity<com.auth.AuthService.dto.UserStatResponse> getNewUsersCount(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "date", required = false) String date) {
        
        return ResponseEntity.ok(userService.getNewUserCount(filter, date));
    }
    @GetMapping("/addresses/all")
    public ResponseEntity<List<AddressResponse>> getMyAddresses(Principal principal) {
        return ResponseEntity.ok(userService.getUserAddresses(principal.getName()));
    }

    @GetMapping("addresses/{id}")
    public ResponseEntity<AddressResponse> getAddressById(@PathVariable("id") Integer addressId, Principal principal) {
        return ResponseEntity.ok(userService.getAddressById(principal.getName(), addressId));
    }

    @PostMapping("/addresses")
    public ResponseEntity<AddressResponse> addAddress(@RequestBody AddressRequest request, Principal principal) {
        return ResponseEntity.ok(userService.addAddress(principal.getName(), request));
    }

    @PutMapping("/addresses/{id}")
    public ResponseEntity<AddressResponse> updateAddress(
            @PathVariable("id") Integer addressId,
            @RequestBody AddressRequest request,
            Principal principal) {
        return ResponseEntity.ok(userService.updateAddress(principal.getName(), addressId, request));
    }

    @DeleteMapping("/addresses/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable("id") Integer addressId, Principal principal) {
        try {
            userService.deleteAddress(principal.getName(), addressId);
            return ResponseEntity.ok("Xóa địa chỉ thành công");
        } catch (RuntimeException e) {
            // Trả về lỗi nếu là địa chỉ duy nhất hoặc không có quyền xóa
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/addresses/{id}/default")
    public ResponseEntity<String> setDefaultAddress(@PathVariable("id") Integer addressId, Principal principal) {
        userService.setDefaultAddress(principal.getName(), addressId);
        return ResponseEntity.ok("Thiết lập địa chỉ mặc định thành công");
    }

    @PostMapping("/internal/{userId}/add-points")
    public ResponseEntity<String> addPoints(
            @PathVariable Integer userId,
            @RequestParam Integer points,
            @RequestParam String orderCode,
            // Thêm tham số applyBonus, mặc định là true để không làm lỗi OrderService cũ
            @RequestParam(defaultValue = "true") boolean applyBonus) {
        try {
            // Truyền applyBonus vào hàm UserService
            userService.addPointsToUser(userId, points, orderCode, applyBonus);
            return ResponseEntity.ok("Điều chỉnh điểm thành công");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }
    
    @GetMapping("/points/history")
    public ResponseEntity<List<PointHistory>> getMyPointHistory(Principal principal) {
        try {
            // Gọi hàm từ UserService để lấy lịch sử
            List<PointHistory> history = userService.getPointHistory(principal.getName());
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @GetMapping("/admin/statistics/tiers")
    public ResponseEntity<java.util.Map<String, Long>> getTierStatistics() {
        return ResponseEntity.ok(userService.getTierStatistics());
    }
}