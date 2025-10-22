#!/bin/bash

# =============================================================================
# Proposal Writing SaaS - Deployment Script
# =============================================================================
#
# This script automates the deployment process for the Proposal SaaS platform
#
# Usage:
#   ./deploy.sh [environment]
#
# Environments:
#   development - Local development with hot reload
#   production  - Production deployment with optimizations
#   staging     - Staging environment for testing
#
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-development}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Proposal Writing SaaS - Deployment Script          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Check prerequisites
print_info "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || {
    print_error "Docker is not installed. Please install Docker first."
    exit 1
}

command -v docker-compose >/dev/null 2>&1 || {
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
}

print_success "Prerequisites check passed"

# Check environment file
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating from .env.example..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before proceeding."
    print_info "At minimum, set ANTHROPIC_API_KEY for AI features to work."
    exit 1
fi

print_success "Environment file found"

# Validate required environment variables
source .env

if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" == "sk-ant-your-anthropic-api-key-here" ]; then
    print_error "ANTHROPIC_API_KEY is not set in .env file"
    print_info "Get your API key from: https://console.anthropic.com/"
    exit 1
fi

print_success "Required environment variables are set"

# Environment-specific deployment
case $ENVIRONMENT in
    development)
        print_info "Deploying to DEVELOPMENT environment..."

        # Pull latest images
        print_info "Pulling Docker images..."
        docker-compose -f docker-compose.proposal-saas.yml pull

        # Build application
        print_info "Building application..."
        docker-compose -f docker-compose.proposal-saas.yml build

        # Stop existing containers
        print_info "Stopping existing containers..."
        docker-compose -f docker-compose.proposal-saas.yml down

        # Start services
        print_info "Starting services..."
        docker-compose -f docker-compose.proposal-saas.yml up -d

        # Wait for database to be ready
        print_info "Waiting for database to be ready..."
        sleep 10

        # Run migrations
        print_info "Running database migrations..."
        docker-compose -f docker-compose.proposal-saas.yml exec -T backend yarn prisma migrate deploy

        # Seed database
        print_info "Seeding database with test data..."
        docker-compose -f docker-compose.proposal-saas.yml exec -T backend yarn prisma db seed

        print_success "Development environment deployed successfully!"
        echo ""
        print_info "Access points:"
        echo "  - GraphQL API: http://localhost:8080/graphql"
        echo "  - Health Check: http://localhost:8080/health"
        echo "  - pgAdmin: http://localhost:5050 (admin@proposal-saas.local / admin)"
        echo ""
        print_info "Test credentials:"
        echo "  - Email: admin@nonprofit.org"
        echo "  - Password: password123"
        ;;

    production)
        print_warning "Deploying to PRODUCTION environment..."

        # Safety check
        read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "Deployment cancelled"
            exit 0
        fi

        # Verify production environment variables
        if [ "$NODE_ENV" != "production" ]; then
            print_error "NODE_ENV is not set to 'production' in .env file"
            exit 1
        fi

        if [ "$JWT_SECRET" == "change-this-to-a-strong-random-secret-in-production" ]; then
            print_error "JWT_SECRET is using default value. Please set a strong secret!"
            exit 1
        fi

        # Pull latest code
        print_info "Pulling latest code..."
        git pull origin main

        # Build application
        print_info "Building application with production optimizations..."
        docker-compose -f docker-compose.proposal-saas.yml build --no-cache

        # Create backup
        print_info "Creating database backup..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        docker-compose -f docker-compose.proposal-saas.yml exec -T postgres \
            pg_dump -U openagent openagent > "backup_${timestamp}.sql"
        print_success "Backup created: backup_${timestamp}.sql"

        # Stop existing containers
        print_info "Stopping existing containers..."
        docker-compose -f docker-compose.proposal-saas.yml down

        # Start services
        print_info "Starting services..."
        docker-compose -f docker-compose.proposal-saas.yml up -d

        # Wait for services to be ready
        print_info "Waiting for services to be ready..."
        sleep 20

        # Run migrations
        print_info "Running database migrations..."
        docker-compose -f docker-compose.proposal-saas.yml exec -T backend yarn prisma migrate deploy

        # Health check
        print_info "Performing health check..."
        sleep 5
        if curl -f http://localhost:8080/health > /dev/null 2>&1; then
            print_success "Health check passed!"
        else
            print_error "Health check failed!"
            print_info "Check logs: docker-compose -f docker-compose.proposal-saas.yml logs backend"
            exit 1
        fi

        print_success "Production deployment completed successfully!"
        echo ""
        print_warning "Important post-deployment tasks:"
        echo "  1. Verify all services are running: docker-compose -f docker-compose.proposal-saas.yml ps"
        echo "  2. Check application logs: docker-compose -f docker-compose.proposal-saas.yml logs -f backend"
        echo "  3. Test critical workflows"
        echo "  4. Monitor error rates and performance"
        echo "  5. Keep backup file safe: backup_${timestamp}.sql"
        ;;

    staging)
        print_info "Deploying to STAGING environment..."

        # Similar to production but without confirmations
        docker-compose -f docker-compose.proposal-saas.yml build
        docker-compose -f docker-compose.proposal-saas.yml down
        docker-compose -f docker-compose.proposal-saas.yml up -d

        sleep 15
        docker-compose -f docker-compose.proposal-saas.yml exec -T backend yarn prisma migrate deploy

        print_success "Staging environment deployed successfully!"
        ;;

    *)
        print_error "Invalid environment: $ENVIRONMENT"
        print_info "Valid options: development, production, staging"
        exit 1
        ;;
esac

# Display service status
echo ""
print_info "Service Status:"
docker-compose -f docker-compose.proposal-saas.yml ps

# Display useful commands
echo ""
print_info "Useful commands:"
echo "  - View logs:           docker-compose -f docker-compose.proposal-saas.yml logs -f"
echo "  - Stop services:       docker-compose -f docker-compose.proposal-saas.yml down"
echo "  - Restart services:    docker-compose -f docker-compose.proposal-saas.yml restart"
echo "  - Open shell:          docker-compose -f docker-compose.proposal-saas.yml exec backend sh"
echo "  - Run migrations:      docker-compose -f docker-compose.proposal-saas.yml exec backend yarn prisma migrate deploy"
echo "  - Seed database:       docker-compose -f docker-compose.proposal-saas.yml exec backend yarn prisma db seed"
echo "  - Generate embeddings: docker-compose -f docker-compose.proposal-saas.yml exec backend yarn ts-node scripts/generate-embeddings.ts --all"

echo ""
print_success "Deployment complete! 🚀"
