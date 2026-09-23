package com.vmas.FlashSaleService.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class FlashSaleResponse {
    private Integer flashSaleId;
    private String name;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private List<FlashSaleItemDto> items;
}