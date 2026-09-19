package com.salesdata.tasks;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class KeepAliveTask {

    private final String RENDER_APP_URL = "https://sales-data-entry.onrender.com";



    // Ping every 2 minutes (120,000 milliseconds) to prevent Neon Postgres Serverless Auto-Suspend and keep connections hot
    @Scheduled(fixedRate = 120000)
    public void pingRenderAppAndDatabase() {
        // 1. Database Connection Ping REMOVED to allow Neon to Auto-Suspend (Scale to Zero)

        // 2. Keep Render Web App Awake
        try {
            RestTemplate restTemplate = new RestTemplate();
            restTemplate.getForObject(RENDER_APP_URL, String.class);
            System.out.println("KeepAliveTask: Successfully pinged " + RENDER_APP_URL);
        } catch (Exception e) {
            System.out.println("KeepAliveTask: Failed to ping " + RENDER_APP_URL + " - " + e.getMessage());
        }
    }
}
