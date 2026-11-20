FROM node:24-bookworm-slim AS frontend
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global pnpm@11 && pnpm install --frozen-lockfile
COPY src ./src
COPY public ./public
COPY scripts/build.mjs ./scripts/build.mjs
COPY index.html tsconfig.json vite.config.ts ./
RUN pnpm build

FROM maven:3.9-eclipse-temurin-25 AS backend
WORKDIR /src
COPY backend/pom.xml ./backend/pom.xml
RUN mvn -B -ntp -f backend/pom.xml dependency:go-offline
COPY backend/src ./backend/src
COPY --from=frontend /src/dist ./dist
RUN mvn -B -ntp -f backend/pom.xml -DskipTests package

FROM eclipse-temurin:25-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /src/backend/target-verified/synera-backend-1.0.0-SNAPSHOT.jar /opt/synera/app.jar
ENV SPRING_PROFILES_ACTIVE=shared-test
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "/opt/synera/app.jar"]
