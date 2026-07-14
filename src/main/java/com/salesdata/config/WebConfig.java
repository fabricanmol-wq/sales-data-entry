package com.salesdata.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.math.BigDecimal;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(new Converter<String, BigDecimal>() {
            @Override
            public BigDecimal convert(String source) {
                if (source == null || source.trim().isEmpty()) {
                    return null;
                }
                String cleanString = source.replace(",", "");
                return new BigDecimal(cleanString);
            }
        });

        registry.addConverter(new Converter<String, Double>() {
            @Override
            public Double convert(String source) {
                if (source == null || source.trim().isEmpty()) {
                    return null;
                }
                String cleanString = source.replace(",", "");
                return Double.valueOf(cleanString);
            }
        });
    }
}
