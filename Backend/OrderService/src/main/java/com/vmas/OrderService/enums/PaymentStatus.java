package com.vmas.OrderService.enums;

public enum PaymentStatus {
    PENDING, 
    PAID, 
    FAILED, 
    REFUND_PENDING, // Chờ hoàn tiền
    REFUNDED        // Đã hoàn tiền
}