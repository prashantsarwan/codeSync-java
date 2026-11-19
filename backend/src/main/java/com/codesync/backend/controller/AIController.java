package com.codesync.backend.controller;

import com.codesync.backend.service.AIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {
    @Autowired
    private AIService aiService;

    @PostMapping("/review")
    public ResponseEntity<?> review(@RequestBody Map<String, String> body) {
        try {
            String response = aiService.reviewCode(
                body.get("action"),
                body.get("code"),
                body.getOrDefault("language", "javascript"),
                body.getOrDefault("query", "")
            );
            return ResponseEntity.ok(Map.of("response", response));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }
}
