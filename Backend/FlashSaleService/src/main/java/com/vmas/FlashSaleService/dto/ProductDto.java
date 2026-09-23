package com.vmas.FlashSaleService.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProductDto {
    private Integer id;
    private String name;
    private String thumbnail;
    private BigDecimal salePrice; // Giá gốc bên ProductService
}