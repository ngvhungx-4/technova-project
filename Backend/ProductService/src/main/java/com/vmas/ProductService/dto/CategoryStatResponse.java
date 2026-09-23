package com.vmas.ProductService.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CategoryStatResponse {
    private String categoryName;
    private long totalSold;
    private BigDecimal totalRevenue;
    private String growth; 
}