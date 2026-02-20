package com.ainexus.hpm.patient.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AuditConfig {

    /**
     * Configures OpenAPI metadata for Swagger UI.
     * Audit user identity is passed via X-User-ID request header — no Spring Security auditor needed.
     */
    @Bean
    public OpenAPI patientServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("HPM Patient Service API")
                        .description("Hospital Management System - Patient Management Microservice")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Ai Nexus")
                                .email("support@ainexus.com")));
    }
}
