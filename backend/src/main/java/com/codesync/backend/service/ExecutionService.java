package com.codesync.backend.service;

import okhttp3.*;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExecutionService {
    private static final String PISTON_URL = "https://api.onlinecompiler.io/api/v2/piston/execute";

    // YAHAN QUOTES KE ANDAR APNI KEY PASTE KAREIN
    private static final String API_KEY = "7975f8ab966459bddbc365329247556a";

    private final OkHttpClient client = new OkHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public Map<String, Object> executeCode(String code, String language, String stdin) throws Exception {
        Map<String, Object> config = getConfig(language);

        Map<String, Object> payload = new HashMap<>();
        payload.put("language", config.get("language"));
        payload.put("version", config.get("version"));
        payload.put("files", List.of(Map.of("name", config.get("file"), "content", code)));
        payload.put("stdin", stdin != null ? stdin : "");

        RequestBody body = RequestBody.create(mapper.writeValueAsString(payload), MediaType.parse("application/json"));

        Request request = new Request.Builder()
                .url(PISTON_URL)
                .header("Authorization", API_KEY)
                .post(body)
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) throw new RuntimeException("Execution failed: " + response.body().string());

            JsonNode root = mapper.readTree(response.body().string());
            JsonNode run = root.path("run");

            Map<String, Object> result = new HashMap<>();
            result.put("stdout", run.path("stdout").asText(""));
            result.put("stderr", run.path("stderr").asText(""));
            result.put("code", run.path("code").asInt());
            result.put("signal", run.path("signal").asText(""));
            result.put("output", run.path("output").asText(""));
            return result;
        }
    }

    private Map<String, Object> getConfig(String language) {
        switch (language) {
            case "javascript": return Map.of("language", "javascript", "version", "18.15.0", "file", "main.js");
            case "python": return Map.of("language", "python", "version", "3.10.0", "file", "main.py");
            case "java": return Map.of("language", "java", "version", "15.0.2", "file", "Main.java");
            case "cpp": return Map.of("language", "c++", "version", "10.2.0", "file", "main.cpp");
            case "c": return Map.of("language", "c", "version", "10.2.0", "file", "main.c");
            case "typescript": return Map.of("language", "typescript", "version", "5.0.3", "file", "main.ts");
            default: throw new RuntimeException("Unsupported language: " + language);
        }
    }
}