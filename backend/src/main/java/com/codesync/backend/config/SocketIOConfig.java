package com.codesync.backend.config;

import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SocketIOConfig {
    // Host waise hi rahega (0.0.0.0 Render par chalega)
    @Value("${socketio.host:0.0.0.0}")
    private String host;

    // Yahan change kiya gaya hai: PORT env variable use hoga, na mile to 8080
    @Value("${PORT:8080}") 
    private int port;

    @Bean
    public SocketIOServer socketIOServer() {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setHostname(host);
        config.setPort(port);

        // SABHI origins allow karein taaki CORS error na aaye
        config.setOrigin("*");

        return new SocketIOServer(config);
    }
}