package com.salesdata;

import com.salesdata.entity.Customer;
import com.salesdata.entity.SalesRecord;
import com.salesdata.repository.CustomerRepository;
import com.salesdata.repository.SalesRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class CustomerMigrationRunner implements CommandLineRunner {

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        List<SalesRecord> records = salesRecordRepository.findAll();
        for (SalesRecord record : records) {
            if (record.isDeleted() || (record.getCustomer() != null && record.getCustomer().isDeleted())) {
                continue;
            }
            if (record.getCustomerName() != null && record.getContactNumber() != null) {
                Optional<Customer> existing = customerRepository.findByCustomerNameAndContactNumberAndIsDeletedFalse(
                        record.getCustomerName(),
                        record.getContactNumber()
                );
                if (existing.isEmpty()) {
                    Customer c = new Customer();
                    c.setCustomerName(record.getCustomerName());
                    c.setContactNumber(record.getContactNumber());
                    c.setCity(record.getCity());
                    customerRepository.save(c);
                }
            }
        }
    }
}
