package com.vmas.OrderService.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class CategoryRevenueStatResponse {
    private String categoryName;
    private long totalSold;
    private BigDecimal totalRevenue;
}