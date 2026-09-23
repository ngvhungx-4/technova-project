package com.vmas.ProductService.repository;

import com.vmas.ProductService.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.vmas.ProductService.entity.StockStatus;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    
	List<Product> findByCategory_IdIn(List<Integer> categoryIds);

    Page<Product> findByCategory_IdIn(List<Integer> categoryIds, Pageable pageable);

    // Giảm tồn kho
    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock - :quantity, " +
            "p.stockStatus = CASE WHEN (p.stock - :quantity) = 0 THEN 'OUT_OF_STOCK' ELSE p.stockStatus END " +
            "WHERE p.id = :productId " +
            "AND p.stock >= :quantity " +
            "AND p.stockStatus != 'OUT_OF_STOCK'")
    int decreaseStock(@Param("productId") Integer productId, @Param("quantity") Integer quantity);

    // Tăng tồn kho
    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock + :quantity WHERE p.id = :productId")
    void increaseStock(@Param("productId") Integer productId, @Param("quantity") Integer quantity);

    @Modifying
    @Query("UPDATE Product p SET p.sold = COALESCE(p.sold, 0) + :quantity WHERE p.id = :productId")
    void increaseSold(@Param("productId") Integer productId, @Param("quantity") Integer quantity);

    int countByCategory_IdIn(List<Integer> categoryIds);

    @Query(value = "SELECT p FROM Product p WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:hasCategory = false OR p.category.id IN :categoryIds) " +
            "AND (:status IS NULL OR p.stockStatus = :status)",
            countQuery = "SELECT COUNT(p) FROM Product p WHERE " +
                    "(:keyword IS NULL OR :keyword = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
                    "AND (:hasCategory = false OR p.category.id IN :categoryIds) " +
                    "AND (:status IS NULL OR p.stockStatus = :status)")
    Page<Product> searchProductsForAdmin(@Param("keyword") String keyword,
                                         @Param("hasCategory") boolean hasCategory,
                                         @Param("categoryIds") List<Integer> categoryIds,
                                         @Param("status") StockStatus status,
                                         Pageable pageable);

    @Query(value = "SELECT p.* FROM products p LEFT JOIN brands b ON p.brand_id = b.id " +
            "WHERE p.is_active = true " +
            "AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND p.sale_price BETWEEN :minPrice AND :maxPrice " +
            "ORDER BY p.sale_price ASC LIMIT 5", nativeQuery = true)
    List<Product> findTop5ForChatbot(@Param("keyword") String keyword,
                                     @Param("minPrice") Double minPrice,
                                     @Param("maxPrice") Double maxPrice);

    @Query(value = "SELECT * FROM products WHERE category_id = :categoryId AND id != :productId AND is_active = true ORDER BY RAND() LIMIT 10", nativeQuery = true)
    List<Product> findRelatedProducts(@Param("categoryId") Integer categoryId, @Param("productId") Integer productId);

    // Sản Phẩm Nổi Bật
    List<Product> findByIsFeaturedTrue(Pageable pageable);

    // Sản Phẩm Bán Chạy: Sắp xếp theo số lượng đã bán
    List<Product> findByOrderBySoldDesc(Pageable pageable);
    
 // 1. Tính tổng số lượng tồn kho của tất cả sản phẩm
    @Query("SELECT SUM(p.stock) FROM Product p")
    Long sumTotalStock();

    // 2. Đếm số lượng sản phẩm đang được bán (isActive = true)
    @Query("SELECT COUNT(p) FROM Product p WHERE p.isActive = true")
    Long countActiveProducts();

    // 3. Đếm số lượng sản phẩm có tồn kho thấp (từ 1 đến 10)
    @Query("SELECT COUNT(p) FROM Product p WHERE p.stock > 0 AND p.stock <= 10")
    Long countLowStockProducts();

    // 4. Tính tổng giá trị tồn kho (Dựa trên giá bán * tồn kho)
    @Query("SELECT SUM(p.stock * p.salePrice) FROM Product p WHERE p.stock > 0")
    java.math.BigDecimal sumTotalInventoryValue();
    
    @Modifying
    @Query("UPDATE Product p SET p.sold = CASE WHEN COALESCE(p.sold, 0) >= :quantity THEN COALESCE(p.sold, 0) - :quantity ELSE 0 END WHERE p.id = :productId")
    void decreaseSold(@Param("productId") Integer productId, @Param("quantity") Integer quantity);
}
