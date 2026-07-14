package com.salesdata.repository;

import com.salesdata.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long>, JpaSpecificationExecutor<SupportTicket> {
    List<SupportTicket> findByStatusOrderByCreatedDateDesc(String status);
    long countByStatus(String status);
}
