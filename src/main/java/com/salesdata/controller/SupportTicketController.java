package com.salesdata.controller;

import com.salesdata.entity.SupportTicket;
import com.salesdata.entity.User;
import com.salesdata.repository.SupportTicketRepository;
import com.salesdata.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tickets")
public class SupportTicketController {

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/raise")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Calling List', 'CREATE') or @customPermissionEvaluator.hasAccess(authentication, 'Support Ticket', 'CREATE')")
    public ResponseEntity<?> raiseTicket(@RequestBody SupportTicket ticket, Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        ticket.setRaisedBy(user);
        ticket.setCreatedDate(LocalDateTime.now());
        ticket.setStatus("OPEN");
        supportTicketRepository.save(ticket);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/list")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Support Ticket', 'VIEW')")
    public ResponseEntity<List<SupportTicket>> getTickets() {
        // Fetch all tickets and filter: Open, or Solved today
        LocalDate today = LocalDate.now();
        List<SupportTicket> allTickets = supportTicketRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdDate"));
        
        List<SupportTicket> filtered = allTickets.stream().filter(t -> {
            if ("OPEN".equals(t.getStatus())) {
                return true;
            } else if ("SOLVED".equals(t.getStatus()) && t.getSolvedDate() != null) {
                // Keep if solved today
                return t.getSolvedDate().toLocalDate().isEqual(today);
            }
            return false;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/count")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Support Ticket', 'VIEW')")
    public ResponseEntity<Long> getOpenCount() {
        return ResponseEntity.ok(supportTicketRepository.countByStatus("OPEN"));
    }

    @PostMapping("/{id}/solve")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Support Ticket', 'EDIT')")
    public ResponseEntity<?> markSolved(@PathVariable Long id) {
        return supportTicketRepository.findById(id).map(ticket -> {
            ticket.setStatus("SOLVED");
            ticket.setSolvedDate(LocalDateTime.now());
            supportTicketRepository.save(ticket);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
