package com.ainexus.hpm.patient.exception;

import com.ainexus.hpm.patient.dto.response.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GlobalExceptionHandler Unit Tests")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("handlePatientNotFound: returns 404 with patient ID in message")
    void handlePatientNotFound_returns404() {
        PatientNotFoundException ex = new PatientNotFoundException("P9999999");
        ResponseEntity<ApiResponse<Void>> response = handler.handlePatientNotFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("P9999999");
    }

    @Test
    @DisplayName("handleStatusConflict: returns 409 with conflict message")
    void handleStatusConflict_returns409() {
        PatientStatusConflictException ex = new PatientStatusConflictException("Patient P2026001 is already inactive");
        ResponseEntity<ApiResponse<Void>> response = handler.handleStatusConflict(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("already inactive");
    }

    @Test
    @DisplayName("handleIllegalArgument: returns 400")
    void handleIllegalArgument_returns400() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid input");
        ResponseEntity<ApiResponse<Void>> response = handler.handleIllegalArgument(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Invalid input");
    }

    @Test
    @DisplayName("handleGenericException: returns 500 with generic message")
    void handleGenericException_returns500() {
        Exception ex = new RuntimeException("Something broke");
        ResponseEntity<ApiResponse<Void>> response = handler.handleGenericException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).contains("Something broke");
    }
}
