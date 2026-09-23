package com.vmas.OrderService.repository;

import com.vmas.OrderService.entity.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Integer> {
    List<ReturnRequest> findByOrderCode(String orderCode);
    
 // Kiểm tra xem khách đã từng tạo yêu cầu trả hàng cho sản phẩm này chưa
    boolean existsByOrderCodeAndProductId(String orderCode, Integer productId);
    
    // Lấy danh sách các yêu cầu trả hàng thuộc các đơn hàng của User
    List<ReturnRequest> findByOrderCodeIn(List<String> orderCodes);
}