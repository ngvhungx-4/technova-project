package com.vmas.OrderService.entity;

import com.vmas.OrderService.enums.ReturnRequestStatus; // THÊM DÒNG NÀY
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Entity
@Table(name = "return_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "order_code", nullable = false)
    private String orderCode;

    @Column(name = "product_id", nullable = false)
    private Integer productId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(name = "evidence_images", columnDefinition = "TEXT")
    private String evidenceImages;

    // BẮT ĐẦU SỬA: Chuyển từ String sang Enum
    @Enumerated(EnumType.STRING) // Bắt buộc có dòng này để DB lưu dưới dạng chữ (PENDING, APPROVED...) thay vì số (0, 1...)
    @Column(nullable = false)
    private ReturnRequestStatus status; 
    // KẾT THÚC SỬA

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

}