package com.codesync.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AIService {
    @Value("${gemini.api.key}")
    private String geminiKey;

    @Value("${groq.api.key}")
    private String groqKey;

    private final OkHttpClient client = new OkHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public String reviewCode(String action, String code, String language, String query) {
        String prompt = buildPrompt(action, code, language, query);

        System.out.println("--- AI REQUEST START ---");
        System.out.println("Trying Groq first...");
        String response = callGroq(prompt);

        if (response == null) {
            System.out.println("Groq failed. Trying Gemini...");
            response = callGemini(prompt);
        }

        if (response == null) {
            System.out.println("Both APIs failed! Sending mock response.");
            response = mockResponse(action);
        } else {
            System.out.println("AI Response received successfully.");
        }
        System.out.println("--- AI REQUEST END ---");

        return response;
    }

    private String buildPrompt(String action, String code, String language, String userQuery) {
        String base = "You are a senior " + language + " developer reviewing code.\n\nCode:\n```" + language + "\n" + code + "\n```\n\n";
        switch (action) {
            case "explain": return base + "Explain this code step by step in simple language. Keep it under 200 words.";
            case "bugs": return base + "Find bugs, edge cases, and potential issues. List them as bullet points. Be specific.";
            case "optimize": return base + "Suggest optimizations for performance and readability. Give a short improved version.";
            case "complexity": return base + "Analyze time and space complexity. Explain in 3-4 lines.";
            case "ask": return base + "User question: " + userQuery + "\n\nAnswer clearly and concisely.";
            default: return base + "Review this code and provide helpful feedback.";
        }
    }

    private String callGroq(String prompt) {
        if (groqKey == null || groqKey.startsWith("YOUR_")) {
            System.out.println("Groq Error: API key is missing or placeholder.");
            return null;
        }
        try {
            Map<String, Object> bodyMap = new HashMap<>();
            bodyMap.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            // Changed Model to LLaMA 3 8B
            bodyMap.put("model", "openai/gpt-oss-20b");
            bodyMap.put("temperature", 0.4);

            RequestBody body = RequestBody.create(mapper.writeValueAsString(bodyMap), MediaType.parse("application/json"));
            Request request = new Request.Builder()
                    .url("https://api.groq.com/openai/v1/chat/completions")
                    .header("Authorization", "Bearer " + groqKey)
                    .post(body).build();

            try (Response res = client.newCall(request).execute()) {
                if (res.isSuccessful()) {
                    JsonNode root = mapper.readTree(res.body().string());
                    return root.path("choices").get(0).path("message").path("content").asText();
                } else {
                    System.out.println("Groq API Error Code: " + res.code() + " - " + res.body().string());
                }
            }
        } catch (Exception e) {
            System.out.println("Groq Exception: " + e.getMessage());
        }
        return null;
    }

    private String callGemini(String prompt) {
        if (geminiKey == null || geminiKey.startsWith("YOUR_")) {
            System.out.println("Gemini Error: API key is missing or placeholder.");
            return null;
        }
        try {
            Map<String, Object> bodyMap = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
            RequestBody body = RequestBody.create(mapper.writeValueAsString(bodyMap), MediaType.parse("application/json"));
            Request request = new Request.Builder()
                    // Changed Model to Gemini 1.5 Flash
                    .url("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey)
                    .header("x-goog-api-key", geminiKey)
                    .header("Content-Type", "application/json")
                    .post(body)
                    .build();

            try (Response res = client.newCall(request).execute()) {
                if (res.isSuccessful()) {
                    JsonNode root = mapper.readTree(res.body().string());
                    return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
                } else {
                    System.out.println("Gemini API Error Code: " + res.code() + " - " + res.body().string());
                }
            }
        } catch (Exception e) {
            System.out.println("Gemini Exception: " + e.getMessage());
        }
        return null;
    }

    private String mockResponse(String action) {
        switch (action) {
            case "explain": return "This code defines functions and executes logic step by step. Each line builds on the previous one to accomplish the task. Consider adding comments for clarity.";
            case "bugs": return "• No input validation\n• Potential null reference\n• Consider error handling for edge cases\n• Variable naming could be improved";
            case "optimize": return "Consider using memoization for repeated calculations. Use const instead of let where possible. Extract repeated logic into helper functions.";
            case "complexity": return "Time Complexity: O(n)\nSpace Complexity: O(1)\nThe algorithm iterates through the input once without additional data structures.";
            default: return "Based on the code provided, the logic appears sound. Consider documenting the expected inputs and outputs for maintainability.";
        }
    }
}