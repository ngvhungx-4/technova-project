package com.auth.AuthService.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

import com.auth.AuthService.enums.MembershipTier;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminResponse {
    private Integer userId;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String avatar;
    private Integer gender;
    private java.time.LocalDate birthDate;
    private Boolean isActive;
    private LocalDateTime createdAt;
    
    private MembershipTier membershipTier;
    private Integer currentPoints;
    private Integer cyclePoints;
}