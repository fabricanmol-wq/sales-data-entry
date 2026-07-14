package com.salesdata.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String itemName;
    
    @Column(unique = true)
    private String sku;
    
    @Column(name = "shortcut_key")
    private String shortcutKey;
    
    @Column(nullable = false)
    private BigDecimal price = BigDecimal.ZERO;
    
    @Column(nullable = false)
    private Integer stockQuantity;
    
    private String description;
}
