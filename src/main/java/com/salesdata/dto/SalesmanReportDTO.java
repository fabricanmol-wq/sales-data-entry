package com.salesdata.dto;

import java.math.BigDecimal;

public class SalesmanReportDTO {
    private String salesmanName;
    private int todayQty;
    private BigDecimal todayAmt;
    private int weeklyQty;
    private BigDecimal weeklyAmt;
    private int monthlyQty;
    private BigDecimal monthlyAmt;
    private int customQty;
    private BigDecimal customAmt;

    public SalesmanReportDTO(String salesmanName) {
        this.salesmanName = salesmanName;
        this.todayQty = 0;
        this.todayAmt = BigDecimal.ZERO;
        this.weeklyQty = 0;
        this.weeklyAmt = BigDecimal.ZERO;
        this.monthlyQty = 0;
        this.monthlyAmt = BigDecimal.ZERO;
        this.customQty = 0;
        this.customAmt = BigDecimal.ZERO;
    }

    public String getSalesmanName() { return salesmanName; }
    public void setSalesmanName(String salesmanName) { this.salesmanName = salesmanName; }

    public int getTodayQty() { return todayQty; }
    public void setTodayQty(int todayQty) { this.todayQty = todayQty; }

    public BigDecimal getTodayAmt() { return todayAmt; }
    public void setTodayAmt(BigDecimal todayAmt) { this.todayAmt = todayAmt; }

    public int getWeeklyQty() { return weeklyQty; }
    public void setWeeklyQty(int weeklyQty) { this.weeklyQty = weeklyQty; }

    public BigDecimal getWeeklyAmt() { return weeklyAmt; }
    public void setWeeklyAmt(BigDecimal weeklyAmt) { this.weeklyAmt = weeklyAmt; }

    public int getMonthlyQty() { return monthlyQty; }
    public void setMonthlyQty(int monthlyQty) { this.monthlyQty = monthlyQty; }

    public BigDecimal getMonthlyAmt() { return monthlyAmt; }
    public void setMonthlyAmt(BigDecimal monthlyAmt) { this.monthlyAmt = monthlyAmt; }

    public int getCustomQty() { return customQty; }
    public void setCustomQty(int customQty) { this.customQty = customQty; }

    public BigDecimal getCustomAmt() { return customAmt; }
    public void setCustomAmt(BigDecimal customAmt) { this.customAmt = customAmt; }
}
