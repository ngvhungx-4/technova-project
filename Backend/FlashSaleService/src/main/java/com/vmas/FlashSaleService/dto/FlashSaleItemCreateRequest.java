package com.vmas.FlashSaleService.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class FlashSaleItemCreateRequest {
    private Integer productId;
    private BigDecimal flashSalePrice;
    private Integer allocatedQuantity;
}