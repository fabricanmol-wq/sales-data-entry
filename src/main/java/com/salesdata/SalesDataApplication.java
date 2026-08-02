package com.salesdata;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import jakarta.annotation.PostConstruct;
import java.util.TimeZone;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SalesDataApplication {

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.boot.CommandLineRunner alterSettingsColumn(org.springframework.jdbc.core.JdbcTemplate jdbcTemplate, javax.sql.DataSource dataSource) {
        return args -> {
            try (java.sql.Connection conn = dataSource.getConnection()) {
                String driver = conn.getMetaData().getDriverName().toLowerCase();
                if (driver.contains("postgresql")) {
                    jdbcTemplate.execute("ALTER TABLE settings ALTER COLUMN setting_value TYPE TEXT");
                    System.out.println("Successfully altered setting_value to TEXT in PostgreSQL.");
                }
            } catch (Exception e) {
                System.out.println("Could not alter setting_value to TEXT: " + e.getMessage());
            }
        };
    }

    public static void main(String[] args) {
        try {
            File restoreFile = new File("sales.db.restore");
            if (restoreFile.exists()) {
                Path target = Paths.get("sales.db");
                Files.copy(restoreFile.toPath(), target, StandardCopyOption.REPLACE_EXISTING);
                restoreFile.delete();
                System.out.println("Database successfully restored from backup!");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        SpringApplication.run(SalesDataApplication.class, args);
    }
}
