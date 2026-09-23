package com.vmas.FlashSaleService.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashSaleItemDto {
    private Integer productId;
    private String productName;
    private String thumbnail;
    private BigDecimal originalPrice;
    private BigDecimal flashSalePrice;
    private Integer allocatedQuantity;
    private Integer soldQuantity;
}