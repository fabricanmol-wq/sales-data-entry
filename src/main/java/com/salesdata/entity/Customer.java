package com.salesdata.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "customers")
@Getter
@Setter
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private String contactNumber;

    private String city;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false, columnDefinition = "BOOLEAN")
    private boolean isDeleted = false;

    @ManyToOne
    @JoinColumn(name = "next_salesman_id")
    private Salesman nextSalesman;

    @Column
    private Double fixedDiscount = 0.0;

    @Transient
    private Long nextSalesmanId;

    private LocalDate nextReminderDate;

    private String capitalize(String str) {
        if (str == null || str.trim().isEmpty()) return str;
        String[] words = str.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.length() > 0) {
                sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1)).append(" ");
            }
        }
        return sb.toString().trim();
    }

    @PrePersist
    @PreUpdate
    public void preSave() {
        if (this.customerName != null) {
            this.customerName = capitalize(this.customerName);
        }
        if (this.city != null) {
            this.city = capitalize(this.city);
        }
    }
}
