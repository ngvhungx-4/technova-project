package com.vmas.FlashSaleService.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "flash_sale_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashSaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flash_sale_id")
    @JsonIgnore
    private FlashSale flashSale;

    @Column(name = "product_id", nullable = false)
    private Integer productId;

    @Column(name = "flash_sale_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal flashSalePrice;

    @Column(name = "allocated_quantity", nullable = false)
    private Integer allocatedQuantity; // Số lượng mở bán trong Flash Sale

    @Column(name = "sold_quantity")
    @Builder.Default
    private Integer soldQuantity = 0; // Số lượng đã bán

    // TỰ ĐỘNG LƯU THỜI GIAN TẠO
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // TỰ ĐỘNG CẬP NHẬT THỜI GIAN
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}