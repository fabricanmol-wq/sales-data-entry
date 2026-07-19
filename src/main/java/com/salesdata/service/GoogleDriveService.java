package com.salesdata.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.logging.Logger;

@Service
public class GoogleDriveService {

    private static final Logger logger = Logger.getLogger(GoogleDriveService.class.getName());

    @Value("${gdrive.credentials.json:#{null}}")
    private String credentialsJson;

    public boolean uploadFile(String folderId, String fileName, String jsonContent) {
        if (credentialsJson == null || credentialsJson.trim().isEmpty()) {
            logger.warning("Google Drive credentials not provided. Skipping upload.");
            return false;
        }

        try {
            GoogleCredentials credentials = GoogleCredentials.fromStream(
                    new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8))
            ).createScoped(Collections.singleton(DriveScopes.DRIVE_FILE));

            Drive driveService = new Drive.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance(),
                    new HttpCredentialsAdapter(credentials))
                    .setApplicationName("Sales Data Auto Backup")
                    .build();

            File fileMetadata = new File();
            fileMetadata.setName(fileName);
            if (folderId != null && !folderId.trim().isEmpty()) {
                fileMetadata.setParents(Collections.singletonList(folderId.trim()));
            }

            InputStreamContent mediaContent = new InputStreamContent(
                    "application/json",
                    new ByteArrayInputStream(jsonContent.getBytes(StandardCharsets.UTF_8)));

            File file = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id")
                    .execute();

            logger.info("Successfully uploaded backup to Google Drive. File ID: " + file.getId());
            return true;
        } catch (IOException e) {
            logger.severe("Failed to upload backup to Google Drive: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    private Drive getDriveService() throws IOException {
        if (credentialsJson == null || credentialsJson.trim().isEmpty()) {
            throw new IOException("Google Drive credentials not provided.");
        }
        GoogleCredentials credentials = GoogleCredentials.fromStream(
                new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8))
        ).createScoped(Collections.singleton(DriveScopes.DRIVE_FILE));

        return new Drive.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("Sales Data Auto Backup")
                .build();
    }

    public String getLatestBackupFileId(String folderId) throws IOException {
        Drive driveService = getDriveService();
        String query = "mimeType='application/json'";
        if (folderId != null && !folderId.trim().isEmpty()) {
            query += " and '" + folderId.trim() + "' in parents";
        }
        
        com.google.api.services.drive.model.FileList result = driveService.files().list()
                .setQ(query)
                .setOrderBy("createdTime desc")
                .setPageSize(1)
                .setFields("files(id, name, createdTime)")
                .execute();

        if (result.getFiles() != null && !result.getFiles().isEmpty()) {
            return result.getFiles().get(0).getId();
        }
        return null;
    }

    public java.io.InputStream downloadFile(String fileId) throws IOException {
        Drive driveService = getDriveService();
        return driveService.files().get(fileId).executeMediaAsInputStream();
    }
}
