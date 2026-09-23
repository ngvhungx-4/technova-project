package com.vmas.OrderService.dto;

import lombok.Data;

@Data
public class ProductCategoryInfoResponse {
    private Integer productId;
    private Integer categoryId;
    private String categoryName;
}