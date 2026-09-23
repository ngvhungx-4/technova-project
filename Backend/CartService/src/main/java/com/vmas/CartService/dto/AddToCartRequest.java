package com.vmas.CartService.dto;

import lombok.Data;

@Data
public class AddToCartRequest {
    private Integer productId;
    private String selectedColor;
    private Integer quantity;
}