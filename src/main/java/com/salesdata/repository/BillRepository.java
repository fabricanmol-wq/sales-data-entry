package com.salesdata.repository;

import com.salesdata.entity.Bill;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.salesdata.entity.Customer;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByCustomerAndIsDeletedFalse(Customer customer);
    List<Bill> findByIsDeletedFalse();
    List<Bill> findByIsDeletedFalse(org.springframework.data.domain.Sort sort);
}
