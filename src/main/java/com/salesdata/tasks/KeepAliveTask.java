package com.salesdata.tasks;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class KeepAliveTask {

    private final String RENDER_APP_URL = "https://sales-data-entry.onrender.com";

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Ping every 2 minutes (120,000 milliseconds) to prevent Neon Postgres Serverless Auto-Suspend and keep connections hot
    @Scheduled(fixedRate = 120000)
    public void pingRenderAppAndDatabase() {
        // 1. Keep Database Connection Pool & Neon Compute Warm
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            jdbcTemplate.queryForObject("SELECT count(*) FROM sales_records", Integer.class);
            System.out.println("KeepAliveTask: Successfully warmed up database connection and cache.");
        } catch (Exception e) {
            System.out.println("KeepAliveTask: Database keep-alive ping failed - " + e.getMessage());
        }

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
