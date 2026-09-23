package com.service.ApiGateway.filter;

import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Predicate;

@Component
public class RouteValidator {

    // 1. Đã thêm các API Giỏ hàng, Đặt hàng và Đánh giá vào danh sách công khai
    public static final List<String> openApiEndpoints = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/verify-register",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/chat",
            "/api/vouchers/public/active",
            "/api/vouchers/validate",
            "/api/payment/payos",
            "/api/cart",
            "/api/orders",
            "/api/products/guest/reviews",
            "/api/locations",
            "/api/flash-sales/public"
    );

    public static final List<String> openGetEndpoints = List.of(
            "/api/categories",
            "/api/products",
            "/api/flash-sales/public"
    );

    public Predicate<ServerHttpRequest> isSecured = request -> {
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        // BƯỚC 1: ƯU TIÊN KIỂM TRA QUYỀN ADMIN
        // Chặn ngay lập tức nếu URL chứa /admin (Bảo vệ an toàn tuyệt đối)
        if (path.contains("/admin") || path.contains("/internal")) return true;

        // BƯỚC 2: Cho phép các API công khai đi qua (Khách vãng lai)
        boolean isOpenApi = openApiEndpoints.stream().anyMatch(path::contains);
        if (isOpenApi) return false;

        // BƯỚC 3: Cho phép các API GET công khai đi qua
        boolean isOpenGetApi = openGetEndpoints.stream().anyMatch(path::startsWith);
        if (isOpenGetApi && HttpMethod.GET.equals(method)) return false;

        return true;
    };
}