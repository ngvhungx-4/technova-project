package com.auth.AuthService.dto;

import lombok.Data;

@Data
public class AddressRequest {
	private String addressName;
    private String receiverName;
    private String phoneNumber;
    private String fullAddress;
    private Boolean isDefault;
}

