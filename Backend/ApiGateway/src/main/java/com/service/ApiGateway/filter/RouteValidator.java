package com.service.ApiGateway.filter;

import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Predicate;

@Component
public class RouteValidator {

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

        if (path.contains("/admin") || path.contains("/internal")) return true;

        boolean isOpenApi = openApiEndpoints.stream().anyMatch(path::contains);
        if (isOpenApi) return false;

        boolean isOpenGetApi = openGetEndpoints.stream().anyMatch(path::startsWith);
        if (isOpenGetApi && HttpMethod.GET.equals(method)) return false;

        return true;
    };
}