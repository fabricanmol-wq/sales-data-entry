package com.salesdata.controller;

import com.salesdata.entity.*;
import com.salesdata.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    @Autowired
    private BillRepository billRepository;
    
    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SalesmanRepository salesmanRepository;

    @Autowired
    private BillItemRepository billItemRepository;

    @GetMapping
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'VIEW')")
    public ResponseEntity<List<Bill>> getAllBills() {
        return ResponseEntity.ok(billRepository.findByIsDeletedFalse(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "billDate")));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'VIEW')")
    public ResponseEntity<Bill> getBill(@PathVariable Long id) {
        return billRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'CREATE')")
    @Transactional
    public ResponseEntity<?> createBill(@RequestBody BillDTO billDTO, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        
        Customer customer = customerRepository.findByCustomerNameAndContactNumberAndIsDeletedFalse(billDTO.getCustomerName(), billDTO.getContactNumber())
            .orElseGet(() -> {
                Customer newCust = new Customer();
                newCust.setCustomerName(billDTO.getCustomerName());
                newCust.setContactNumber(billDTO.getContactNumber());
                newCust.setCity(billDTO.getCity());
                return customerRepository.save(newCust);
            });

        Bill bill = new Bill();
        bill.setBillDate(LocalDateTime.now());
        bill.setCustomer(customer);
        
        if (billDTO.getSalesmanId() != null) {
            bill.setSalesman(salesmanRepository.findById(billDTO.getSalesmanId()).orElse(null));
        }

        bill.setTotalAmount(billDTO.getTotalAmount());
        bill.setDiscount(billDTO.getDiscount());
        bill.setExpenses(billDTO.getExpenses() != null ? billDTO.getExpenses() : BigDecimal.ZERO);
        bill.setNetAmount(billDTO.getNetAmount());
        bill.setPaidAmount(billDTO.getPaidAmount());
        bill.setCreditAmount(billDTO.getNetAmount().subtract(billDTO.getPaidAmount()));
        bill.setCreatedBy(user);

        bill = billRepository.save(bill);

        // CREATE LEDGER ENTRY (SalesRecord)
        SalesRecord ledgerEntry = new SalesRecord();
        ledgerEntry.setCustomer(customer);
        ledgerEntry.setEntryDate(bill.getBillDate().toLocalDate());
        ledgerEntry.setBillAmount(bill.getTotalAmount());
        ledgerEntry.setDiscount(bill.getDiscount());
        ledgerEntry.setExpenses(bill.getExpenses());
        ledgerEntry.setNetAmount(bill.getNetAmount());
        ledgerEntry.setCreditAmount(bill.getCreditAmount());
        ledgerEntry.setSalesman(bill.getSalesman());
        
        int totalQty = billDTO.getItems().stream().mapToInt(BillItemDTO::getQuantity).sum();
        ledgerEntry.setQuantity(totalQty);
        ledgerEntry.setReminderDate(LocalDate.now().plusDays(60));
        
        if (bill.getCreditAmount().compareTo(BigDecimal.ZERO) > 0) {
            ledgerEntry.setBillType("CREDIT_BILL");
        } else {
            ledgerEntry.setBillType("CASH_BILL");
        }
        ledgerEntry.setRemarks("Invoice #" + bill.getId());
        salesRecordRepository.save(ledgerEntry);

        List<BillItem> items = new ArrayList<>();
        
        for (BillItemDTO itemDTO : billDTO.getItems()) {
            Product product = productRepository.findById(itemDTO.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + itemDTO.getProductId()));
            

            
            BillItem billItem = new BillItem();
            billItem.setBill(bill);
            billItem.setProduct(product);
            billItem.setQuantity(itemDTO.getQuantity());
            billItem.setUnitPrice(itemDTO.getUnitPrice());
            billItem.setTotalPrice(itemDTO.getTotalPrice());
            
            items.add(billItem);
        }
        
        bill.setItems(items);
        billRepository.save(bill);

        return ResponseEntity.ok(bill);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'EDIT')")
    @Transactional
    public ResponseEntity<?> updateBill(@PathVariable Long id, @RequestBody BillDTO billDTO, Authentication auth) {
        Bill bill = billRepository.findById(id).orElseThrow();
        
        Customer customer = customerRepository.findByCustomerNameAndContactNumberAndIsDeletedFalse(billDTO.getCustomerName(), billDTO.getContactNumber())
            .orElseGet(() -> {
                Customer newCust = new Customer();
                newCust.setCustomerName(billDTO.getCustomerName());
                newCust.setContactNumber(billDTO.getContactNumber());
                newCust.setCity(billDTO.getCity());
                return customerRepository.save(newCust);
            });
            
        bill.setCustomer(customer);
        
        if (billDTO.getSalesmanId() != null) {
            bill.setSalesman(salesmanRepository.findById(billDTO.getSalesmanId()).orElse(null));
        } else {
            bill.setSalesman(null);
        }

        bill.setTotalAmount(billDTO.getTotalAmount());
        bill.setDiscount(billDTO.getDiscount());
        bill.setExpenses(billDTO.getExpenses() != null ? billDTO.getExpenses() : BigDecimal.ZERO);
        bill.setNetAmount(billDTO.getNetAmount());
        bill.setPaidAmount(billDTO.getPaidAmount());
        bill.setCreditAmount(billDTO.getNetAmount().subtract(billDTO.getPaidAmount()));
        
        // Remove old items
        billItemRepository.deleteAll(bill.getItems());
        bill.getItems().clear();
        
        List<BillItem> items = new ArrayList<>();
        for (BillItemDTO itemDTO : billDTO.getItems()) {
            Product product = productRepository.findById(itemDTO.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + itemDTO.getProductId()));
            
            BillItem billItem = new BillItem();
            billItem.setBill(bill);
            billItem.setProduct(product);
            billItem.setQuantity(itemDTO.getQuantity());
            billItem.setUnitPrice(itemDTO.getUnitPrice());
            billItem.setTotalPrice(itemDTO.getTotalPrice());
            items.add(billItem);
        }
        bill.getItems().addAll(items);
        final Bill savedBill = billRepository.save(bill);

        // Update corresponding SalesRecord
        salesRecordRepository.findByRemarksAndIsDeletedFalse("Invoice #" + savedBill.getId()).ifPresent(record -> {
            record.setCustomer(savedBill.getCustomer());
            record.setBillAmount(savedBill.getTotalAmount());
            record.setDiscount(savedBill.getDiscount());
            record.setExpenses(savedBill.getExpenses());
            record.setNetAmount(savedBill.getNetAmount());
            record.setCreditAmount(savedBill.getCreditAmount());
            record.setSalesman(savedBill.getSalesman());
            
            int totalQty = billDTO.getItems().stream().mapToInt(BillItemDTO::getQuantity).sum();
            record.setQuantity(totalQty);
            
            if (savedBill.getCreditAmount().compareTo(BigDecimal.ZERO) > 0) {
                record.setBillType("CREDIT_BILL");
            } else {
                record.setBillType("CASH_BILL");
            }
            salesRecordRepository.save(record);
        });

        return ResponseEntity.ok(savedBill);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Sales Entries', 'DELETE')")
    @Transactional
    public ResponseEntity<?> deleteBill(@PathVariable Long id) {
        Bill bill = billRepository.findById(id).orElseThrow();
        
        // Delete corresponding SalesRecord
        salesRecordRepository.findByRemarksAndIsDeletedFalse("Invoice #" + bill.getId()).ifPresent(record -> {
            record.setDeleted(true);
            salesRecordRepository.save(record);
        });
        
        bill.setDeleted(true);
        billRepository.save(bill);
        return ResponseEntity.ok().build();
    }
}
