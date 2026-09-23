package com.vmas.FlashSaleService.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class FlashSaleCreateRequest {
    private String name;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private List<FlashSaleItemCreateRequest> items;
}