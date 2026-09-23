package com.vmas.CartService.service;

import com.vmas.CartService.dto.AddToCartRequest;
import com.vmas.CartService.dto.CartResponse;
import com.vmas.CartService.entity.Cart;
import com.vmas.CartService.entity.CartItem;
import com.vmas.CartService.integration.ProductClient;
import com.vmas.CartService.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final ProductClient productClient;

    @Transactional
    public CartResponse getCart(Integer userId, String sessionId) {
        Cart cart = getOrCreateCart(userId, sessionId);
        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartResponse addToCart(Integer userId, String sessionId, AddToCartRequest request) {
        Cart cart = getOrCreateCart(userId, sessionId);
        
        Optional<CartItem> existingItem = cart.getItems().stream()
                .filter(item -> {
                    boolean sameProduct = item.getProductId().equals(request.getProductId());
                    String dbColor = item.getSelectedColor();
                    String reqColor = request.getSelectedColor();
                    boolean sameColor = false;
                    if (dbColor == null && reqColor == null) {
                        sameColor = true;
                    } else if (dbColor != null && reqColor != null) {
                        sameColor = dbColor.trim().equalsIgnoreCase(reqColor.trim());
                    }
                    return sameProduct && sameColor;
                })
                .findFirst();

        int targetQuantity = request.getQuantity();
        if (existingItem.isPresent()) {
            targetQuantity += existingItem.get().getQuantity();
        }

        // Lấy giá trị sản phẩm dựa trên số lượng khách muốn mua
        ProductClient.ProductDTO product = productClient.getProductById(request.getProductId(), targetQuantity, userId);

        // Chặn không cho mua vượt quá tồn kho thực
        if (targetQuantity > product.getStock()) {
            targetQuantity = product.getStock();
        }

        if (existingItem.isPresent()) {
            existingItem.get().setQuantity(targetQuantity);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .productId(request.getProductId())
                    .skuId(product.getSku())
                    .selectedColor(request.getSelectedColor())
                    .quantity(targetQuantity)
                    .isSelected(true)
                    .build();
            cart.getItems().add(newItem);
        }

        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(Integer userId, String sessionId, Integer itemId, Integer quantity, Boolean isSelected) {
        Cart cart = getOrCreateCart(userId, sessionId);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Sản phẩm không có trong giỏ hàng"));

        if (quantity != null) {
            if (quantity <= 0) {
                cart.getItems().remove(item);
            } else {
                // Truyền quantity vào để lấy đúng giá trị
            	ProductClient.ProductDTO product = productClient.getProductById(item.getProductId(), quantity, userId);
                if (quantity > product.getStock()) {
                    quantity = product.getStock();
                }
                item.setQuantity(quantity);
            }
        }

        if (isSelected != null) {
            item.setIsSelected(isSelected);
        }

        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }
    
    @Transactional
    public CartResponse selectAllItems(Integer userId, String sessionId, Boolean isSelected) {
        Cart cart = getOrCreateCart(userId, sessionId);
        for (CartItem item : cart.getItems()) {
            item.setIsSelected(isSelected);
        }

        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(Integer userId, String sessionId, Integer itemId) {
        Cart cart = getOrCreateCart(userId, sessionId);
        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        refreshCartPrices(cart);
        cartRepository.save(cart);
        return mapToResponse(cart);
    }

 // Thay đổi tham số để nhận cả hai
    private Cart getOrCreateCart(Integer userId, String sessionId) {
        if (userId != null) {
            return cartRepository.findByUserId(userId)
                    .orElseGet(() -> cartRepository.save(Cart.builder().userId(userId).build()));
        } else if (sessionId != null && !sessionId.isEmpty()) {
            return cartRepository.findBySessionId(sessionId)
                    .orElseGet(() -> cartRepository.save(Cart.builder().sessionId(sessionId).build()));
        }
        throw new RuntimeException("Phải cung cấp userId hoặc sessionId để thao tác giỏ hàng");
    }

    private void refreshCartPrices(Cart cart) {
        BigDecimal total = BigDecimal.ZERO;
        for (CartItem item : cart.getItems()) {
            if (Boolean.TRUE.equals(item.getIsSelected())) {
                // Sửa dòng này: Thêm item.getQuantity() vào
            	ProductClient.ProductDTO product = productClient.getProductById(item.getProductId(), item.getQuantity(), cart.getUserId());
                BigDecimal lineTotal = product.getSalePrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                total = total.add(lineTotal);
            }
        }
        cart.setTotalAmount(total);
    }

    private CartResponse mapToResponse(Cart cart) {
        List<CartResponse.CartItemDTO> items = cart.getItems().stream().map(item -> {
        	ProductClient.ProductDTO product = productClient.getProductById(item.getProductId(), item.getQuantity(), cart.getUserId());

            String colorFromCart = item.getSelectedColor(); 
            String finalImage = product.getThumbnail();
            String displayColorName = null;

            if (product.getColors() != null && !product.getColors().isEmpty() && colorFromCart != null) {
                for (ProductClient.ColorDTO color : product.getColors()) {
                    if (color.getColorName() != null && 
                        color.getColorName().trim().equalsIgnoreCase(colorFromCart.trim())) {
                        
                        if (color.getColorImageUrl() != null && !color.getColorImageUrl().isEmpty()) {
                            finalImage = color.getColorImageUrl();
                        }
                        displayColorName = color.getColorName();
                        break;
                    }
                }
            }
            
            return CartResponse.CartItemDTO.builder()
                    .id(item.getId())
                    .productId(item.getProductId())
                    .productName(product.getName())
                    .productThumbnail(finalImage)
                    .price(product.getSalePrice())
                    .basePrice(product.getBasePrice())
                    .quantity(item.getQuantity())
                    .subTotal(product.getSalePrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .isSelected(item.getIsSelected())
                    .stock(product.getStock())
                    .skuId(item.getSkuId() != null ? item.getSkuId() : product.getSku()) 
                    .selectedColor(displayColorName) 
                    .build();
        }).collect(Collectors.toList());

        return CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .totalAmount(cart.getTotalAmount())
                .totalItems(items.size())
                .items(items)
                .build();
    }
}