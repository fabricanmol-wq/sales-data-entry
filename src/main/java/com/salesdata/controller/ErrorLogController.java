package com.salesdata.controller;

import com.salesdata.entity.ErrorLog;
import com.salesdata.repository.ErrorLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logs/error")
public class ErrorLogController {

    @Autowired
    private ErrorLogRepository errorLogRepository;

    @PostMapping
    @Transactional
    public ResponseEntity<?> logError(@RequestBody Map<String, String> payload, Authentication auth) {
        ErrorLog log = new ErrorLog();
        log.setErrorMessage(payload.get("errorMessage"));
        log.setPageUrl(payload.get("pageUrl"));
        log.setActionDetails(payload.get("actionDetails"));
        log.setStackTrace(payload.get("stackTrace"));
        if (auth != null && auth.isAuthenticated()) {
            log.setUsername(auth.getName());
        } else {
            log.setUsername("Anonymous");
        }
        errorLogRepository.save(log);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<ErrorLog>> getErrorLogs() {
        return ResponseEntity.ok(errorLogRepository.findAllByOrderByTimestampDesc());
    }

    @DeleteMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Transactional
    public ResponseEntity<?> clearErrorLogs() {
        errorLogRepository.deleteAll();
        return ResponseEntity.ok().build();
    }
}
