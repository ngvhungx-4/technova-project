package com.vmas.ProductService.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CategoryAdminResponse {
    private Integer id;
    private String name;
    private String imageUrl;
    private Boolean isFeatured;
    private String displayConfig;
    private Integer productCount;
    private Integer parentId;
    private String parentName;
}