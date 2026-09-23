package com.auth.AuthService.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

import com.auth.AuthService.enums.MembershipTier;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String fullName;
    private String email;
    private String phoneNumber;
    private Integer gender;
    private LocalDate birthDate;
    private String avatar;
    
    private MembershipTier membershipTier;
    private Integer currentPoints;
    private Integer cyclePoints;
}