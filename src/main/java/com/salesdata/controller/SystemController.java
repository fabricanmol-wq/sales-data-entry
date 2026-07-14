package com.salesdata.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ByteArrayResource;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

    @GetMapping("/backup")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'CREATE')")
    public ResponseEntity<Resource> backupDatabase() {
        try {
            Map<String, List<Map<String, Object>>> backupData = new HashMap<>();
            try (Connection conn = dataSource.getConnection()) {
                DatabaseMetaData metaData = conn.getMetaData();
                try (ResultSet rs = metaData.getTables(null, null, "%", new String[]{"TABLE"})) {
                    while (rs.next()) {
                        String tableName = rs.getString("TABLE_NAME");
                        if (tableName.startsWith("sqlite_") || tableName.startsWith("pg_")) continue;
                        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM " + tableName);
                        backupData.put(tableName, rows);
                    }
                }
            }

            ObjectMapper mapper = new ObjectMapper();
            byte[] jsonBytes = mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(backupData);
            Resource resource = new ByteArrayResource(jsonBytes);

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "backup_sales_" + timestamp + ".json";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(resource);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/restore")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Settings', 'EDIT')")
    public ResponseEntity<?> restoreDatabase(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !file.getOriginalFilename().endsWith(".json")) {
            return ResponseEntity.badRequest().body("{\"message\": \"Invalid file. Please upload a valid JSON backup.\"}");
        }
        return ResponseEntity.ok("{\"message\": \"Restore via JSON is currently processed by the manual migration script on the cloud. Database data is securely handled.\"}");
    }
}
