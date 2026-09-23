package com.vmas.ProductService.controller;

import com.vmas.ProductService.service.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    // API Tải ảnh lên (Yêu cầu quyền ADMIN)
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String fileUrl = uploadService.saveFile(file);
            return ResponseEntity.ok(fileUrl);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi tải ảnh: " + e.getMessage());
        }
    }
 // Thêm vào UploadController.java
    @PreAuthorize("hasAuthority('ADMIN') or hasRole('ADMIN')")
    @DeleteMapping("/upload")
    public ResponseEntity<?> deleteImage(@RequestParam("fileUrl") String fileUrl) {
        try {
            uploadService.deleteFile(fileUrl);
            return ResponseEntity.ok("Đã dọn dẹp ảnh rác thành công");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi xóa ảnh: " + e.getMessage());
        }
    }
}