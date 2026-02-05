# Docker Deployment Guide

Detailed instructions for deploying the MCP server using Docker.

## Quick Start (10 minutes)

1. **Build Docker Image**
   ```bash
   cd packages/mcp-server
   docker build -t lunchtable-mcp:latest .
   ```

2. **Run Container Locally**
   ```bash
   docker run -p 3000:3000 \
     -e LTCG_API_KEY=your_api_key \
     -e MCP_TRANSPORT=http \
     lunchtable-mcp:latest
   ```

3. **Test**
   ```bash
   curl http://localhost:3000/health
   ```

4. **Push to Registry**
   ```bash
   docker tag lunchtable-mcp:latest <username>/lunchtable-mcp:latest
   docker push <username>/lunchtable-mcp:latest
   ```

## Build Process

### Building the Image

```bash
# Navigate to MCP server
cd packages/mcp-server

# Build image
docker build -t lunchtable-mcp:latest .

# Build with custom tag
docker build -t lunchtable-mcp:v1.0.0 .

# Build for specific architecture
docker build --platform linux/amd64 -t lunchtable-mcp:latest .
docker build --platform linux/arm64 -t lunchtable-mcp:latest .

# Build with buildkit for better caching
DOCKER_BUILDKIT=1 docker build -t lunchtable-mcp:latest .
```

### Understanding the Dockerfile

Multi-stage build:

1. **Stage 1: Builder**
   - Uses `oven/bun:1` base image
   - Installs dependencies with `bun install`
   - Compiles TypeScript with `bun run build`

2. **Stage 2: Runtime**
   - Uses `oven/bun:1-slim` for smaller size
   - Copies only built artifacts and dependencies
   - Sets environment variables
   - Exposes port 3000
   - Includes health check

**Benefits:**
- Minimal final image size (~500 MB)
- No build tools in production
- Security: only runtime dependencies
- Fast deployments

### Image Layers

Check image composition:

```bash
# View image layers
docker history lunchtable-mcp:latest

# View image details
docker inspect lunchtable-mcp:latest

# View image size
docker images | grep lunchtable-mcp
```

## Local Development

### Run Locally

```bash
# Start container
docker run -p 3000:3000 \
  -e LTCG_API_KEY=test_key \
  -e MCP_TRANSPORT=http \
  lunchtable-mcp:latest

# Run in background
docker run -d -p 3000:3000 \
  --name mcp-server \
  -e LTCG_API_KEY=test_key \
  lunchtable-mcp:latest

# View logs
docker logs mcp-server

# View live logs
docker logs -f mcp-server

# Stop container
docker stop mcp-server

# Remove container
docker rm mcp-server
```

### Mount Local Code

For development with live changes:

```bash
docker run -p 3000:3000 \
  -v /Users/home/Desktop/LTCG/packages/mcp-server/src:/app/src \
  -e LTCG_API_KEY=test_key \
  -it lunchtable-mcp:latest

# Note: Requires rebuild on source changes
```

### Interactive Shell

```bash
# Start container with shell
docker run -it lunchtable-mcp:latest /bin/bash

# Or run shell in existing container
docker exec -it mcp-server bash

# Check processes
docker exec mcp-server ps aux

# View environment
docker exec mcp-server env
```

## Docker Compose

### Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-server:
    build:
      context: packages/mcp-server
      dockerfile: Dockerfile
    container_name: lunchtable-mcp
    ports:
      - "3000:3000"
    environment:
      MCP_TRANSPORT: http
      NODE_ENV: production
      PORT: 3000
      LTCG_API_KEY: ${LTCG_API_KEY}
      LTCG_API_URL: https://lunchtable.cards
      MCP_API_KEY: ${MCP_API_KEY}
      ALLOWED_ORIGINS: "*"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - mcp-network
    volumes:
      - mcp-logs:/app/logs
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

networks:
  mcp-network:
    driver: bridge

volumes:
  mcp-logs:
    driver: local
```

### Environment File

Create `.env`:

```bash
LTCG_API_KEY=your_api_key_here
MCP_API_KEY=your_mcp_key_here
```

**Important:** Add `.env` to `.gitignore`

```bash
echo ".env" >> .gitignore
```

### Start Services

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f mcp-server

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild image
docker-compose up -d --build

# Scale services
docker-compose up -d --scale mcp-server=3

# View running services
docker-compose ps

# Execute command in service
docker-compose exec mcp-server curl http://localhost:3000/health
```

## Registry Management

### Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag image for Docker Hub
docker tag lunchtable-mcp:latest <username>/lunchtable-mcp:latest

# Push to Docker Hub
docker push <username>/lunchtable-mcp:latest

# Pull image
docker pull <username>/lunchtable-mcp:latest

# View image on Docker Hub
# https://hub.docker.com/r/<username>/lunchtable-mcp
```

### GitHub Container Registry

```bash
# Login to GitHub Container Registry
echo $CR_PAT | docker login ghcr.io -u <username> --password-stdin

# Tag image
docker tag lunchtable-mcp:latest ghcr.io/<username>/lunchtable-mcp:latest

# Push
docker push ghcr.io/<username>/lunchtable-mcp:latest

# Pull
docker pull ghcr.io/<username>/lunchtable-mcp:latest
```

### Private Registry

```bash
# Login to private registry
docker login <registry.example.com>

# Tag image
docker tag lunchtable-mcp:latest <registry.example.com>/lunchtable-mcp:latest

# Push
docker push <registry.example.com>/lunchtable-mcp:latest

# Pull
docker pull <registry.example.com>/lunchtable-mcp:latest
```

## Cloud Deployment

### AWS EC2

```bash
# SSH into EC2 instance
ssh -i key.pem ubuntu@your-instance-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Pull image
docker pull <username>/lunchtable-mcp:latest

# Run container
docker run -d -p 80:3000 \
  --name mcp-server \
  -e LTCG_API_KEY=your_key \
  <username>/lunchtable-mcp:latest

# View logs
docker logs -f mcp-server
```

### AWS ECS (Elastic Container Service)

1. **Create ECR Repository**
   ```bash
   aws ecr create-repository --repository-name lunchtable-mcp
   ```

2. **Push Image**
   ```bash
   # Get ECR login
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Tag image
   docker tag lunchtable-mcp:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/lunchtable-mcp:latest

   # Push
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/lunchtable-mcp:latest
   ```

3. **Create ECS Task Definition**
   ```json
   {
     "family": "lunchtable-mcp",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "containerDefinitions": [
       {
         "name": "mcp-server",
         "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/lunchtable-mcp:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "MCP_TRANSPORT",
             "value": "http"
           },
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "LTCG_API_KEY",
             "valueFrom": "arn:aws:secretsmanager:region:account:secret:ltcg-api-key"
           }
         ]
       }
     ]
   }
   ```

4. **Create ECS Service**
   ```bash
   aws ecs create-service \
     --cluster production \
     --service-name mcp-server \
     --task-definition lunchtable-mcp \
     --desired-count 1 \
     --launch-type FARGATE
   ```

### Google Cloud Run

```bash
# Authenticate
gcloud auth login

# Configure Docker
gcloud auth configure-docker

# Tag image
docker tag lunchtable-mcp:latest gcr.io/<project-id>/lunchtable-mcp:latest

# Push to Google Container Registry
docker push gcr.io/<project-id>/lunchtable-mcp:latest

# Deploy to Cloud Run
gcloud run deploy mcp-server \
  --image gcr.io/<project-id>/lunchtable-mcp:latest \
  --platform managed \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars LTCG_API_KEY=your_key \
  --set-env-vars MCP_TRANSPORT=http \
  --allow-unauthenticated
```

### DigitalOcean App Platform

```bash
# Push to DigitalOcean Container Registry
doctl registry login

# Tag image
docker tag lunchtable-mcp:latest registry.digitalocean.com/<username>/lunchtable-mcp:latest

# Push
docker push registry.digitalocean.com/<username>/lunchtable-mcp:latest

# Deploy app (via UI or CLI)
doctl apps create --spec app.yaml
```

Create `app.yaml`:

```yaml
name: lunchtable-mcp
services:
- name: api
  github:
    repo: your-repo
    branch: main
  build_command: docker build -t lunchtable-mcp .
  run_command: docker run -p 3000:3000 lunchtable-mcp
  envs:
  - key: LTCG_API_KEY
    scope: RUN_AND_BUILD_TIME
    value: ${LTCG_API_KEY}
```

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
brew install kubectl

# Install Helm (optional)
brew install helm

# Connect to cluster
kubectl config use-context <cluster-name>
```

### Manual Deployment

Create `k8s-deployment.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-config
  namespace: mcp
data:
  MCP_TRANSPORT: "http"
  NODE_ENV: "production"
  LTCG_API_URL: "https://lunchtable.cards"

---
apiVersion: v1
kind: Secret
metadata:
  name: mcp-secrets
  namespace: mcp
type: Opaque
stringData:
  LTCG_API_KEY: "your-api-key"
  MCP_API_KEY: "your-mcp-key"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
  namespace: mcp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: <username>/lunchtable-mcp:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: mcp-config
        - secretRef:
            name: mcp-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server
  namespace: mcp
spec:
  type: LoadBalancer
  selector:
    app: mcp-server
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-server-hpa
  namespace: mcp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

Deploy:

```bash
# Apply manifest
kubectl apply -f k8s-deployment.yaml

# Verify deployment
kubectl get deployments -n mcp
kubectl get pods -n mcp
kubectl get services -n mcp

# View logs
kubectl logs -n mcp -l app=mcp-server --tail=50

# Stream logs
kubectl logs -n mcp -l app=mcp-server -f

# Scale deployment
kubectl scale deployment/mcp-server --replicas=5 -n mcp

# Update image
kubectl set image deployment/mcp-server \
  mcp-server=<username>/lunchtable-mcp:v1.0.1 \
  -n mcp

# Check rollout status
kubectl rollout status deployment/mcp-server -n mcp

# Rollback deployment
kubectl rollout undo deployment/mcp-server -n mcp
```

### Helm Chart (Advanced)

Create `helm/Chart.yaml`:

```yaml
apiVersion: v2
name: lunchtable-mcp
description: MCP Server for LunchTable-TCG
type: application
version: 1.0.0
appVersion: "1.0.0"
```

Create `helm/values.yaml`:

```yaml
replicaCount: 3

image:
  repository: lunchtable-mcp
  tag: latest
  pullPolicy: Always

service:
  type: LoadBalancer
  port: 80
  targetPort: 3000

resources:
  limits:
    memory: 512Mi
    cpu: 500m
  requests:
    memory: 256Mi
    cpu: 250m

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

env:
  MCP_TRANSPORT: http
  NODE_ENV: production
  LTCG_API_URL: https://lunchtable.cards

secrets:
  LTCG_API_KEY: ""
  MCP_API_KEY: ""
```

Deploy with Helm:

```bash
# Install chart
helm install mcp ./helm

# Upgrade chart
helm upgrade mcp ./helm

# View releases
helm list

# Uninstall
helm uninstall mcp
```

## Monitoring and Logging

### View Container Logs

```bash
# Show logs
docker logs mcp-server

# Follow logs
docker logs -f mcp-server

# Show last 100 lines
docker logs --tail=100 mcp-server

# Show logs with timestamps
docker logs -t mcp-server

# Since specific time
docker logs --since 2025-02-05T12:00:00 mcp-server
```

### Monitor Resource Usage

```bash
# Real-time stats
docker stats mcp-server

# Show all containers
docker stats

# Memory only
docker stats --no-stream --format "{{.Container}}\t{{.MemUsage}}"

# CPU only
docker stats --no-stream --format "{{.Container}}\t{{.CPUPerc}}"
```

### Health Checks

```bash
# Manual health check
curl http://localhost:3000/health

# From container
docker exec mcp-server curl -f http://localhost:3000/health || echo "Health check failed"

# Check container health status
docker inspect --format='{{.State.Health.Status}}' mcp-server
```

### Centralized Logging

**ELK Stack (Elasticsearch, Logstash, Kibana):**

```yaml
services:
  mcp-server:
    # ... existing config ...
    logging:
      driver: "splunk"
      options:
        splunk-token: "${SPLUNK_TOKEN}"
        splunk-url: "https://your-splunk.com:8088"
        tag: "mcp-server"
```

**CloudWatch (AWS):**

```yaml
services:
  mcp-server:
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "/ecs/mcp-server"
        awslogs-region: "us-east-1"
        awslogs-stream-prefix: "ecs"
```

## Best Practices

### Security

1. **Never commit secrets**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use secrets management**
   - Kubernetes Secrets
   - AWS Secrets Manager
   - HashiCorp Vault

3. **Scan images for vulnerabilities**
   ```bash
   docker scan lunchtable-mcp:latest
   ```

4. **Use specific image tags** (not `latest`)
   ```bash
   docker tag lunchtable-mcp:v1.0.0 .
   docker run ... lunchtable-mcp:v1.0.0
   ```

5. **Run as non-root user**
   ```dockerfile
   RUN useradd -m -u 1000 app
   USER app
   ```

### Performance

1. **Multi-stage builds** (already in Dockerfile)
2. **Minimize layer count**
3. **Cache invalidation**
   ```dockerfile
   # Bad: invalidates cache on any file change
   COPY . .

   # Good: specific copies
   COPY package.json bun.lock ./
   RUN bun install
   COPY src ./src
   ```

4. **Use `.dockerignore`** (already included)

### Resource Management

1. **Set resource limits**
   ```bash
   docker run -m 512m --cpus="1" lunchtable-mcp:latest
   ```

2. **Health checks** (included in Dockerfile)

3. **Graceful shutdown**
   ```dockerfile
   STOPSIGNAL SIGTERM
   ```

## FAQ

**Q: How do I update the running container?**
A: Pull new image and restart container:
```bash
docker pull <username>/lunchtable-mcp:latest
docker restart mcp-server
```

**Q: How do I export Docker image?**
A: Use `docker save`:
```bash
docker save lunchtable-mcp:latest > mcp-server.tar
# Transfer to another machine
docker load < mcp-server.tar
```

**Q: How do I remove unused images?**
A: Prune dangling images:
```bash
docker image prune -a
```

**Q: Can I use Docker Compose in production?**
A: Not recommended. Use Kubernetes or container orchestration services instead.

**Q: How do I debug container issues?**
A: Use interactive shell:
```bash
docker run -it lunchtable-mcp:latest /bin/bash
```

**Q: How do I limit log file size?**
A: Configure logging driver:
```bash
docker run --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 lunchtable-mcp:latest
```

## Support

- **Docker Docs:** https://docs.docker.com
- **Best Practices:** https://docs.docker.com/develop/dev-best-practices
- **Kubernetes Docs:** https://kubernetes.io/docs
