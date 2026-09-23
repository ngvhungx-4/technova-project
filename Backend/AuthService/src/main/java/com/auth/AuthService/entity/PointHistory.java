package com.auth.AuthService.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "point_histories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PointHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(nullable = false)
    private Integer points; // Số điểm cộng hoặc trừ

    @Column(nullable = false)
    private String reason; // Lý do (VD: "Tích điểm từ đơn hàng", "Trừ điểm đổi quà")

    @Column(name = "order_code")
    private String orderCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}