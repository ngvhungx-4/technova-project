package com.auth.AuthService.service;

import com.auth.AuthService.dto.AddressSuggestionResponse;
import com.auth.AuthService.dto.VietmapAutocompleteItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LocationService {

    @Value("${vietmap.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String VIETMAP_URL = "https://maps.vietmap.vn/api/autocomplete/v4";

    public List<AddressSuggestionResponse> searchAddress(String text) {
        try {
            // SỬA LỖI 1: Xây dựng và mã hóa URI an toàn tuyệt đối cho tiếng Việt và khoảng trắng
            java.net.URI uri = UriComponentsBuilder.fromUriString(VIETMAP_URL)
                    .queryParam("apikey", apiKey)
                    .queryParam("text", text)
                    .queryParam("display_type", 1) // SỬA LỖI 2: Dùng type 5 để quét toàn bộ dữ liệu, chống thiếu sót kết quả
                    .build()
                    .encode()
                    .toUri();

            // Truyền đối tượng URI (thay vì chuỗi String) vào RestTemplate
            VietmapAutocompleteItem[] response = restTemplate.getForObject(uri, VietmapAutocompleteItem[].class);
            
            if (response != null) {
                return Arrays.stream(response)
                        .map(item -> AddressSuggestionResponse.builder()
                                .refId(item.getRefId())
                                .name(item.getName())
                                .display(item.getDisplay()) // Với type 5, display mặc định là chuỗi địa chỉ định dạng MỚI
                                .build()
                        ).collect(Collectors.toList());
            }
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi kết nối với máy chủ bản đồ: " + e.getMessage());
        }
        
        return List.of();
    }
}