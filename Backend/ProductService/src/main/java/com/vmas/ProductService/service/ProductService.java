package com.vmas.ProductService.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vmas.ProductService.dto.ProductPageResponse;
import com.vmas.ProductService.dto.ProductResponse;
import com.vmas.ProductService.dto.ProductStockResponse;
import com.vmas.ProductService.entity.Brand;
import com.vmas.ProductService.entity.Category;
import com.vmas.ProductService.entity.Product;
import com.vmas.ProductService.entity.ProductColor; // Import mới
import com.vmas.ProductService.entity.ProductImage; // Import mới
import com.vmas.ProductService.repository.CategoryRepository;
import com.vmas.ProductService.repository.ProductRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vmas.ProductService.entity.StockStatus;
import com.vmas.ProductService.dto.ProductCategoryInfoResponse;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;
import com.vmas.ProductService.dto.StockUpdateRequest;
import com.vmas.ProductService.dto.ProductRequest;
import com.vmas.ProductService.dto.CategoryStatResponse;
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectMapper objectMapper;
    private final CategoryService categoryService;
    
    @PersistenceContext
    private EntityManager entityManager;
    
 // Từ điển chuẩn hóa từ khóa tìm kiếm cấu hình (Chữ thường toàn bộ)
    private static final Map<String, List<String>> SPEC_ALIASES = new HashMap<>();
    static {
        // Chuẩn hóa cho Card Onboard
        List<String> onboardGraphics = Arrays.asList("intel", "uhd", "iris", "radeon graphics");
        SPEC_ALIASES.put("card onboard", onboardGraphics);
        SPEC_ALIASES.put("card tích hợp", onboardGraphics);
        SPEC_ALIASES.put("vga onboard", onboardGraphics);

        SPEC_ALIASES.put("intel uhd graphics", Arrays.asList("uhd", "intel uhd", "intel uhd graphics"));
        SPEC_ALIASES.put("intel iris xe", Arrays.asList("iris xe", "intel iris xe graphics", "iris xe graphics"));
        SPEC_ALIASES.put("intel arc graphics", Arrays.asList("intel arc", "arc graphics", "intel arc graphics"));
        SPEC_ALIASES.put("amd radeon graphics", Arrays.asList("radeon graphics", "amd radeon graphics"));
 
        // ===================== 2. GPU RỜI (DEDICATED - NVIDIA / AMD) =====================
        SPEC_ALIASES.put("rtx 2050", Arrays.asList("rtx 2050", "rtx2050", "geforce rtx 2050", "nvidia geforce rtx 2050"));
        SPEC_ALIASES.put("rtx 3050", Arrays.asList("rtx 3050", "rtx3050", "geforce rtx 3050"));
        SPEC_ALIASES.put("rtx 3050 ti", Arrays.asList("rtx 3050 ti", "rtx 3050ti", "geforce rtx 3050 ti"));
        SPEC_ALIASES.put("rtx 3060", Arrays.asList("rtx 3060", "rtx3060", "geforce rtx 3060"));
        SPEC_ALIASES.put("rtx 4050", Arrays.asList("rtx 4050", "rtx4050", "geforce rtx 4050"));
        SPEC_ALIASES.put("rtx 4060", Arrays.asList("rtx 4060", "rtx4060", "geforce rtx 4060"));
        SPEC_ALIASES.put("rtx 4070", Arrays.asList("rtx 4070", "rtx4070", "geforce rtx 4070"));
        SPEC_ALIASES.put("rtx 4080", Arrays.asList("rtx 4080", "rtx4080", "geforce rtx 4080"));
        SPEC_ALIASES.put("rtx 4090", Arrays.asList("rtx 4090", "rtx4090", "geforce rtx 4090"));
        SPEC_ALIASES.put("rtx 5050", Arrays.asList("rtx 5050", "rtx5050", "geforce rtx 5050"));
        SPEC_ALIASES.put("rtx 5070", Arrays.asList("rtx 5070", "rtx5070", "geforce rtx 5070"));
        SPEC_ALIASES.put("rtx 5070 ti", Arrays.asList("rtx 5070 ti", "rtx 5070ti", "geforce rtx 5070 ti"));
        SPEC_ALIASES.put("gtx 1650", Arrays.asList("gtx 1650", "gtx1650", "geforce gtx 1650"));
        SPEC_ALIASES.put("gtx 1650 ti", Arrays.asList("gtx 1650 ti", "gtx 1650ti", "geforce gtx 1650 ti"));
        SPEC_ALIASES.put("gtx 1660 ti", Arrays.asList("gtx 1660 ti", "gtx 1660ti", "geforce gtx 1660 ti"));
        SPEC_ALIASES.put("radeon rx", Arrays.asList("radeon rx", "amd radeon rx"));
 
        // ===================== 3. CPU INTEL =====================
        SPEC_ALIASES.put("i3", Arrays.asList("i3", "core i3", "intel core i3"));
        SPEC_ALIASES.put("i5", Arrays.asList("i5", "core i5", "intel core i5"));
        SPEC_ALIASES.put("i7", Arrays.asList("i7", "core i7", "intel core i7"));
        SPEC_ALIASES.put("i9", Arrays.asList("i9", "core i9", "intel core i9"));
        SPEC_ALIASES.put("core ultra 5", Arrays.asList("ultra 5", "core ultra 5", "intel core ultra 5"));
        SPEC_ALIASES.put("core ultra 7", Arrays.asList("ultra 7", "core ultra 7", "intel core ultra 7"));
        SPEC_ALIASES.put("core ultra 9", Arrays.asList("ultra 9", "core ultra 9", "intel core ultra 9"));
        SPEC_ALIASES.put("celeron", Arrays.asList("celeron", "intel celeron"));
        SPEC_ALIASES.put("pentium", Arrays.asList("pentium", "intel pentium"));
 
        // ===================== 4. CPU AMD RYZEN =====================
        SPEC_ALIASES.put("ryzen 3", Arrays.asList("ryzen 3", "amd ryzen 3"));
        SPEC_ALIASES.put("ryzen 5", Arrays.asList("ryzen 5", "amd ryzen 5"));
        SPEC_ALIASES.put("ryzen 7", Arrays.asList("ryzen 7", "amd ryzen 7"));
        SPEC_ALIASES.put("ryzen 9", Arrays.asList("ryzen 9", "amd ryzen 9"));
        SPEC_ALIASES.put("ryzen ai", Arrays.asList("ryzen ai", "amd ryzen ai"));
 
        // ===================== 5. CHIP APPLE SILICON (MACBOOK) =====================
        SPEC_ALIASES.put("apple m1", Arrays.asList("m1", "apple m1", "chip m1", "chip apple m1"));
        SPEC_ALIASES.put("apple m2", Arrays.asList("m2", "apple m2", "chip m2", "chip apple m2"));
        SPEC_ALIASES.put("apple m3", Arrays.asList("m3", "apple m3", "chip m3", "chip apple m3"));
        SPEC_ALIASES.put("apple m4", Arrays.asList("m4", "apple m4", "chip m4", "chip apple m4"));
        SPEC_ALIASES.put("apple m5", Arrays.asList("m5", "apple m5", "chip m5", "chip apple m5"));
        SPEC_ALIASES.put("apple m pro", Arrays.asList(" pro", "m pro", "apple m pro"));
        SPEC_ALIASES.put("apple m max", Arrays.asList(" max", "m max", "apple m max"));
 
        // ===================== 6. CHIPSET ĐIỆN THOẠI - SNAPDRAGON =====================
        SPEC_ALIASES.put("snapdragon 8 elite", Arrays.asList("snapdragon 8 elite", "sd 8 elite", "8 elite"));
        SPEC_ALIASES.put("snapdragon 8 gen 3", Arrays.asList("snapdragon 8 gen 3", "sd 8 gen 3", "8 gen 3"));
        SPEC_ALIASES.put("snapdragon 8 gen 2", Arrays.asList("snapdragon 8 gen 2", "sd 8 gen 2", "8 gen 2"));
        SPEC_ALIASES.put("snapdragon 8 gen 1", Arrays.asList("snapdragon 8 gen 1", "sd 8 gen 1", "8 gen 1"));
        SPEC_ALIASES.put("snapdragon 888", Arrays.asList("snapdragon 888", "sd 888"));
        SPEC_ALIASES.put("snapdragon 7 gen 3", Arrays.asList("snapdragon 7 gen 3", "sd 7 gen 3"));
        SPEC_ALIASES.put("snapdragon 7 gen 1", Arrays.asList("snapdragon 7 gen 1", "sd 7 gen 1"));
        SPEC_ALIASES.put("snapdragon 6 gen 1", Arrays.asList("snapdragon 6 gen 1", "sd 6 gen 1"));
 
        // ===================== 7. CHIPSET ĐIỆN THOẠI - APPLE A-SERIES =====================
        SPEC_ALIASES.put("apple a15", Arrays.asList("a15", "apple a15", "a15 bionic"));
        SPEC_ALIASES.put("apple a16", Arrays.asList("a16", "apple a16", "a16 bionic"));
        SPEC_ALIASES.put("apple a17", Arrays.asList("a17", "apple a17", "a17 pro"));
        SPEC_ALIASES.put("apple a18", Arrays.asList("a18", "apple a18"));
        SPEC_ALIASES.put("apple a18 pro", Arrays.asList("a18 pro", "apple a18 pro"));
        SPEC_ALIASES.put("apple a19", Arrays.asList("a19", "apple a19"));
 
        // ===================== 8. CHIPSET ĐIỆN THOẠI - MEDIATEK / EXYNOS / UNISOC =====================
        SPEC_ALIASES.put("dimensity", Arrays.asList("dimensity", "mediatek dimensity"));
        SPEC_ALIASES.put("exynos", Arrays.asList("exynos", "samsung exynos"));
        SPEC_ALIASES.put("unisoc", Arrays.asList("unisoc"));
 
        // ===================== 9. DUNG LƯỢNG RAM / BỘ NHỚ TRONG =====================
        // Dùng chung cho cả RAM và dung lượng lưu trữ (SSD/ROM) vì cách chuẩn hóa văn bản giống nhau
        SPEC_ALIASES.put("2gb", Arrays.asList("2gb", "2 gb"));
        SPEC_ALIASES.put("3gb", Arrays.asList("3gb", "3 gb"));
        SPEC_ALIASES.put("4gb", Arrays.asList("4gb", "4 gb"));
        SPEC_ALIASES.put("6gb", Arrays.asList("6gb", "6 gb"));
        SPEC_ALIASES.put("8gb", Arrays.asList("8gb", "8 gb"));
        SPEC_ALIASES.put("12gb", Arrays.asList("12gb", "12 gb"));
        SPEC_ALIASES.put("16gb", Arrays.asList("16gb", "16 gb"));
        SPEC_ALIASES.put("24gb", Arrays.asList("24gb", "24 gb"));
        SPEC_ALIASES.put("32gb", Arrays.asList("32gb", "32 gb"));
        SPEC_ALIASES.put("36gb", Arrays.asList("36gb", "36 gb"));
        SPEC_ALIASES.put("48gb", Arrays.asList("48gb", "48 gb"));
        SPEC_ALIASES.put("64gb", Arrays.asList("64gb", "64 gb"));
        SPEC_ALIASES.put("128gb", Arrays.asList("128gb", "128 gb"));
        SPEC_ALIASES.put("256gb", Arrays.asList("256gb", "256 gb"));
        SPEC_ALIASES.put("512gb", Arrays.asList("512gb", "512 gb"));
        SPEC_ALIASES.put("1tb", Arrays.asList("1tb", "1 tb", "1024gb", "1024 gb"));
        SPEC_ALIASES.put("2tb", Arrays.asList("2tb", "2 tb", "2048gb", "2048 gb"));
 
        // ===================== 10. LOẠI RAM =====================
        SPEC_ALIASES.put("ddr4", Arrays.asList("ddr4", "ddr 4"));
        SPEC_ALIASES.put("ddr5", Arrays.asList("ddr5", "ddr 5"));
        SPEC_ALIASES.put("lpddr4x", Arrays.asList("lpddr4x", "lpddr4-x", "lpddr 4x"));
        SPEC_ALIASES.put("lpddr5", Arrays.asList("lpddr5", "lpddr 5"));
        SPEC_ALIASES.put("lpddr5x", Arrays.asList("lpddr5x", "lpddr5-x", "lpddr 5x"));
 
        // ===================== 11. HỆ ĐIỀU HÀNH =====================
        SPEC_ALIASES.put("windows 11", Arrays.asList(
                "windows 11", "windows 11 home", "windows 11 home single language", "windows 11 home sl", "win 11"));
        SPEC_ALIASES.put("macos", Arrays.asList("macos", "mac os"));
        SPEC_ALIASES.put("android", Arrays.asList("android"));
        SPEC_ALIASES.put("ios", Arrays.asList("ios"));
        SPEC_ALIASES.put("watchos", Arrays.asList("watchos", "watch os"));
        SPEC_ALIASES.put("tizen os", Arrays.asList("tizen", "tizen os"));
        SPEC_ALIASES.put("webos", Arrays.asList("webos", "web os"));
        SPEC_ALIASES.put("google tv", Arrays.asList("google tv"));
 
        // ===================== 12. TẦN SỐ QUÉT MÀN HÌNH =====================
        SPEC_ALIASES.put("60hz", Arrays.asList("60hz", "60 hz"));
        SPEC_ALIASES.put("90hz", Arrays.asList("90hz", "90 hz"));
        SPEC_ALIASES.put("100hz", Arrays.asList("100hz", "100 hz"));
        SPEC_ALIASES.put("120hz", Arrays.asList("120hz", "120 hz"));
        SPEC_ALIASES.put("144hz", Arrays.asList("144hz", "144 hz"));
        SPEC_ALIASES.put("165hz", Arrays.asList("165hz", "165 hz"));
        SPEC_ALIASES.put("180hz", Arrays.asList("180hz", "180 hz"));
        SPEC_ALIASES.put("240hz", Arrays.asList("240hz", "240 hz"));
 
        // ===================== 13. ĐỘ PHÂN GIẢI MÀN HÌNH =====================
        SPEC_ALIASES.put("full hd", Arrays.asList("fullhd", "full hd", "fhd"));
        SPEC_ALIASES.put("full hd+", Arrays.asList("fullhd+", "full hd+", "fhd+"));
        SPEC_ALIASES.put("qhd+", Arrays.asList("qhd+", "quad hd+"));
        SPEC_ALIASES.put("4k", Arrays.asList("4k", "uhd 4k"));
        SPEC_ALIASES.put("wuxga", Arrays.asList("wuxga"));
        SPEC_ALIASES.put("wqxga", Arrays.asList("wqxga"));
 
        // ===================== 14. CHUẨN WIFI =====================
        SPEC_ALIASES.put("wifi 5", Arrays.asList("wifi 5", "wi-fi 5", "802.11ac"));
        SPEC_ALIASES.put("wifi 6", Arrays.asList("wifi 6", "wi-fi 6", "802.11ax"));
        SPEC_ALIASES.put("wifi 6e", Arrays.asList("wifi 6e", "wi-fi 6e"));
        SPEC_ALIASES.put("wifi 7", Arrays.asList("wifi 7", "wi-fi 7", "802.11be"));
 
        // ===================== 15. PHIÊN BẢN BLUETOOTH =====================
        SPEC_ALIASES.put("bluetooth 5.0", Arrays.asList("bluetooth 5.0", "bluetooth v5.0", "v5.0"));
        SPEC_ALIASES.put("bluetooth 5.1", Arrays.asList("bluetooth 5.1", "bluetooth v5.1", "v5.1"));
        SPEC_ALIASES.put("bluetooth 5.2", Arrays.asList("bluetooth 5.2", "bluetooth v5.2", "v5.2"));
        SPEC_ALIASES.put("bluetooth 5.3", Arrays.asList("bluetooth 5.3", "bluetooth v5.3", "v5.3"));
        SPEC_ALIASES.put("bluetooth 5.4", Arrays.asList("bluetooth 5.4", "bluetooth v5.4", "v5.4"));
 
        // ===================== 16. THƯƠNG HIỆU =====================
        SPEC_ALIASES.put("apple", Arrays.asList("apple", "apple chính hãng"));
        SPEC_ALIASES.put("samsung", Arrays.asList("samsung", "samsung chính hãng"));
    }

 // LẤY CHI TIẾT SẢN PHẨM THEO ID
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm có ID: " + id));
        return mapToResponse(product);
    }

 // LẤY SẢN PHẨM THEO DANH MỤC
    @Transactional(readOnly = true)
    public ProductPageResponse getProductsByCategory(Integer categoryId, int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) 
                    ? Sort.by(sortBy).ascending() 
                    : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        List<Integer> allCategoryIds = getAllDescendantIds(categoryId);
        Page<Product> productPage = productRepository.findByCategory_IdIn(allCategoryIds, pageable);
        
        List<ProductResponse> content = productPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ProductPageResponse.builder()
                .content(content)
                .pageNo(productPage.getNumber())
                .pageSize(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .last(productPage.isLast())
                .build();
    }

    private List<Integer> getAllDescendantIds(Integer parentId) {
        List<Integer> result = new ArrayList<>();
        result.add(parentId);
        List<Category> children = categoryRepository.findByParent_Id(parentId);
        for (Category child : children) {
            result.addAll(getAllDescendantIds(child.getId()));
        }
        return result;
    }

    private Map<String, Object> getCategoryConfigRecursive(Category category) {
        if (category == null) return null;

        if (category.getDisplayConfig() != null && !category.getDisplayConfig().isEmpty()) {
            try {
                return objectMapper.readValue(category.getDisplayConfig(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                System.err.println("Lỗi parse config category " + category.getId() + ": " + e.getMessage());
            }
        }

        return getCategoryConfigRecursive(category.getParent());
    }
    
    private ProductResponse mapToResponse(Product product) {
        Map<String, Object> specsMap = Collections.emptyMap();
        try {
            if (product.getSpecs() != null && !product.getSpecs().isEmpty()) {
                specsMap = objectMapper.readValue(product.getSpecs(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (JsonProcessingException e) { /*...*/ }

        List<String> images = new ArrayList<>();
        if (product.getImages() != null) {
            images = product.getImages().stream().map(ProductImage::getImageUrl).collect(Collectors.toList());
        }
        List<ProductResponse.ColorDTO> colors = new ArrayList<>();
        if (product.getColors() != null) {
            colors = product.getColors().stream().map(c -> ProductResponse.ColorDTO.builder()
                    .colorName(c.getColorName()).colorImageUrl(c.getColorImageUrl()).build()).collect(Collectors.toList());
        }

        Map<String, Object> categoryConfigMap = getCategoryConfigRecursive(product.getCategory());

        return ProductResponse.builder()
                .id(product.getId())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .sku(product.getSku())
                .name(product.getName())
                .thumbnail(product.getThumbnail())
                .salePrice(product.getSalePrice())
                .basePrice(product.getBasePrice())
                .costPrice(product.getCostPrice())
                .sold(product.getSold() != null ? product.getSold() : 0)
                .stock(product.getStock())
                .stockStatus(product.getStockStatus())
                .isActive(product.getIsActive())
                .specs(specsMap)
                .images(images)
                .colors(colors)
                .categoryConfig(categoryConfigMap) 
                .build();
    }
    
    @Transactional
    public void decreaseStock(List<StockUpdateRequest> requests) {
        for (StockUpdateRequest req : requests) {
            int updatedRows = productRepository.decreaseStock(req.getProductId(), req.getQuantity());
            if (updatedRows == 0) {
                throw new RuntimeException("Sản phẩm ID " + req.getProductId() + " không đủ tồn kho để đặt hàng!");
            }
        }
    }
    @Transactional
    public void decreaseSold(List<StockUpdateRequest> requests) {
        for (StockUpdateRequest req : requests) {
            productRepository.decreaseSold(req.getProductId(), req.getQuantity());
        }
    }

    @Transactional
    public void increaseStock(List<StockUpdateRequest> requests) {
        for (StockUpdateRequest req : requests) {
            productRepository.increaseStock(req.getProductId(), req.getQuantity());
        }
    }

    @Transactional
    public void increaseSold(List<StockUpdateRequest> requests) {
        for (StockUpdateRequest req : requests) {
            productRepository.increaseSold(req.getProductId(), req.getQuantity());
        }
    }
    
    @Transactional(readOnly = true)
    public ProductPageResponse getAllProductsForAdmin(String keyword, Integer categoryId, String statusStr, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        StockStatus status = null;
        if (statusStr != null && !statusStr.trim().isEmpty()) {
            try { status = StockStatus.valueOf(statusStr.toUpperCase()); } 
            catch (IllegalArgumentException e) { }
        }

        boolean hasCategory = false;
        List<Integer> categoryIds = new ArrayList<>();
        
        if (categoryId != null) {
            hasCategory = true;
            categoryIds = getAllDescendantIds(categoryId); 
        } else {
            categoryIds.add(-1); 
        }

        Page<Product> productPage = productRepository.searchProductsForAdmin(keyword, hasCategory, categoryIds, status, pageable);

        List<ProductResponse> content = productPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ProductPageResponse.builder()
                .content(content)
                .pageNo(productPage.getNumber())
                .pageSize(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .last(productPage.isLast())
                .build();
    }
    
    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục!"));

        String specsJson = "{}";
        try {
            if (request.getSpecs() != null) {
                specsJson = objectMapper.writeValueAsString(request.getSpecs());
            }
        } catch (Exception e) { e.printStackTrace(); }

        Product product = Product.builder()
                .name(request.getName())
                .sku(request.getSku())
                .category(category)
                .costPrice(request.getCostPrice())
                .basePrice(request.getBasePrice())
                .salePrice(request.getSalePrice())
                .stock(request.getStock())
                .stockStatus(StockStatus.valueOf(request.getStockStatus()))
                .isActive(request.getIsActive())
                .isFeatured(request.getIsFeatured())
                .thumbnail(request.getThumbnail())
                .specs(specsJson)
                .sold(0)
                .build();

        Product savedProduct = productRepository.save(product);

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            List<ProductImage> productImages = request.getImages().stream()
                    .map(url -> ProductImage.builder().product(savedProduct).imageUrl(url).build())
                    .collect(Collectors.toList());
            savedProduct.setImages(productImages);
        }

        if (request.getColors() != null && !request.getColors().isEmpty()) {
            List<ProductColor> productColors = request.getColors().stream()
                    .map(c -> ProductColor.builder()
                            .product(savedProduct)
                            .colorName(c.getColorName())
                            .colorImageUrl(c.getColorImageUrl())
                            .build())
                    .collect(Collectors.toList());
            savedProduct.setColors(productColors);
        }

        return mapToResponse(productRepository.save(savedProduct));
    }

    @Transactional
    public ProductResponse updateProduct(Integer id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + id));
        
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục!"));

        String specsJson = "{}";
        try {
            if (request.getSpecs() != null) {
                specsJson = objectMapper.writeValueAsString(request.getSpecs());
            }
        } catch (Exception e) { 
            System.err.println("Lỗi parse JSON specs khi cập nhật: " + e.getMessage()); 
        }

        product.setName(request.getName());
        product.setSku(request.getSku());
        product.setCategory(category);

        product.setCostPrice(request.getCostPrice());
        product.setBasePrice(request.getBasePrice());
        product.setSalePrice(request.getSalePrice());
        
        product.setStock(request.getStock());
        product.setStockStatus(StockStatus.valueOf(request.getStockStatus()));
        product.setIsActive(request.getIsActive());
        product.setIsFeatured(request.getIsFeatured());
        product.setThumbnail(request.getThumbnail());
        product.setSpecs(specsJson);

        if (product.getImages() == null) {
            product.setImages(new ArrayList<>());
        }
        product.getImages().clear();
        
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            List<ProductImage> newImages = request.getImages().stream()
                    .map(url -> ProductImage.builder()
                            .product(product)
                            .imageUrl(url)
                            .build())
                    .collect(Collectors.toList());
            product.getImages().addAll(newImages);
        }

        if (product.getColors() == null) {
            product.setColors(new ArrayList<>());
        }
        product.getColors().clear();
        
        if (request.getColors() != null && !request.getColors().isEmpty()) {
            List<ProductColor> newColors = request.getColors().stream()
                    .map(c -> ProductColor.builder()
                            .product(product)
                            .colorName(c.getColorName())
                            .colorImageUrl(c.getColorImageUrl())
                            .build())
                    .collect(Collectors.toList());
            product.getColors().addAll(newColors);
        }

        Product updatedProduct = productRepository.save(product);
        return mapToResponse(updatedProduct);
    }
    
    @Transactional
    public void deleteProduct(Integer id) {
        if (!productRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy sản phẩm có ID: " + id + " để xóa!");
        }

        productRepository.deleteById(id);
    }
    
    @Transactional(readOnly = true)
    public List<CategoryStatResponse> getCategoryStatistics() {
        List<Product> products = productRepository.findAll();
        Map<String, CategoryStatResponse> statMap = new HashMap<>();

        for (Product p : products) {
            String catName = p.getCategory().getName();

            CategoryStatResponse stat = statMap.getOrDefault(catName, new CategoryStatResponse());
            stat.setCategoryName(catName);

            long currentSold = p.getSold() != null ? p.getSold() : 0;
            stat.setTotalSold(stat.getTotalSold() + currentSold);

            BigDecimal currentRevenue = p.getSalePrice().multiply(BigDecimal.valueOf(currentSold));
            if (stat.getTotalRevenue() == null) {
                stat.setTotalRevenue(currentRevenue);
            } else {
                stat.setTotalRevenue(stat.getTotalRevenue().add(currentRevenue));
            }

            stat.setGrowth("+" + (int)(Math.random() * 20 + 5) + "%");
            
            statMap.put(catName, stat);
        }

        return statMap.values().stream()
                .sorted((a, b) -> Long.compare(b.getTotalSold(), a.getTotalSold()))
                .collect(java.util.stream.Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ProductCategoryInfoResponse> getCategoryInfoForProducts(List<Integer> productIds) {
        List<Product> products = productRepository.findAllById(productIds);
        return products.stream().map(p -> 
            ProductCategoryInfoResponse.builder()
                .productId(p.getId())
                .categoryId(p.getCategory().getId())
                .categoryName(p.getCategory().getName())
                .build()
        ).collect(Collectors.toList());
    }
    
 // OPTIONS BỘ LỌC
    public Map<String, Object> getFilterOptions(Integer categoryId) {
        Category category = categoryRepository.findById(categoryId).orElse(null);
        if (category == null) return Collections.emptyMap();

        String configStr = categoryService.getEffectiveDisplayConfig(category);
        if (configStr == null) return Collections.emptyMap();

        try {
            Map<String, Object> config = objectMapper.readValue(configStr, new TypeReference<Map<String, Object>>() {});

            Map<String, Object> predefinedOptions = (Map<String, Object>) config.get("filter");
            if (predefinedOptions == null) predefinedOptions = new LinkedHashMap<>();

            List<Integer> allCategoryIds = getAllDescendantIds(categoryId);
            List<Product> products = productRepository.findByCategory_IdIn(allCategoryIds);

            Set<String> brandNames = new HashSet<>();
            for (Product p : products) {
                if (p.getBrand() != null) {
                    brandNames.add(p.getBrand().getName());
                }
            }

            predefinedOptions.put("brand", new ArrayList<>(brandNames));

            Map<String, Object> response = new HashMap<>();
            response.put("labels", config.get("labels"));
            response.put("filters", predefinedOptions);

            return response;

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyMap();
        }
    }
    
    // TÌM KIẾM SẢN PHẨM
    @Transactional(readOnly = true)
    public ProductPageResponse searchPublicProducts(String keyword, Integer categoryId, BigDecimal minPrice, BigDecimal maxPrice, String brandName, String specs, int page, int size, String sortBy, String sortDir) {

        // SQL lấy data và tổng số trang
        StringBuilder sql = new StringBuilder("SELECT p.* FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE p.is_active = true");
        StringBuilder countSql = new StringBuilder("SELECT COUNT(*) FROM products p LEFT JOIN brands b ON p.brand_id = b.id WHERE p.is_active = true");

        Map<String, Object> params = new HashMap<>();

        // Xử lý Từ khóa
        if (keyword != null && !keyword.trim().isEmpty()) {
            sql.append(" AND LOWER(p.name) LIKE LOWER(:keyword)");
            countSql.append(" AND LOWER(p.name) LIKE LOWER(:keyword)");
            params.put("keyword", "%" + keyword + "%");
        }

        // Xử lý Danh mục
        if (categoryId != null) {
            List<Integer> categoryIds = getAllDescendantIds(categoryId);
            sql.append(" AND p.category_id IN (:categoryIds)");
            countSql.append(" AND p.category_id IN (:categoryIds)");
            params.put("categoryIds", categoryIds);
        }

        // Xử lý Thương hiệu
        if (brandName != null && !brandName.trim().isEmpty()) {
            sql.append(" AND b.name = :brandName");
            countSql.append(" AND b.name = :brandName");
            params.put("brandName", brandName);
        }

        // Xử lý Giá
        if (minPrice != null) {
            sql.append(" AND p.sale_price >= :minPrice");
            countSql.append(" AND p.sale_price >= :minPrice");
            params.put("minPrice", minPrice);
        }
        if (maxPrice != null) {
            sql.append(" AND p.sale_price <= :maxPrice");
            countSql.append(" AND p.sale_price <= :maxPrice");
            params.put("maxPrice", maxPrice);
        }

     // Xử lý bộ lọc cấu hình (Specs) động
        if (specs != null && !specs.trim().isEmpty() && !specs.equals("{}")) {
            try {
                Map<String, Object> specMap = objectMapper.readValue(specs, new TypeReference<Map<String, Object>>() {});
                int paramIndex = 0;

                for (Map.Entry<String, Object> entry : specMap.entrySet()) {
                    String safeKey = entry.getKey().replaceAll("[^a-zA-Z0-9_]", "");
                    Object rawValue = entry.getValue();
                    List<String> valuesToSearch = new ArrayList<>();

                    // Chuyển dữ liệu đầu vào thành dạng mảng (List)
                    if (rawValue instanceof List) {
                        for(Object obj : (List<?>) rawValue) {
                            valuesToSearch.add(obj.toString());
                        }
                    } else if (rawValue != null) {
                        valuesToSearch.add(rawValue.toString());
                    }

                    if (!valuesToSearch.isEmpty()) {
                        StringBuilder specCondition = new StringBuilder(" AND (");
                        StringBuilder countSpecCondition = new StringBuilder(" AND (");
                        boolean firstCondition = true;

                        for (String val : valuesToSearch) {
                            // Chuyển giá trị về chữ thường và tra cứu từ điển
                            String normalizedVal = val.toLowerCase();
                            List<String> searchKeywords = SPEC_ALIASES.getOrDefault(normalizedVal, Collections.singletonList(val));

                            // ĐÃ SỬA: Đổi tên biến từ 'keyword' thành 'specKeyword' để không bị trùng
                            for (String specKeyword : searchKeywords) {
                                if (!firstCondition) {
                                    specCondition.append(" OR ");
                                    countSpecCondition.append(" OR ");
                                }
                                
                                String paramName = "specVal" + paramIndex;
                                String sqlFragment = "LOWER(p.specs->>'$." + safeKey + "') LIKE LOWER(:" + paramName + ")";

                                specCondition.append(sqlFragment);
                                countSpecCondition.append(sqlFragment);

                                // ĐÃ SỬA: Gán giá trị bằng biến specKeyword
                                params.put(paramName, "%" + specKeyword + "%");
                                paramIndex++;
                                firstCondition = false;
                            }
                        }
                        
                        specCondition.append(") ");
                        countSpecCondition.append(") ");

                        sql.append(specCondition);
                        countSql.append(countSpecCondition);
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi phân tích JSON cấu hình: " + e.getMessage());
            }
        }

        // Xử lý Sắp xếp
        String dbSortBy = "salePrice".equalsIgnoreCase(sortBy) ? "p.sale_price" : "p.created_at";
        String dir = sortDir.equalsIgnoreCase("ASC") ? "ASC" : "DESC";
        sql.append(" ORDER BY ").append(dbSortBy).append(" ").append(dir);

        Query query = entityManager.createNativeQuery(sql.toString(), Product.class);
        Query countQuery = entityManager.createNativeQuery(countSql.toString());

        // Đổ tham số vào lệnh SQL
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            query.setParameter(entry.getKey(), entry.getValue());
            countQuery.setParameter(entry.getKey(), entry.getValue());
        }

        // Phân trang
        query.setFirstResult(page * size);
        query.setMaxResults(size);

        // Lấy kết quả
        List<Product> products = query.getResultList();
        long totalElements = ((Number) countQuery.getSingleResult()).longValue();
        int totalPages = (int) Math.ceil((double) totalElements / size);

        List<ProductResponse> content = products.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ProductPageResponse.builder()
                .content(content)
                .pageNo(page)
                .pageSize(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .last(page >= totalPages - 1)
                .build();
    }
    
 // SẢN PHẨM LIÊN QUAN
    public List<Map<String, Object>> getRelatedProducts(Integer productId) {
        // Tìm sản phẩm hiện tại để lấy category_id của nó
        Product currentProduct = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        Integer categoryId = currentProduct.getCategory().getId();

        // Tìm các sản phẩm liên quan
        List<Product> relatedProducts = productRepository.findRelatedProducts(categoryId, productId);

        // Chống lỗi vòng lặp JSON
        return relatedProducts.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("name", p.getName());
            map.put("salePrice", p.getSalePrice());
            map.put("thumbnail", p.getThumbnail());
            map.put("basePrice", p.getBasePrice());
            map.put("stock", p.getStock());
            map.put("sku", p.getSku());
            map.put("sold", p.getSold());
            return map;
        }).toList();
    }

    // Thống kê sản phẩm
    public List<ProductStockResponse> getStockReport(String sortDir) {
        // Sắp xếp tăng dần (Sắp hết) hoặc giảm dần (Tồn nhiều)
        Sort sort = "desc".equalsIgnoreCase(sortDir)
                ? Sort.by("stock").descending()
                : Sort.by("stock").ascending();

        return productRepository.findAll(sort).stream()
                .map(p -> ProductStockResponse.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .stock(p.getStock())
                        .thumbnail(p.getThumbnail())
                        .build())
                .collect(Collectors.toList());
    }

    // Sản Phẩm Nổi Bật
    public List<ProductResponse> getFeaturedProducts() {
        List<Product> products = productRepository.findByIsFeaturedTrue(PageRequest.of(0, 8));
        return products.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // API cho Sản Phẩm Bán Chạy
    public List<ProductResponse> getTopSellingProductsPublic() {
        List<Product> products = productRepository.findByOrderBySoldDesc(PageRequest.of(0, 4));
        return products.stream().map(this::mapToResponse).collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public com.vmas.ProductService.dto.DashboardStatResponse getDashboardOverviewStats() {
        Long totalStock = productRepository.sumTotalStock();
        Long activeProducts = productRepository.countActiveProducts();
        Long lowStockWarning = productRepository.countLowStockProducts();
        java.math.BigDecimal totalValue = productRepository.sumTotalInventoryValue();

        // Xử lý trường hợp DB rỗng (SUM trả về null)
        return com.vmas.ProductService.dto.DashboardStatResponse.builder()
                .totalStock(totalStock != null ? totalStock : 0L)
                .activeProducts(activeProducts != null ? activeProducts : 0L)
                .lowStockWarning(lowStockWarning != null ? lowStockWarning : 0L)
                .totalInventoryValue(totalValue != null ? totalValue : java.math.BigDecimal.ZERO)
                .build();
    }
}
