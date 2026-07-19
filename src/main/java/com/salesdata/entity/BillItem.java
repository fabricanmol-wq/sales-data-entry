package com.salesdata.entity;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "bill_items")
@Getter
@Setter
public class BillItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    @JsonIgnore
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Bill bill;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    private Product product;
    
    @Column(nullable = false)
    private BigDecimal unitPrice = BigDecimal.ZERO;
    
    @Column(nullable = false)
    private Integer quantity;
    
    @Column(nullable = false)
    private BigDecimal totalPrice = BigDecimal.ZERO;
}
