package com.salesdata.repository;

import com.salesdata.entity.SalesRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import com.salesdata.entity.Customer;

@Repository
public interface SalesRecordRepository extends JpaRepository<SalesRecord, Long>, JpaSpecificationExecutor<SalesRecord> {
    Optional<SalesRecord> findFirstByCustomerAndIsDeletedFalseOrderByEntryDateDesc(Customer customer);
    List<SalesRecord> findByCustomerAndIsDeletedFalseOrderByEntryDateAsc(Customer customer);
    List<SalesRecord> findByIsDeletedFalse();
    Optional<SalesRecord> findByRemarksAndIsDeletedFalse(String remarks);
    
    @Query("SELECT DISTINCT s.customer FROM SalesRecord s WHERE s.isDeleted = false")
    List<Customer> findUniqueCustomersBasic();

    @Query("SELECT s FROM SalesRecord s WHERE s.isDeleted = false AND s.customer.customerName = :customerName AND s.customer.contactNumber = :contact")
    List<SalesRecord> findByCustomerNameAndContact(@org.springframework.data.repository.query.Param("customerName") String customerName, @org.springframework.data.repository.query.Param("contact") String contact);

    @Query("SELECT s FROM SalesRecord s WHERE s.isDeleted = false AND s.customer.customerName = :customerName")
    List<SalesRecord> findByCustomerName(@org.springframework.data.repository.query.Param("customerName") String customerName);
}
