package com.salesdata.controller;

import com.salesdata.entity.Salesman;
import com.salesdata.repository.SalesmanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salesmen")
public class SalesmanController {

    @Autowired
    private SalesmanRepository salesmanRepository;

    @GetMapping
    public List<Salesman> getAllSalesmen() {
        return salesmanRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Salesmen', 'CREATE')")
    public Salesman createSalesman(@RequestBody Salesman salesman) {
        return salesmanRepository.save(salesman);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Salesmen', 'EDIT')")
    public ResponseEntity<Salesman> updateSalesman(@PathVariable Long id, @RequestBody Salesman salesmanDetails) {
        return salesmanRepository.findById(id)
                .map(salesman -> {
                    salesman.setName(salesmanDetails.getName());
                    salesman.setStatus(salesmanDetails.getStatus());
                    return ResponseEntity.ok(salesmanRepository.save(salesman));
                }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, 'Salesmen', 'DELETE')")
    public ResponseEntity<?> deleteSalesman(@PathVariable Long id) {
        return salesmanRepository.findById(id)
                .map(salesman -> {
                    salesmanRepository.delete(salesman);
                    return ResponseEntity.ok().build();
                }).orElse(ResponseEntity.notFound().build());
    }
}
