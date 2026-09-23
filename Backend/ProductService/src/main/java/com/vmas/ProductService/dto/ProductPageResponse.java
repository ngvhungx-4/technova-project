package com.vmas.ProductService.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ProductPageResponse {
    private List<ProductResponse> content;
    private int pageNo;        
    private int pageSize;      
    private long totalElements; 
    private int totalPages;     
    private boolean last;      
}