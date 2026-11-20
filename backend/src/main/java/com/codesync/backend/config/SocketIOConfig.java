package com.codesync.backend.config;

import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SocketIOConfig {
    
    @Value("${socketio.host:0.0.0.0}")
    private String host;

    // Yahan change kiya hai: PORT ki jagah server.port use karo
    @Value("${socketio.port:9092}") 
    private int port;

   @Bean
public SocketIOServer socketIOServer() {
    com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
    config.setHostname(host);
    config.setPort(port);
    config.setOrigin("*");

    SocketIOServer server = new SocketIOServer(config);


    server.addConnectListener(client -> {
        System.out.println("SOCKET CLIENT CONNECTED: " + client.getSessionId());
    });


    server.addDisconnectListener(client -> {
        System.out.println("SOCKET CLIENT DISCONNECTED: " + client.getSessionId());
    });

    return server;
}
}
