package com.salesdata.controller;

import com.salesdata.service.WhatsAppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/whatsapp")
public class WhatsAppController {

    @Autowired
    private WhatsAppService whatsAppService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(whatsAppService.getStatus());
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startSession() {
        return ResponseEntity.ok(whatsAppService.startSessionAndGetQr());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        return ResponseEntity.ok(whatsAppService.logout());
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        String text = request.get("text");
        if (phone == null || text == null) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Phone and text are required"));
        }
        return ResponseEntity.ok(whatsAppService.sendMessage(phone, text));
    }

    @PostMapping("/send-file")
    public ResponseEntity<Map<String, Object>> sendFile(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        String fileBase64 = request.get("fileBase64");
        String filename = request.get("filename");
        String caption = request.get("caption");
        
        if (phone == null || fileBase64 == null) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Phone and file are required"));
        }
        return ResponseEntity.ok(whatsAppService.sendFile(phone, fileBase64, filename, caption));
    }
}
