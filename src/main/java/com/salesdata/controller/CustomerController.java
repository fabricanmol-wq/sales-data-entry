package com.salesdata.controller;

import com.salesdata.entity.Customer;
import com.salesdata.repository.CustomerRepository;
import com.salesdata.repository.SalesRecordRepository;
import com.salesdata.repository.BillRepository;
import com.salesdata.entity.SalesRecord;
import com.salesdata.entity.Bill;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private com.salesdata.repository.SalesmanRepository salesmanRepository;

    @Autowired
    private com.salesdata.service.CustomerFilterService customerFilterService;

    @GetMapping
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Customers', 'VIEW')")
    public ResponseEntity<List<CustomerSummaryDTO>> getAllCustomers(@RequestParam Map<String, String> filters) {
        if (filters != null && !filters.isEmpty()) {
            return ResponseEntity.ok(customerFilterService.getFilteredCustomers(filters));
        }
        return ResponseEntity.ok(customerRepository.getCustomerSummaries());
    }

    @PostMapping
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Customers', 'CREATE')")
    public ResponseEntity<?> createCustomer(@RequestBody Customer customer) {
        Optional<Customer> existing = customerRepository.findByCustomerNameAndContactNumberAndIsDeletedFalse(customer.getCustomerName(), customer.getContactNumber());
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body("Customer already exists with this name and contact number.");
        }
        return ResponseEntity.ok(customerRepository.save(customer));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Customers', 'EDIT')")
    public ResponseEntity<?> updateCustomer(@PathVariable Long id, @RequestBody Customer customerDetails) {
        return customerRepository.findById(id).map(customer -> {
            Optional<Customer> existing = customerRepository.findByCustomerNameAndContactNumberAndIsDeletedFalse(
                    customerDetails.getCustomerName(), customerDetails.getContactNumber());

            if (existing.isPresent() && !existing.get().getId().equals(customer.getId())) {
                Customer oldCustomer = existing.get();
                
                List<SalesRecord> records = salesRecordRepository.findByCustomerAndIsDeletedFalseOrderByEntryDateAsc(customer);
                records.forEach(r -> r.setCustomer(oldCustomer));
                salesRecordRepository.saveAll(records);
                
                List<Bill> bills = billRepository.findByCustomerAndIsDeletedFalse(customer);
                bills.forEach(b -> b.setCustomer(oldCustomer));
                billRepository.saveAll(bills);
                
                customer.setDeleted(true);
                customerRepository.save(customer);
                
                oldCustomer.setCity(customerDetails.getCity());
                if (customerDetails.getNextSalesmanId() != null) {
                    salesmanRepository.findById(customerDetails.getNextSalesmanId()).ifPresent(oldCustomer::setNextSalesman);
                } else {
                    oldCustomer.setNextSalesman(null);
                }
                oldCustomer.setFixedDiscount(customerDetails.getFixedDiscount() != null ? customerDetails.getFixedDiscount() : 0.0);
                return ResponseEntity.ok(customerRepository.save(oldCustomer));
            }

            customer.setCustomerName(customerDetails.getCustomerName());
            customer.setContactNumber(customerDetails.getContactNumber());
            customer.setCity(customerDetails.getCity());
            
            if (customerDetails.getNextSalesmanId() != null) {
                salesmanRepository.findById(customerDetails.getNextSalesmanId()).ifPresent(customer::setNextSalesman);
            } else {
                customer.setNextSalesman(null);
            }
            
            customer.setFixedDiscount(customerDetails.getFixedDiscount() != null ? customerDetails.getFixedDiscount() : 0.0);
            
            return ResponseEntity.ok(customerRepository.save(customer));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Customers', 'DELETE')")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        return customerRepository.findById(id).map(customer -> {
            List<SalesRecord> records = salesRecordRepository.findByCustomerAndIsDeletedFalseOrderByEntryDateAsc(customer);
            records.forEach(r -> r.setDeleted(true));
            salesRecordRepository.saveAll(records);
            
            List<Bill> bills = billRepository.findByCustomerAndIsDeletedFalse(customer);
            bills.forEach(b -> b.setDeleted(true));
            billRepository.saveAll(bills);
            
            customer.setDeleted(true);
            customerRepository.save(customer);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}

