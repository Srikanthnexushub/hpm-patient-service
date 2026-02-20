# ============================================================
# HPM Patient Service — Multi-Stage Dockerfile
# Stage 1: Build  |  Stage 2: Runtime
# ============================================================

# ---- Build Stage ----
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /build

# Copy pom.xml and download dependencies first (layer cache)
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    mvn dependency:go-offline -q 2>/dev/null || true

# Install Maven
RUN apk add --no-cache maven

# Re-download with maven available
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and build
COPY src ./src
ARG DB_URL=jdbc:postgresql://placeholder:5432/placeholder
ARG DB_USERNAME=placeholder
ARG DB_PASSWORD=placeholder
ENV DB_URL=${DB_URL}
ENV DB_USERNAME=${DB_USERNAME}
ENV DB_PASSWORD=${DB_PASSWORD}
RUN mvn package -DskipTests -q

# ---- Runtime Stage ----
FROM eclipse-temurin:17-jre-alpine AS runtime
LABEL maintainer="Ai Nexus <devops@ainexus.com>"
LABEL org.opencontainers.image.title="HPM Patient Service"
LABEL org.opencontainers.image.description="Hospital Management System - Patient Microservice"
LABEL org.opencontainers.image.vendor="Ai Nexus"

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy jar from build stage
COPY --from=builder /build/target/*.jar app.jar

# Create logs directory
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:${SERVER_PORT:-8081}/actuator/health || exit 1

EXPOSE ${SERVER_PORT:-8081}

ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
