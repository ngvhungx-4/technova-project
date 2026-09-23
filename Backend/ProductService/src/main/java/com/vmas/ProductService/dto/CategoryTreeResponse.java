package com.vmas.ProductService.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CategoryTreeResponse {
    private Integer id;
    private String name;
    private String imageUrl;
    
    @JsonInclude(JsonInclude.Include.NON_EMPTY) 
    private List<CategoryTreeResponse> children;
}