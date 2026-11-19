package com.codesync.backend.controller;

import com.codesync.backend.service.ExecutionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/execute")
public class ExecutionController {
    @Autowired
    private ExecutionService executionService;

    @PostMapping
    public ResponseEntity<?> execute(@RequestBody Map<String, String> body) {
        try {
            String code = body.get("code");
            String language = body.get("language");
            String stdin = body.get("stdin");
            return ResponseEntity.ok(executionService.executeCode(code, language, stdin));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }
}
