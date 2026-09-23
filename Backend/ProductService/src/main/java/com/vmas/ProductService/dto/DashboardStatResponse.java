package com.vmas.ProductService.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class DashboardStatResponse {
    private Long totalStock;
    private Long activeProducts;
    private Long lowStockWarning;
    private BigDecimal totalInventoryValue;
}