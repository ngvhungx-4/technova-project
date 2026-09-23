package com.vmas.CartService;

import org.springframework.boot.SpringApplication; 
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling; // Import thư viện

@SpringBootApplication 
@EnableScheduling // THÊM DÒNG NÀY ĐỂ BẬT LẬP LỊCH
public class CartServiceApplication { 
    public static void main(String[] args) { 
        SpringApplication.run(CartServiceApplication.class, args); 
    }
}
