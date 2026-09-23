package com.auth.AuthService.controller;

import com.auth.AuthService.dto.AddressSuggestionResponse;
import com.auth.AuthService.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    // API: GET /api/locations/autocomplete?text=197 tran phu&focus=10.75887,106.67538
    @GetMapping("/autocomplete")
    public ResponseEntity<List<AddressSuggestionResponse>> autocomplete(
            @RequestParam String text,
            @RequestParam(required = false) String focus) {
        
        // Trả về danh sách gợi ý địa chỉ
        return ResponseEntity.ok(locationService.searchAddress(text));
    }
}