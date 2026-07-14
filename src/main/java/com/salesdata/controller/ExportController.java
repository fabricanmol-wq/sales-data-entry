package com.salesdata.controller;

import com.salesdata.entity.SalesRecord;
import com.salesdata.repository.SalesRecordRepository;
import com.salesdata.service.SalesRecordSpecification;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/export")
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'DATA_ENTRY_MANAGER', 'ACCOUNT_MANAGER')")
public class ExportController {

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @GetMapping("/excel")
    public ResponseEntity<byte[]> exportToExcel(@RequestParam Map<String, String> filters) throws IOException {
        List<SalesRecord> records = salesRecordRepository.findAll(SalesRecordSpecification.getFilterSpecification(filters));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Sales Records");
            
            // Header Row
            Row headerRow = sheet.createRow(0);
            String[] columns = {"S.No", "Date", "Customer Name", "City", "Contact Number", "Bill Amount", "Salesman Name", "Quantity", "Discount", "Net Amount", "Remarks", "Reminder Date"};
            
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }
            
            // Data Rows
            int rowIdx = 1;
            for (SalesRecord record : records) {
                Row row = sheet.createRow(rowIdx++);
                
                row.createCell(0).setCellValue(record.getId());
                row.createCell(1).setCellValue(record.getEntryDate() != null ? record.getEntryDate().toString() : "");
                row.createCell(2).setCellValue(record.getCustomerName());
                row.createCell(3).setCellValue(record.getCity());
                row.createCell(4).setCellValue(record.getContactNumber());
                row.createCell(5).setCellValue(record.getBillAmount() != null ? record.getBillAmount().doubleValue() : 0.0);
                row.createCell(6).setCellValue(record.getSalesman() != null ? record.getSalesman().getName() : "");
                row.createCell(7).setCellValue(record.getQuantity());
                row.createCell(8).setCellValue(record.getDiscount() != null ? record.getDiscount().doubleValue() : 0.0);
                row.createCell(9).setCellValue(record.getNetAmount() != null ? record.getNetAmount().doubleValue() : 0.0);
                row.createCell(10).setCellValue(record.getRemarks());
                row.createCell(11).setCellValue(record.getReminderDate() != null ? record.getReminderDate().toString() : "");
            }
            
            workbook.write(out);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sales_export.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }
    
    @GetMapping("/csv")
    public ResponseEntity<byte[]> exportToCsv(@RequestParam Map<String, String> filters) throws IOException {
        List<SalesRecord> records = salesRecordRepository.findAll(SalesRecordSpecification.getFilterSpecification(filters));
        
        StringBuilder sb = new StringBuilder();
        sb.append("S.No,Date,Customer Name,City,Contact Number,Bill Amount,Salesman Name,Quantity,Discount,Net Amount,Remarks,Reminder Date\n");
        
        for (SalesRecord r : records) {
            sb.append(r.getId()).append(",");
            sb.append(r.getEntryDate() != null ? r.getEntryDate().toString() : "").append(",");
            sb.append(escapeCsv(r.getCustomerName())).append(",");
            sb.append(escapeCsv(r.getCity())).append(",");
            sb.append(escapeCsv(r.getContactNumber())).append(",");
            sb.append(r.getBillAmount()).append(",");
            sb.append(r.getSalesman() != null ? escapeCsv(r.getSalesman().getName()) : "").append(",");
            sb.append(r.getQuantity()).append(",");
            sb.append(r.getDiscount()).append(",");
            sb.append(r.getNetAmount()).append(",");
            sb.append(escapeCsv(r.getRemarks())).append(",");
            sb.append(r.getReminderDate() != null ? r.getReminderDate().toString() : "").append("\n");
        }
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sales_export.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(sb.toString().getBytes());
    }

    private String escapeCsv(String data) {
        if (data == null) return "";
        data = data.replace("\"", "\"\"");
        if (data.contains(",") || data.contains("\"") || data.contains("\n")) {
            return "\"" + data + "\"";
        }
        return data;
    }
}
