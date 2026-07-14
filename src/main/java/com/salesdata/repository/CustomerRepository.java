package com.salesdata.repository;

import com.salesdata.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import com.salesdata.controller.CustomerSummaryDTO;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByCustomerNameAndContactNumberAndIsDeletedFalse(String customerName, String contactNumber);
    java.util.List<Customer> findByIsDeletedFalse();
    
    @Query("SELECT new com.salesdata.controller.CustomerSummaryDTO(c, COALESCE(SUM(s.creditAmount), 0), MAX(s.salesman.id)) " +
           "FROM Customer c LEFT JOIN SalesRecord s ON s.customer = c AND s.isDeleted = false " +
           "WHERE c.isDeleted = false GROUP BY c")
    java.util.List<CustomerSummaryDTO> getCustomerSummaries();
}
