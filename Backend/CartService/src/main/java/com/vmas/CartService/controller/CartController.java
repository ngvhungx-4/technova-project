package com.vmas.CartService.controller;

import com.vmas.CartService.dto.AddToCartRequest;
import com.vmas.CartService.dto.CartResponse;
import com.vmas.CartService.service.CartService;
import com.vmas.CartService.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final JwtUtil jwtUtil;

    /**
     * Hàm hỗ trợ lấy UserId từ Token một cách an toàn.
     * Nếu không có Token (Khách vãng lai), hàm sẽ trả về null thay vì báo lỗi.
     */
    private Integer getUserId(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            // Cắt bỏ chuỗi "Bearer " để lấy đúng token
            return jwtUtil.extractUserId(token.substring(7));
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<CartResponse> getCart(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestHeader(value = "Session-Id", required = false) String sessionId) {
        return ResponseEntity.ok(cartService.getCart(getUserId(token), sessionId));
    }

    @PostMapping("/add")
    public ResponseEntity<CartResponse> addToCart(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestHeader(value = "Session-Id", required = false) String sessionId,
            @RequestBody AddToCartRequest request
    ) {
        return ResponseEntity.ok(cartService.addToCart(getUserId(token), sessionId, request));
    }

    @PutMapping("/item/{itemId}")
    public ResponseEntity<CartResponse> updateItem(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestHeader(value = "Session-Id", required = false) String sessionId,
            @PathVariable("itemId") Integer itemId,
            @RequestParam(value = "quantity", required = false) Integer quantity,
            @RequestParam(value = "isSelected", required = false) Boolean isSelected
    ) {
        return ResponseEntity.ok(cartService.updateItem(getUserId(token), sessionId, itemId, quantity, isSelected));
    }

    @DeleteMapping("/item/{itemId}")
    public ResponseEntity<CartResponse> removeItem(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestHeader(value = "Session-Id", required = false) String sessionId,
            @PathVariable("itemId") Integer itemId
    ) {
        return ResponseEntity.ok(cartService.removeItem(getUserId(token), sessionId, itemId));
    }
    
    @PutMapping("/select-all")
    public ResponseEntity<CartResponse> selectAllItems(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestHeader(value = "Session-Id", required = false) String sessionId,
            @RequestParam("isSelected") Boolean isSelected
    ) {
        return ResponseEntity.ok(cartService.selectAllItems(getUserId(token), sessionId, isSelected));
    }
}