package com.auth.AuthService.service;

import com.auth.AuthService.dto.UserProfileResponse;
import com.auth.AuthService.dto.UserStatResponse;
import com.auth.AuthService.dto.UserUpdateRequest;
import com.auth.AuthService.entity.User;
import com.auth.AuthService.entity.UserAddress;
import com.auth.AuthService.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.auth.AuthService.dto.ChangePasswordRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.auth.AuthService.dto.AdminUpdateProfileRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.auth.AuthService.dto.UserAdminResponse;
import com.auth.AuthService.dto.AdminUpdateCustomerRequest;
import com.auth.AuthService.repository.AddressRepository;
import com.auth.AuthService.repository.PointHistoryRepository;
import com.auth.AuthService.repository.RoleRepository;
import com.auth.AuthService.entity.PointHistory;
import com.auth.AuthService.entity.Role;
import com.auth.AuthService.dto.AddressRequest;
import com.auth.AuthService.dto.AddressResponse;
import com.auth.AuthService.dto.AdminCreateCustomerRequest;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final AddressRepository addressRepository;
    private final PointHistoryRepository pointHistoryRepository;
    
    private final Path rootLocation = Paths.get("uploads");

    @Transactional
    public UserProfileResponse updateProfile(String email, UserUpdateRequest request) {
        User user = getUserByEmail(email);

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getGender() != null) user.setGender(request.getGender());
        if (request.getBirthDate() != null) user.setBirthDate(request.getBirthDate());
        if (request.getAvatar() != null) user.setAvatar(request.getAvatar());

        User updatedUser = userRepository.save(user);
        return mapToProfileResponse(updatedUser);
    }
    
    public UserProfileResponse getProfile(String email) {
        return mapToProfileResponse(getUserByEmail(email));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
    }

    private UserProfileResponse mapToProfileResponse(User user) {
        return new UserProfileResponse(
            user.getFullName(),
            user.getEmail(),
            user.getPhoneNumber(),
            user.getGender(),
            user.getBirthDate(),
            user.getAvatar(),
            user.getMembershipTier(),
            user.getCurrentPoints(),
            user.getCyclePoints()
        );
    }
    
    public String uploadAvatar(String email, MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("File không được để trống");
            }
            User user = getUserByEmail(email);
            String oldAvatarUrl = user.getAvatar();
            if (oldAvatarUrl != null && !oldAvatarUrl.isEmpty()) {
                try {
                    String oldFileName = oldAvatarUrl.substring(oldAvatarUrl.lastIndexOf("/") + 1);

                    Path oldFilePath = rootLocation.resolve(oldFileName);

                    Files.deleteIfExists(oldFilePath);
                    System.out.println("Đã xóa avatar cũ: " + oldFileName);
                    
                } catch (Exception e) {
                    System.err.println("Cảnh báo: Không thể xóa file cũ - " + e.getMessage());
                }
            }

            String fileName = "avatar_" + UUID.randomUUID().toString() + "_" + file.getOriginalFilename();

            if (!Files.exists(rootLocation)) {
                Files.createDirectories(rootLocation);
            }

            Path filePath = rootLocation.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "http://localhost:8081/uploads/" + fileName; 
            user.setAvatar(fileUrl);
            userRepository.save(user);

            return fileUrl;

        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi lưu file ảnh: " + e.getMessage());
        }
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = getUserByEmail(email); 

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác!");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new RuntimeException("Mật khẩu mới không được trùng với mật khẩu hiện tại!");
        }

        if (!request.getNewPassword().equals(request.getConfirmationPassword())) {
            throw new RuntimeException("Hai mật khẩu mới không khớp nhau!");
        }

        if (request.getNewPassword().length() < 6) {
            throw new RuntimeException("Mật khẩu mới phải có ít nhất 6 ký tự!");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
    @Transactional
    public UserProfileResponse updateAdminProfile(String currentEmail, AdminUpdateProfileRequest request) {
        User user = getUserByEmail(currentEmail);

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty() && !request.getEmail().equals(currentEmail)) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new RuntimeException("Email này đã được sử dụng bởi một tài khoản khác!");
            }
            user.setEmail(request.getEmail().trim());
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar().trim());
        }

        User updatedUser = userRepository.save(user);
        
        return mapToProfileResponse(updatedUser);
    }
 // Sửa lại hàm getCustomers trong UserService
    public Page<UserAdminResponse> getCustomers(String keyword, String tierStr, Boolean isActive, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        // Chuyển đổi chuỗi tierStr sang Enum MembershipTier
        com.auth.AuthService.enums.MembershipTier tierEnum = null;
        if (tierStr != null && !tierStr.trim().isEmpty()) {
            try {
                tierEnum = com.auth.AuthService.enums.MembershipTier.valueOf(tierStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Bỏ qua nếu giá trị tier không hợp lệ
            }
        }

        Page<User> users = userRepository.searchCustomers(keyword, tierEnum, isActive, pageable);
        
        return users.map(u -> UserAdminResponse.builder()
                .userId(u.getUserId())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .phoneNumber(u.getPhoneNumber())
                .avatar(u.getAvatar())
                .isActive(u.getIsActive())
                .createdAt(u.getCreatedAt())
                .membershipTier(u.getMembershipTier())
                .currentPoints(u.getCurrentPoints())
                .cyclePoints(u.getCyclePoints())
                .build());
    }

    @Transactional
    public String toggleUserStatus(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng!"));
        
        user.setIsActive(!user.getIsActive());
        userRepository.save(user);
        
        return user.getIsActive() ? "Đã mở khóa tài khoản!" : "Đã khóa tài khoản!";
    }

    public UserAdminResponse getCustomerById(Integer id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));
        
        return UserAdminResponse.builder()
                .userId(u.getUserId()).email(u.getEmail()).fullName(u.getFullName())
                .phoneNumber(u.getPhoneNumber()).avatar(u.getAvatar())
                .isActive(u.getIsActive()).createdAt(u.getCreatedAt())
                .gender(u.getGender()).birthDate(u.getBirthDate())
                .build();
    }

    @Transactional
    public UserAdminResponse updateCustomerByAdmin(Integer id, AdminUpdateCustomerRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty() && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email đã được sử dụng bởi người dùng khác!");
            }
            user.setEmail(request.getEmail().trim());
        }

        if (request.getFullName() != null) user.setFullName(request.getFullName().trim());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber().trim());
        if (request.getGender() != null) user.setGender(request.getGender());
        if (request.getBirthDate() != null) user.setBirthDate(request.getBirthDate());
        if (request.getAvatar() != null && !request.getAvatar().isEmpty() && !request.getAvatar().equals(user.getAvatar())) {
            
            String oldAvatarUrl = user.getAvatar();
            if (oldAvatarUrl != null && !oldAvatarUrl.isEmpty()) {
                try {
                    String oldFileName = oldAvatarUrl.substring(oldAvatarUrl.lastIndexOf("/") + 1);
                    Files.deleteIfExists(rootLocation.resolve(oldFileName));
                } catch (Exception e) {
                    System.err.println("Không thể xóa file cũ của Khách hàng: " + e.getMessage());
                }
            }
            
            user.setAvatar(request.getAvatar());
        }

        User updatedUser = userRepository.save(user);
        return getCustomerById(id);
    }
    
    public String uploadFileOnly(MultipartFile file) {
        try {
            if (file.isEmpty()) throw new RuntimeException("File rỗng");
            
            String fileName = "avatar_cus_" + UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            if (!Files.exists(rootLocation)) {
                Files.createDirectories(rootLocation);
            }
            
            Path filePath = rootLocation.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            return "http://localhost:8081/uploads/" + fileName;
        } catch (IOException e) {
            throw new RuntimeException("Lỗi lưu file: " + e.getMessage());
        }
    }
    @Transactional
    public UserAdminResponse createCustomerByAdmin(AdminCreateCustomerRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng!");
        }

        Role userRole = roleRepository.findByRoleName("USER")
                .orElseThrow(() -> new RuntimeException("Lỗi hệ thống: Không tìm thấy Role 'USER'"));

        // Khởi tạo User mới và thiết lập trạng thái xác thực
        User user = User.builder()
                .email(request.getEmail().trim())
                .fullName(request.getFullName().trim())
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : "")
                .password(passwordEncoder.encode(request.getPassword()))
                .gender(request.getGender())
                .birthDate(request.getBirthDate())
                .avatar(request.getAvatar())
                .isActive(true)          // Tài khoản ở trạng thái mở khóa
                .isVerified(true)        // <--- THÊM DÒNG NÀY: Mặc định đã xác thực email
                .build();
        
        user.addRole(userRole);
        User savedUser = userRepository.save(user);
        
        return getCustomerById(savedUser.getUserId());
    }
    
 // LOGIC XỬ LÝ ĐỊA CHỈ
    @Transactional(readOnly = true)
    public AddressResponse getAddressById(String email, Integer addressId) {
        // Tìm địa chỉ theo ID
        UserAddress address = addressRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ có ID: " + addressId));

        // Kiểm tra xem địa chỉ này có thuộc về người dùng đang đăng nhập không
        if (!address.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Bạn không có quyền truy cập địa chỉ này!");
        }

        // Chuyển đổi sang DTO và trả về
        return mapToResponse(address);
    }

    @Transactional
    public AddressResponse addAddress(String email, AddressRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        boolean shouldBeDefault = user.getAddresses().isEmpty() || Boolean.TRUE.equals(request.getIsDefault());

        if (shouldBeDefault) {
            handleDefaultAddressConflict(user.getUserId());
        }

        UserAddress address = UserAddress.builder()
                .user(user)
                .addressName(request.getAddressName())
                .receiverName(request.getReceiverName())
                .phoneNumber(request.getPhoneNumber())
                .fullAddress(request.getFullAddress()) // Lưu trường mới
                .isDefault(shouldBeDefault)
                .build();

        return mapToResponse(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse updateAddress(String email, Integer addressId, AddressRequest request) {
        UserAddress address = addressRepository.findByAddressIdAndUserEmail(addressId, email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ của bạn"));

        boolean requestedDefault = Boolean.TRUE.equals(request.getIsDefault());
        boolean currentlyDefault = Boolean.TRUE.equals(address.getIsDefault());

        if (requestedDefault && !currentlyDefault) {
            handleDefaultAddressConflict(address.getUser().getUserId());
        }
        else if (!requestedDefault && currentlyDefault) {
            throw new RuntimeException("Phải có ít nhất một địa chỉ mặc định. Vui lòng chọn địa chỉ khác làm mặc định trước.");
        }

        address.setAddressName(request.getAddressName());
        address.setReceiverName(request.getReceiverName());
        address.setPhoneNumber(request.getPhoneNumber());
        address.setFullAddress(request.getFullAddress()); // Lưu trường mới
        address.setIsDefault(requestedDefault || currentlyDefault);

        return mapToResponse(addressRepository.save(address));
    }

    private AddressResponse mapToResponse(UserAddress address) {
        return AddressResponse.builder()
                .addressId(address.getAddressId())
                .addressName(address.getAddressName())
                .receiverName(address.getReceiverName())
                .phoneNumber(address.getPhoneNumber())
                .fullAddress(address.getFullAddress()) // Map trường mới
                .isDefault(address.getIsDefault())
                .build();
    }

    @Transactional
    public void deleteAddress(String email, Integer addressId) {
        UserAddress address = addressRepository.findByAddressIdAndUserEmail(addressId, email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ hoặc bạn không có quyền xóa"));

        Integer userId = address.getUser().getUserId();

        // Nếu chỉ còn 1 địa chỉ duy nhất, KHÔNG cho xóa
        int totalAddresses = addressRepository.countByUserUserId(userId);
        if (totalAddresses <= 1) {
            throw new RuntimeException("Bạn không thể xóa địa chỉ duy nhất. Hệ thống yêu cầu ít nhất một địa chỉ để giao hàng.");
        }

        // Lưu lại trạng thái mặc định trước khi xóa
        boolean wasDefault = address.getIsDefault();

        // Tiến hành xóa
        addressRepository.delete(address);

        // Nếu xóa đúng địa chỉ mặc định -> địa chỉ mới nhất còn lại lên làm mặc định
        if (wasDefault) {
            // Tìm địa chỉ còn lại mới nhất
            List<UserAddress> remaining = addressRepository.findByUserUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            if (!remaining.isEmpty()) {
                UserAddress newDefault = remaining.get(0);
                newDefault.setIsDefault(true);
                addressRepository.save(newDefault);
            }
        }
    }

    public List<AddressResponse> getUserAddresses(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<UserAddress> addresses = addressRepository.findByUserUserIdOrderByIsDefaultDescCreatedAtDesc(user.getUserId());

        // Map toàn bộ danh sách sang DTO
        return addresses.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private void handleDefaultAddressConflict(Integer userId) {
        addressRepository.resetDefaultStatusByUserId(userId);
    }

    @Transactional
    public void setDefaultAddress(String email, Integer addressId) {
        // Kiểm tra quyền sở hữu và sự tồn tại
        UserAddress address = addressRepository.findByAddressIdAndUserEmail(addressId, email)
                .orElseThrow(() -> new RuntimeException("Địa chỉ không tồn tại hoặc không thuộc quyền sở hữu của bạn"));

        // Reset toàn bộ địa chỉ của user này về false
        handleDefaultAddressConflict(address.getUser().getUserId());

        // Thiết lập địa chỉ hiện tại thành mặc định
        address.setIsDefault(true);
        addressRepository.save(address);
    }
    
    public com.auth.AuthService.dto.UserStatResponse getNewUserCount(String filter, String dateStr) {
        TimeComparison t = getTimeComparison(filter, dateStr);

        long currentNewUsers = userRepository.countNewUsersByRoleAndDateRange(t.currentStart, t.currentEnd);
        long prevNewUsers = userRepository.countNewUsersByRoleAndDateRange(t.prevStart, t.prevEnd);

        return com.auth.AuthService.dto.UserStatResponse.builder()
                .newUsers(currentNewUsers)
                .growth(calculateGrowth(currentNewUsers, prevNewUsers))
                .build();
    }
    public static class TimeComparison {
        public java.time.LocalDateTime currentStart;
        public java.time.LocalDateTime currentEnd;
        public java.time.LocalDateTime prevStart;
        public java.time.LocalDateTime prevEnd;
    }

    private TimeComparison getTimeComparison(String filter, String dateStr) {
        TimeComparison t = new TimeComparison();

        if (dateStr != null && !dateStr.trim().isEmpty()) {
            java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
            t.currentStart = date.atStartOfDay();
            t.currentEnd = date.atTime(23, 59, 59);
            t.prevStart = date.minusDays(1).atStartOfDay(); 
            t.prevEnd = date.minusDays(1).atTime(23, 59, 59);
            return t;
        }

        if (filter == null) filter = "month";
        java.time.LocalDate now = java.time.LocalDate.now();

        switch (filter.toLowerCase()) {
            case "today":
                t.currentStart = now.atStartOfDay();
                t.currentEnd = now.atTime(23, 59, 59);
                t.prevStart = now.minusDays(1).atStartOfDay();
                t.prevEnd = now.minusDays(1).atTime(23, 59, 59);
                break;
            case "week":
                java.time.LocalDate startOfWeek = now.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
                t.currentStart = startOfWeek.atStartOfDay();
                t.currentEnd = startOfWeek.plusDays(6).atTime(23, 59, 59);
                t.prevStart = startOfWeek.minusWeeks(1).atStartOfDay();
                t.prevEnd = startOfWeek.minusWeeks(1).plusDays(6).atTime(23, 59, 59);
                break;
            case "month":
                java.time.LocalDate startOfMonth = now.withDayOfMonth(1);
                java.time.LocalDate endOfMonth = now.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
                t.currentStart = startOfMonth.atStartOfDay();
                t.currentEnd = endOfMonth.atTime(23, 59, 59);
                
                java.time.LocalDate startOfPrevMonth = startOfMonth.minusMonths(1);
                java.time.LocalDate endOfPrevMonth = endOfMonth.minusMonths(1).with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
                t.prevStart = startOfPrevMonth.atStartOfDay();
                t.prevEnd = endOfPrevMonth.atTime(23, 59, 59);
                break;
            case "year":
                java.time.LocalDate startOfYear = now.withDayOfYear(1);
                java.time.LocalDate endOfYear = now.with(java.time.temporal.TemporalAdjusters.lastDayOfYear());
                t.currentStart = startOfYear.atStartOfDay();
                t.currentEnd = endOfYear.atTime(23, 59, 59);
                
                java.time.LocalDate startOfPrevYear = startOfYear.minusYears(1);
                java.time.LocalDate endOfPrevYear = endOfYear.minusYears(1).with(java.time.temporal.TemporalAdjusters.lastDayOfYear());
                t.prevStart = startOfPrevYear.atStartOfDay();
                t.prevEnd = endOfPrevYear.atTime(23, 59, 59);
                break;
        }
        return t;
    }

    private Double calculateGrowth(double current, double prev) {
        if (prev == 0) return current > 0 ? 100.0 : 0.0;
        double growth = ((current - prev) / prev) * 100;
        return Math.round(growth * 10.0) / 10.0; 
    }
    
    @Transactional
    public void addPointsToUser(Integer userId, Integer basePoints, String orderCode, boolean applyBonus) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // 1. Tính toán số điểm biến động (dương khi tích điểm, âm khi đổi voucher)
        int finalPoints = applyBonus ? calculateBonusPoints(basePoints, user.getMembershipTier()) : basePoints;

        // 2. KIỂM TRA BẢO MẬT: Đảm bảo điểm tiêu dùng không bao giờ bị âm
        if (user.getCurrentPoints() + finalPoints < 0) {
            throw new RuntimeException("Số dư điểm khả dụng không đủ để thực hiện giao dịch này!");
        }

        // 3. Cập nhật điểm tiêu dùng (currentPoints)
        user.setCurrentPoints(user.getCurrentPoints() + finalPoints);

        // 4. CHỈ CẬP NHẬT ĐIỂM XẾP HẠNG KHI LÀ ĐIỂM DƯƠNG (TÍCH LŨY)
        if (finalPoints > 0) {
            user.setCyclePoints(user.getCyclePoints() + finalPoints);
            updateMembershipTier(user);
        }
        // Điểm xét hạng (cyclePoints) được giữ nguyên tuyệt đối khi khách đổi voucher (finalPoints < 0).

        // 5. Lưu lịch sử giao dịch điểm
        String reasonNote;
        String actualOrderCode;
        if (applyBonus) {
            reasonNote = "Tích điểm từ đơn hàng " + orderCode + " (Điểm gốc: " + basePoints + ")";
            actualOrderCode = orderCode;
        } else {
            reasonNote = orderCode; 
            actualOrderCode = "MANUAL_OR_REDEEM";
        }

        PointHistory history = PointHistory.builder()
                .userId(userId)
                .points(finalPoints)
                .reason(reasonNote)
                .orderCode(actualOrderCode)
                .build();
        pointHistoryRepository.save(history);

        userRepository.save(user);
    }

    private void updateMembershipTier(User user) {
        int points = user.getCyclePoints();
        if (points >= 7000) {
            user.setMembershipTier(com.auth.AuthService.enums.MembershipTier.ELITE);
        } else if (points >= 3000) {
            user.setMembershipTier(com.auth.AuthService.enums.MembershipTier.GOLD);
        } else if (points >= 1000) {
            user.setMembershipTier(com.auth.AuthService.enums.MembershipTier.SILVER);
        } else {
            user.setMembershipTier(com.auth.AuthService.enums.MembershipTier.BASIC);
        }
    }
    
 // Thêm hàm này vào trong class UserService
    private int calculateBonusPoints(int basePoints, com.auth.AuthService.enums.MembershipTier tier) {
        if (tier == null) return basePoints;
        
        switch (tier) {
            case ELITE:
                // Tích điểm + 20%
                return basePoints + (int) Math.round(basePoints * 0.20);
            case GOLD:
                // Tích điểm + 10%
                return basePoints + (int) Math.round(basePoints * 0.10);
            case SILVER:
                // Tích điểm + 5%
                return basePoints + (int) Math.round(basePoints * 0.05);
            case BASIC:
            default:
                // Basic: Chỉ nhận điểm cơ bản
                return basePoints;
        }
    }
    @Transactional(readOnly = true)
    public List<com.auth.AuthService.entity.PointHistory> getPointHistory(String email) {
        // Tìm người dùng hiện tại dựa vào email
        User user = getUserByEmail(email);
        
        // Gọi repository để lấy danh sách lịch sử, sắp xếp mới nhất lên đầu
        return pointHistoryRepository.findByUserIdOrderByCreatedAtDesc(user.getUserId());
    }
    
 // Thêm vào class UserService
    @Transactional(readOnly = true)
    public java.util.Map<String, Long> getTierStatistics() {
        java.util.Map<String, Long> stats = new java.util.HashMap<>();
        
        // Tổng số user mang quyền USER
        long total = userRepository.count(); // Có thể viết query đếm riêng role USER nếu cần
        long basic = userRepository.countByMembershipTier(com.auth.AuthService.enums.MembershipTier.BASIC);
        long gold = userRepository.countByMembershipTier(com.auth.AuthService.enums.MembershipTier.GOLD);
        long elite = userRepository.countByMembershipTier(com.auth.AuthService.enums.MembershipTier.ELITE);
        
        stats.put("total", total);
        stats.put("basic", basic);
        stats.put("gold", gold);
        stats.put("elite", elite);
        
        return stats;
    }
}