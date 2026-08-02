package com.salesdata.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class WhatsAppService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppService.class);

    @Value("${openwa.api.url}")
    private String openwaUrl;

    @Value("${openwa.api.key}")
    private String openwaApiKey;

    @Value("${openwa.session.id}")
    private String sessionId;

    private final RestTemplate restTemplate = new RestTemplate();

    private HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-Key", openwaApiKey);
        return headers;
    }

    public Map<String, Object> getStatus() {
        try {
            String url = openwaUrl + "/api/sessions/" + sessionId + "/status";
            HttpEntity<String> entity = new HttpEntity<>(getHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            logger.error("Failed to get WhatsApp status: ", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return error;
        }
    }

    public Map<String, Object> startSessionAndGetQr() {
        try {
            // Start session
            String startUrl = openwaUrl + "/api/sessions/" + sessionId + "/start";
            HttpEntity<String> entity = new HttpEntity<>(getHeaders());
            restTemplate.exchange(startUrl, HttpMethod.POST, entity, Map.class);
            
            // Note: In OpenWA, the QR might be returned as JSON base64 string depending on accept header, 
            // or we just return a URL that the frontend can poll.
            Map<String, Object> result = new HashMap<>();
            result.put("qrUrl", openwaUrl + "/api/sessions/" + sessionId + "/qr");
            result.put("status", "pending");
            return result;
        } catch (Exception e) {
            logger.error("Failed to start WhatsApp session: ", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return error;
        }
    }

    public Map<String, Object> logout() {
        try {
            String url = openwaUrl + "/api/sessions/" + sessionId + "/stop"; // Verify if it's stop or logout
            HttpEntity<String> entity = new HttpEntity<>(getHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            logger.error("Failed to logout WhatsApp: ", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return error;
        }
    }

    public Map<String, Object> sendMessage(String phone, String text) {
        try {
            String url = openwaUrl + "/api/sessions/" + sessionId + "/messages/send-text";
            Map<String, String> body = new HashMap<>();
            body.put("chatId", phone.contains("@c.us") ? phone : phone + "@c.us");
            body.put("text", text);
            
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, getHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            logger.error("Failed to send WhatsApp message: ", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return error;
        }
    }

    public Map<String, Object> sendFile(String phone, String fileBase64, String filename, String caption) {
        try {
            String url = openwaUrl + "/api/sessions/" + sessionId + "/messages/send-file";
            Map<String, String> body = new HashMap<>();
            body.put("chatId", phone.contains("@c.us") ? phone : phone + "@c.us");
            body.put("file", fileBase64);
            body.put("filename", filename);
            body.put("caption", caption);
            
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, getHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            logger.error("Failed to send WhatsApp file: ", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return error;
        }
    }

    // Ping every 14 minutes (14 * 60 * 1000 = 840000 ms) to keep the Render server active
    @Scheduled(fixedRate = 840000)
    public void pingOpenWAServer() {
        try {
            logger.info("Pinging OpenWA Server to keep it active...");
            String url = openwaUrl + "/api/health";
            restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            logger.warn("OpenWA Ping failed (Server might be down or starting up): " + e.getMessage());
        }
    }
}
