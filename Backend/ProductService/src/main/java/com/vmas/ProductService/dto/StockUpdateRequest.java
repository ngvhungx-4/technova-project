package com.vmas.ProductService.dto;
import lombok.Data;

@Data
public class StockUpdateRequest {
    private Integer productId;
    private Integer quantity;
}