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
    private String sessionUuid = null;

    private HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-Key", openwaApiKey);
        return headers;
    }

    private synchronized void resolveSessionUuid() {
        if (sessionUuid != null) return;
        try {
            String url = openwaUrl + "/api/sessions";
            HttpEntity<String> entity = new HttpEntity<>(getHeaders());
            ResponseEntity<Map[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map[].class);
            Map[] sessions = response.getBody();
            if (sessions != null) {
                for (Map session : sessions) {
                    if (sessionId.equals(session.get("name"))) {
                        sessionUuid = (String) session.get("id");
                        return;
                    }
                }
            }
            // Not found, try creating
            Map<String, String> body = new HashMap<>();
            body.put("name", sessionId);
            HttpEntity<Map<String, String>> postEntity = new HttpEntity<>(body, getHeaders());
            ResponseEntity<Map> postResponse = restTemplate.exchange(url, HttpMethod.POST, postEntity, Map.class);
            if (postResponse.getBody() != null) {
                sessionUuid = (String) postResponse.getBody().get("id");
            }
        } catch (Exception e) {
            logger.error("Failed to resolve session UUID", e);
            throw new RuntimeException("Could not resolve Session UUID: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> getStatus() {
        try {
            resolveSessionUuid();
            String url = openwaUrl + "/api/sessions/" + sessionUuid + "/status";
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
            resolveSessionUuid();
            // Start session
            String startUrl = openwaUrl + "/api/sessions/" + sessionUuid + "/start";
            HttpEntity<String> entity = new HttpEntity<>(getHeaders());
            try {
                restTemplate.exchange(startUrl, HttpMethod.POST, entity, Map.class);
            } catch (Exception e) {
                // Ignore if already started or pending
            }
            
            // Check status to see if connected, or if we need QR
            String statusUrl = openwaUrl + "/api/sessions/" + sessionUuid + "/status";
            ResponseEntity<Map> statusRes = restTemplate.exchange(statusUrl, HttpMethod.GET, entity, Map.class);
            String state = (String) statusRes.getBody().get("status");

            Map<String, Object> result = new HashMap<>();
            if ("connected".equalsIgnoreCase(state)) {
                result.put("status", "connected");
            } else {
                // Fetch QR code
                String qrUrl = openwaUrl + "/api/sessions/" + sessionUuid + "/qr";
                ResponseEntity<Map> qrRes = restTemplate.exchange(qrUrl, HttpMethod.GET, entity, Map.class);
                if (qrRes.getBody() != null && qrRes.getBody().containsKey("qrCode")) {
                    result.put("qrUrl", qrRes.getBody().get("qrCode")); // Use actual base64 image data
                    result.put("status", "pending");
                } else {
                    result.put("status", "waiting_for_qr");
                }
            }
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
            resolveSessionUuid();
            String url = openwaUrl + "/api/sessions/" + sessionUuid + "/logout";
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
            resolveSessionUuid();
            String url = openwaUrl + "/api/sessions/" + sessionUuid + "/messages/send-text";
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
            resolveSessionUuid();
            String url = openwaUrl + "/api/sessions/" + sessionUuid + "/messages/send-document";
            Map<String, String> body = new HashMap<>();
            body.put("chatId", phone.contains("@c.us") ? phone : phone + "@c.us");
            body.put("base64", fileBase64);
            body.put("mimetype", "application/pdf");
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
