package com.auth.AuthService.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AddressSuggestionResponse {
    private String refId;
    private String name;     // Tên địa điểm (VD: 197 Trần Phú)
    private String display;  // Tên hiển thị đầy đủ (VD: 197 Trần Phú Phường 4, Quận 5...)
}