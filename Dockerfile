# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy frontend and build it
COPY frontend/ ./frontend/
RUN cd frontend && npm install && npm run build

# Copy backend and install dependencies
COPY backend/ ./backend/
RUN cd backend && npm install --omit=dev

# Copy built frontend into backend/public
RUN cp -r frontend/dist backend/public

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app

# Copy backend with dependencies and built frontend
COPY --from=builder /app/backend ./backend

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3001

# Run migrations then start server
CMD ["sh", "-c", "cd backend && node src/db/migrate.js && node src/server.js"]
