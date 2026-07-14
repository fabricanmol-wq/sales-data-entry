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

@SpringBootApplication
public class SalesDataApplication {

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
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
