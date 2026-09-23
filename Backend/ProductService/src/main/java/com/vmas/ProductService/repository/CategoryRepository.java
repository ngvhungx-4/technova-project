package com.vmas.ProductService.repository;

import com.vmas.ProductService.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import org.springframework.data.domain.Pageable;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    List<Category> findByParentIsNull();
    
    List<Category> findByIsFeaturedTrue(Pageable pageable);
    List<Category> findByParent_Id(Integer parentId);
}
