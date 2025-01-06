# Stage 1: Build the React frontend
FROM node:18 AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files and install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy the rest of the frontend source code and build the frontend
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Python backend
FROM python:3.11-slim AS backend-build

WORKDIR /app/backend

# Copy backend requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code
COPY backend/ ./

# Stage 3: Combine frontend and backend
FROM python:3.11-slim

WORKDIR /app

# Copy backend from the backend-build stage
COPY --from=backend-build /app/backend /app/backend

# Copy frontend build from the frontend-build stage
COPY --from=frontend-build /app/frontend/dist /app/backend/static

# Expose the port the app runs on
EXPOSE 8080

# Command to run the backend
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]