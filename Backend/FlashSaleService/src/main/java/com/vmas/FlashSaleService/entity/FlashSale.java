package com.vmas.FlashSaleService.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "flash_sales")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashSale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name; // Ví dụ: "Siêu Sale 9/9", "Flash Sale Khung Giờ Vàng"

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    // TỰ ĐỘNG LƯU THỜI GIAN TẠO (Không cho phép cập nhật lại sau khi đã tạo)
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // TỰ ĐỘNG CẬP NHẬT THỜI GIAN MỖI KHI DỮ LIỆU ĐỔI
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Quan hệ 1-N với các sản phẩm trong đợt sale
    @OneToMany(mappedBy = "flashSale", cascade = CascadeType.ALL)
    private List<FlashSaleItem> items;
}