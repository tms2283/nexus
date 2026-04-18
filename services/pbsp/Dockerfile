FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (build-essential needed for some ML/cryptography packages)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency resolution
RUN pip install uv

# Copy project files
COPY pyproject.toml .
# We only install dependencies to cache this layer
RUN uv pip install --system -e .

COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# The local SQLite DB will be mounted here
VOLUME ["/app/data"]

EXPOSE 8002

# We start the API server by default
CMD ["pbsp-api"]
