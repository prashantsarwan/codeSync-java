package com.codesync.backend.service;

import com.codesync.backend.config.JwtUtil;
import com.codesync.backend.model.User;
import com.codesync.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
public class AuthService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;

    private static final String[] USER_COLORS = {"#06B6D4", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#A855F7"};

    public Map<String, Object> register(String name, String email, String password) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("User already exists");
        }
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setColor(USER_COLORS[new Random().nextInt(USER_COLORS.length)]);
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());
        return buildResponse(user, token);
    }

    public Map<String, Object> login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return buildResponse(user, token);
    }

    private Map<String, Object> buildResponse(User user, String token) {
        Map<String, Object> response = new HashMap<>();
        response.put("_id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("color", user.getColor());
        response.put("token", token);
        return response;
    }
}
