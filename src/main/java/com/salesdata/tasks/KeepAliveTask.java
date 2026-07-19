package com.salesdata.tasks;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class KeepAliveTask {

    private final String RENDER_APP_URL = "https://sales-data-entry.onrender.com";

    @Scheduled(fixedRate = 840000) // 14 minutes in milliseconds (14 * 60 * 1000)
    public void pingRenderApp() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            restTemplate.getForObject(RENDER_APP_URL, String.class);
            System.out.println("KeepAliveTask: Successfully pinged " + RENDER_APP_URL);
        } catch (Exception e) {
            System.out.println("KeepAliveTask: Failed to ping " + RENDER_APP_URL + " - " + e.getMessage());
        }
    }
}
