package com.auth.AuthService.repository;

import com.auth.AuthService.entity.PointHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PointHistoryRepository extends JpaRepository<PointHistory, Integer> {
    List<PointHistory> findByUserIdOrderByCreatedAtDesc(Integer userId);
}