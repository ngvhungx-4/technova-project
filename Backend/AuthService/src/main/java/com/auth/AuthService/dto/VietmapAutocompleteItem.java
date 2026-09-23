package com.auth.AuthService.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true) // Bỏ qua các trường (boundaries, data_new...) mà mình không cần dùng tới
public class VietmapAutocompleteItem {
    
    @JsonProperty("ref_id")
    private String refId;
    
    private String address;
    private String name;
    private String display;
}