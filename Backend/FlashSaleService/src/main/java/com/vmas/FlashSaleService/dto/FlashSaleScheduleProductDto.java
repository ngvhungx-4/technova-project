package com.vmas.FlashSaleService.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class FlashSaleScheduleProductDto {
    private Integer productId;
    private String name;
    private String thumbnail;
    private BigDecimal originalPrice;
    private BigDecimal flashSalePrice;
    private Integer sold;
    private Integer stock;
}