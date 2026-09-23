package com.vmas.OrderService.enums;

public enum ReturnRequestStatus {
    PENDING,    // Đang chờ quản trị viên xét duyệt
    APPROVED,   // Đã chấp nhận yêu cầu trả hàng/hoàn tiền
    REJECTED    // Từ chối yêu cầu trả hàng
}