package com.vmas.OrderService.repository;

import com.vmas.OrderService.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.vmas.OrderService.enums.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, Integer> {
    List<Order> findByUserIdOrderByCreatedAtDesc(Integer userId);
    Optional<Order> findByOrderCode(String orderCode);

    @Query(value = "SELECT o FROM Order o WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(o.receiverName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:status IS NULL OR o.orderStatus = :status)" +
            "AND (CAST(:startDate AS java.time.LocalDateTime) IS NULL OR o.createdAt >= :startDate) " +
            "AND (CAST(:endDate AS java.time.LocalDateTime) IS NULL OR o.createdAt <= :endDate)",
            countQuery = "SELECT COUNT(o) FROM Order o WHERE " +
                    "(:keyword IS NULL OR :keyword = '' OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(o.receiverName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
                    "AND (:status IS NULL OR o.orderStatus = :status)")
    Page<Order> searchOrdersForAdmin(@Param("keyword") String keyword, @Param("status") OrderStatus status, @Param("startDate") LocalDateTime startDate,
                                     @Param("endDate") LocalDateTime endDate, Pageable pageable);

    long countByOrderStatus(com.vmas.OrderService.enums.OrderStatus status);
}
