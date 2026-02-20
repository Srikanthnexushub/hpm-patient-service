# ============================================================
# HPM Patient Service — Multi-Stage Dockerfile
# Stage 1: Build  |  Stage 2: Runtime
# ============================================================

# ---- Build Stage ----
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /build

# Install Maven (must happen before any mvn command)
RUN apk add --no-cache maven

# Copy pom.xml first and pre-download dependencies (leverages Docker layer cache)
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and package (skip tests — run them in CI separately)
COPY src ./src
RUN mvn package -DskipTests -q

# ---- Runtime Stage ----
FROM eclipse-temurin:17-jre-alpine AS runtime
LABEL maintainer="Ai Nexus <devops@ainexus.com>"
LABEL org.opencontainers.image.title="HPM Patient Service"
LABEL org.opencontainers.image.description="Hospital Management System - Patient Microservice"
LABEL org.opencontainers.image.vendor="Ai Nexus"

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy the packaged jar from the build stage
COPY --from=builder /build/target/*.jar app.jar

# Create logs directory with correct ownership
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:${SERVER_PORT:-8081}/actuator/health || exit 1

EXPOSE ${SERVER_PORT:-8081}

ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
