package com.vmas.FlashSaleService.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class FlashSaleDashboardResponse {
    private ActiveCampaignDto activeCampaign;
    private List<ScheduleDto> schedules;

    @Data
    @Builder
    public static class ActiveCampaignDto {
        private Integer id;
        private String name;
        private String timeLeft;
        private Integer totalProducts;
        private BigDecimal estimatedRevenue;
    }

    @Data
    @Builder
    public static class ScheduleDto {
        private Integer id;
        private String name;
        private String timeRange;
        private String status;
        private Integer productCount;
    }
}