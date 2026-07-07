# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve with FastAPI
FROM python:3.9-slim
WORKDIR /app

RUN apt-get update && apt-get install -y gcc sqlite3 && rm -rf /var/lib/apt/lists/*

# Install required Python packages
RUN pip install fastapi uvicorn sqlalchemy passlib bcrypt pyjwt websockets apscheduler python-dotenv yfinance vaderSentiment beautifulsoup4

# Copy backend files
COPY . .

# Remove any old static files and copy the fresh React build
RUN rm -rf static/*
COPY --from=frontend-builder /app/frontend/dist /app/static

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
