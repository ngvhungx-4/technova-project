package com.vmas.OrderService.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value; // Import này quan trọng
import org.springframework.stereotype.Component;
import java.security.Key;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretKey;

    public Integer extractUserId(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSignKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            return claims.get("user_id", Integer.class);
        } catch (Exception e) {
            System.err.println("Lỗi giải mã Token: " + e.getMessage());
            return null;
        }
    }
    
 // Hàm mới: Giải mã Token để lấy Email (Username) của người dùng
    public String extractUsername(String token) {
        // Loại bỏ tiền tố "Bearer " nếu có để lấy đúng chuỗi Token
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        try {
            // Phân tích Token bằng khóa bí mật
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSignKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            
            // Trả về Subject (nơi lưu trữ Email khi Token được tạo ra)
            return claims.getSubject();
        } catch (Exception e) {
            System.err.println("Lỗi giải mã Token (Username): " + e.getMessage());
            return null;
        }
    }

    private Key getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}