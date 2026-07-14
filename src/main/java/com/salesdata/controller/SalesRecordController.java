package com.salesdata.controller;

import com.salesdata.entity.SalesRecord;
import com.salesdata.entity.User;
import com.salesdata.entity.Customer;
import com.salesdata.repository.SalesRecordRepository;
import com.salesdata.repository.UserRepository;
import com.salesdata.repository.CustomerRepository;
import com.salesdata.service.SalesRecordSpecification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
public class SalesRecordController {

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'VIEW')")
    public ResponseEntity<Page<SalesRecord>> getRecords(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam Map<String, String> filters) {

        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        PageRequest pageRequest = PageRequest.of(page, size, sort);
        Page<SalesRecord> records = salesRecordRepository.findAll(SalesRecordSpecification.getFilterSpecification(filters), pageRequest);
        return ResponseEntity.ok(records);
    }

    @PostMapping
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'CREATE')")
    public ResponseEntity<SalesRecord> createRecord(@RequestBody SalesRecord salesRecord, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        salesRecord.setCreatedBy(user);
        
        Customer customer = customerRepository.findByCustomerNameAndContactNumberAndIsDeletedFalse(salesRecord.getTempCustomerName(), salesRecord.getTempContactNumber())
            .orElseGet(() -> {
                Customer newCust = new Customer();
                newCust.setCustomerName(salesRecord.getTempCustomerName());
                newCust.setContactNumber(salesRecord.getTempContactNumber());
                newCust.setCity(salesRecord.getTempCity());
                return customerRepository.save(newCust);
            });
        salesRecord.setCustomer(customer);
        
        if (salesRecord.getReminderDate() == null && salesRecord.getEntryDate() != null) {
            salesRecord.setReminderDate(salesRecord.getEntryDate().plusDays(60));
        }
        SalesRecord saved = salesRecordRepository.save(salesRecord);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'EDIT')")
    public ResponseEntity<?> updateRecord(@PathVariable Long id, @RequestBody SalesRecord salesRecord) {
        return salesRecordRepository.findById(id).map(existing -> {
            if (salesRecord.getTempCustomerName() != null && salesRecord.getTempContactNumber() != null) {
                Customer customer = customerRepository.findByCustomerNameAndContactNumberAndIsDeletedFalse(salesRecord.getTempCustomerName(), salesRecord.getTempContactNumber())
                    .orElseGet(() -> {
                        Customer newCust = new Customer();
                        newCust.setCustomerName(salesRecord.getTempCustomerName());
                        newCust.setContactNumber(salesRecord.getTempContactNumber());
                        newCust.setCity(salesRecord.getTempCity());
                        return customerRepository.save(newCust);
                    });
                existing.setCustomer(customer);
            }
            existing.setEntryDate(salesRecord.getEntryDate());
            existing.setBillAmount(salesRecord.getBillAmount());
            existing.setSalesman(salesRecord.getSalesman());
            existing.setQuantity(salesRecord.getQuantity());
            existing.setDiscount(salesRecord.getDiscount());
            existing.setNetAmount(salesRecord.getNetAmount());
            existing.setCreditAmount(salesRecord.getCreditAmount());
            existing.setRemarks(salesRecord.getRemarks());
            if (salesRecord.getBillType() != null) {
                existing.setBillType(salesRecord.getBillType());
            }
            if (salesRecord.getReminderDate() != null) {
                existing.setReminderDate(salesRecord.getReminderDate());
            }
            return ResponseEntity.ok(salesRecordRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'DELETE')")
    public ResponseEntity<?> deleteRecord(@PathVariable Long id) {
        return salesRecordRepository.findById(id).map(record -> {
            record.setDeleted(true);
            salesRecordRepository.save(record);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/payment")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'CREATE')")
    public ResponseEntity<?> receivePayment(@RequestBody Map<String, Object> payload, Authentication auth) {
        String customerName = (String) payload.get("customerName");
        String contactNumber = (String) payload.get("contactNumber");
        java.math.BigDecimal paymentAmount = new java.math.BigDecimal(payload.get("paymentAmount").toString().replace(",", ""));
        String remarks = (String) payload.get("remarks");
        String city = (String) payload.get("city");
        String returnType = (String) payload.get("returnType");

        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        
        Customer customer = customerRepository.findByCustomerNameAndContactNumberAndIsDeletedFalse(customerName, contactNumber)
            .orElseGet(() -> {
                Customer newCust = new Customer();
                newCust.setCustomerName(customerName);
                newCust.setContactNumber(contactNumber);
                newCust.setCity(city != null ? city : "");
                return customerRepository.save(newCust);
            });

        SalesRecord paymentRecord = new SalesRecord();
        paymentRecord.setCustomer(customer);
        paymentRecord.setBillAmount(java.math.BigDecimal.ZERO);
        paymentRecord.setDiscount(java.math.BigDecimal.ZERO);
        paymentRecord.setQuantity(0);

        Boolean isProductReturn = false;
        if (payload.containsKey("isProductReturn")) {
            Object val = payload.get("isProductReturn");
            if (val instanceof Boolean) {
                isProductReturn = (Boolean) val;
            } else if (val != null) {
                isProductReturn = Boolean.valueOf(val.toString());
            }
        }

        if (isProductReturn && "CASH".equalsIgnoreCase(returnType)) {
            // Validate limit
            java.math.BigDecimal totalCashBills = java.math.BigDecimal.ZERO;
            java.math.BigDecimal totalCashRefunds = java.math.BigDecimal.ZERO;
            final String cName = customerName != null ? customerName : "";
            final String cContact = contactNumber != null ? contactNumber : "";
            List<SalesRecord> records = salesRecordRepository.findByIsDeletedFalse().stream()
                .filter(r -> r.getCustomer() != null && cName.equals(r.getCustomer().getCustomerName()) && cContact.equals(r.getCustomer().getContactNumber()))
                .collect(java.util.stream.Collectors.toList());
            
            for (SalesRecord r : records) {
                if ("CASH".equals(r.getBillType()) || "CASH_BILL".equals(r.getBillType())) {
                    totalCashBills = totalCashBills.add(r.getNetAmount());
                } else if ("CASH_RETURN".equals(r.getBillType())) {
                    totalCashRefunds = totalCashRefunds.add(r.getNetAmount());
                }
            }
            java.math.BigDecimal availableAmount = totalCashBills.add(totalCashRefunds);
            if (paymentAmount.compareTo(availableAmount) > 0) {
                return ResponseEntity.badRequest().body("Amount exceeds available cash refund limit of " + availableAmount);
            }

            paymentRecord.setNetAmount(paymentAmount.negate()); // Shows as negative cash paid
            paymentRecord.setCreditAmount(java.math.BigDecimal.ZERO); // No credit change
            paymentRecord.setBillType("CASH_RETURN");
        } else {
            if (isProductReturn && "CREDIT".equalsIgnoreCase(returnType)) {
                final String cName = customerName != null ? customerName : "";
                final String cContact = contactNumber != null ? contactNumber : "";
                java.math.BigDecimal totalCredit = salesRecordRepository.findByIsDeletedFalse().stream()
                    .filter(r -> r.getCustomer() != null && cName.equals(r.getCustomer().getCustomerName()) && cContact.equals(r.getCustomer().getContactNumber()))
                    .map(SalesRecord::getCreditAmount)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                if (paymentAmount.compareTo(totalCredit) > 0) {
                    return ResponseEntity.badRequest().body("Credit Return amount cannot exceed pending balance of " + totalCredit);
                }
            }

            paymentRecord.setNetAmount(java.math.BigDecimal.ZERO);
            paymentRecord.setCreditAmount(paymentAmount.negate()); // Negative credit = Payment
            paymentRecord.setBillType(isProductReturn ? "PRODUCT_RETURN" : "PAYMENT_RECEIVED");
        }
        
        paymentRecord.setEntryDate(java.time.LocalDate.now());
        paymentRecord.setReminderDate(java.time.LocalDate.now());
        paymentRecord.setRemarks(remarks);
        paymentRecord.setCreatedBy(user);

        salesRecordRepository.save(paymentRecord);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/customer/credit")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'VIEW') or @customPermissionEvaluator.hasAccess(authentication, 'Customers', 'VIEW')")
    public ResponseEntity<java.math.BigDecimal> getCustomerCredit(@RequestParam(required = false) String customerName, @RequestParam(required = false) String contact, @RequestParam(required = false) Long upToId) {
        final String finalCustomerName = customerName != null ? customerName : "";
        final String finalContactNum = contact != null ? contact : "";
        java.math.BigDecimal totalCredit = salesRecordRepository.findByIsDeletedFalse().stream()
            .filter(r -> r.getCustomer() != null && finalCustomerName.equals(r.getCustomer().getCustomerName()) && finalContactNum.equals(r.getCustomer().getContactNumber()))
            .filter(r -> upToId == null || r.getId() <= upToId)
            .map(SalesRecord::getCreditAmount)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        return ResponseEntity.ok(totalCredit);
    }

    @GetMapping("/customer/available-cash-refund")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'VIEW') or @customPermissionEvaluator.hasAccess(authentication, 'Customers', 'VIEW')")
    public ResponseEntity<Map<String, Object>> getAvailableCashRefund(@RequestParam(required = false) String customerName, @RequestParam(required = false) String contact) {
        final String finalCustomerName = customerName != null ? customerName : "";
        final String finalContactNum = contact != null ? contact : "";
        
        List<SalesRecord> records = salesRecordRepository.findByIsDeletedFalse().stream()
            .filter(r -> r.getCustomer() != null && finalCustomerName.equals(r.getCustomer().getCustomerName()) && finalContactNum.equals(r.getCustomer().getContactNumber()))
            .collect(java.util.stream.Collectors.toList());

        java.math.BigDecimal totalCashBills = java.math.BigDecimal.ZERO;
        java.math.BigDecimal totalCashRefunds = java.math.BigDecimal.ZERO;
        int cashBillsCount = 0;

        for (SalesRecord r : records) {
            if ("CASH".equals(r.getBillType()) || "CASH_BILL".equals(r.getBillType())) {
                totalCashBills = totalCashBills.add(r.getNetAmount());
                cashBillsCount++;
            } else if ("CASH_RETURN".equals(r.getBillType())) {
                totalCashRefunds = totalCashRefunds.add(r.getNetAmount());
            }
        }

        java.math.BigDecimal availableAmount = totalCashBills.add(totalCashRefunds);
        if (availableAmount.compareTo(java.math.BigDecimal.ZERO) < 0) {
            availableAmount = java.math.BigDecimal.ZERO;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("availableAmount", availableAmount);
        result.put("cashBillsCount", cashBillsCount);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/customer/available-credit-refund")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'VIEW') or @customPermissionEvaluator.hasAccess(authentication, 'Customers', 'VIEW')")
    public ResponseEntity<Map<String, Object>> getAvailableCreditRefund(@RequestParam(required = false) String customerName, @RequestParam(required = false) String contact) {
        final String finalCustomerName = customerName != null ? customerName : "";
        final String finalContactNum = contact != null ? contact : "";
        
        List<SalesRecord> records = salesRecordRepository.findByIsDeletedFalse().stream()
            .filter(r -> r.getCustomer() != null && finalCustomerName.equals(r.getCustomer().getCustomerName()) && finalContactNum.equals(r.getCustomer().getContactNumber()))
            .collect(java.util.stream.Collectors.toList());

        java.math.BigDecimal totalCredit = java.math.BigDecimal.ZERO;
        int creditBillsCount = 0;

        for (SalesRecord r : records) {
            totalCredit = totalCredit.add(r.getCreditAmount());
            if ("CREDIT".equals(r.getBillType()) || "CREDIT_BILL".equals(r.getBillType()) || "DEBIT".equals(r.getBillType())) {
                if (r.getCreditAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    creditBillsCount++;
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("availableAmount", totalCredit);
        result.put("creditBillsCount", creditBillsCount);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/customers/summary")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Customers', 'VIEW')")
    public ResponseEntity<List<Map<String, Object>>> getCustomersSummary(@RequestParam Map<String, String> filters) {
        List<SalesRecord> records;
        if (filters.isEmpty()) {
            records = salesRecordRepository.findByIsDeletedFalse();
        } else {
            records = salesRecordRepository.findAll(SalesRecordSpecification.getFilterSpecification(filters));
        }

        Map<String, Map<String, Object>> uniqueMap = new HashMap<>();
        for (SalesRecord r : records) {
            if (r.getCustomer() != null && r.getCustomer().getCustomerName() != null && !r.getCustomer().getCustomerName().trim().isEmpty()) {
                String key = r.getCustomer().getCustomerName().toLowerCase() + "_" + r.getCustomer().getContactNumber();
                if (!uniqueMap.containsKey(key)) {
                    Map<String, Object> c = new HashMap<>();
                    c.put("customerName", r.getCustomer().getCustomerName());
                    c.put("contactNumber", r.getCustomer().getContactNumber());
                    c.put("city", r.getCustomer().getCity());
                    uniqueMap.put(key, c);
                }
            }
        }
        return ResponseEntity.ok(new ArrayList<>(uniqueMap.values()));
    }


}
