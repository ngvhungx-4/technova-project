package com.vmas.ProductService.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class UploadService {
    // Thư mục gốc để lưu ảnh
    private final Path rootLocation = Paths.get("uploads");

    public String saveFile(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("File không được để trống");
            }

            // Tạo thư mục nếu chưa tồn tại
            if (!Files.exists(rootLocation)) {
                Files.createDirectories(rootLocation);
            }

            // Tạo tên file ngẫu nhiên để không bị trùng lặp (Ví dụ: product_123abc_image.png)
            String fileName = "product_" + UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = rootLocation.resolve(fileName);

            // Lưu file vào thư mục
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Trả về đường dẫn URL của ảnh (Cổng của ProductService là 8082)
            return "http://localhost:8082/uploads/" + fileName;

        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi lưu file ảnh: " + e.getMessage());
        }
    }
 // Thêm vào UploadService.java
    public void deleteFile(String fileUrl) {
        try {
            if (fileUrl == null || fileUrl.trim().isEmpty()) return;
            
            // Lấy tên file từ URL (Ví dụ: Cắt lấy "product_123abc_image.png" từ "http://localhost:8082/uploads/...")
            String fileName = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            Path filePath = rootLocation.resolve(fileName);
            
            // Xóa file vật lý trên ổ cứng nếu nó tồn tại
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            System.err.println("Lỗi khi xóa file rác: " + e.getMessage());
        }
    }
}