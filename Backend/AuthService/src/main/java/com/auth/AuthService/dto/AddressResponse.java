package com.auth.AuthService.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressResponse {
    private Integer addressId;
    private String addressName;
    private String receiverName;
    private String phoneNumber;
    private String fullAddress;
    private Boolean isDefault;
}
