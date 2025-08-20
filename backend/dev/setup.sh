#!/bin/bash

# HMS Backend Setup Script
# This script helps set up and deploy the HMS backend system

set -e  # Exit on any error

echo "🏥 HMS Backend Setup & Deployment Script"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Install with: brew install awscli"
        exit 1
    fi
    
    # Check SAM CLI
    if ! command -v sam &> /dev/null; then
        print_error "SAM CLI not found. Install with: brew install aws-sam-cli"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Show current configuration
show_config() {
    print_status "Current configuration:"
    echo "  AWS Region: $(aws configure get region)"
    echo "  AWS Account: $(aws sts get-caller-identity --query Account --output text)"
    echo "  AWS User: $(aws sts get-caller-identity --query Arn --output text)"
}

# Build SAM application
build_sam() {
    print_status "Building SAM application..."
    
    if [ -d ".aws-sam" ]; then
        print_warning "Existing .aws-sam directory found. Cleaning up..."
        rm -rf .aws-sam
    fi
    
    sam build
    print_success "SAM build completed!"
}

# Deploy to AWS
deploy_sam() {
    local stack_name=${1:-"hms-dev"}
    print_status "Deploying to AWS (stack: $stack_name)..."
    
    sam deploy \
        --stack-name "$stack_name" \
        --capabilities CAPABILITY_IAM \
        --resolve-s3 \
        --no-confirm-changeset
    
    print_success "Deployment completed!"
}

# Get deployment information
get_deployment_info() {
    local stack_name=${1:-"hms-dev"}
    print_status "Getting deployment information..."
    
    # Get function URL
    local function_url=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" \
        --output text 2>/dev/null || echo "Not found")
    
    # Get S3 bucket name
    local bucket_name=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='PatientFilesBucketName'].OutputValue" \
        --output text 2>/dev/null || echo "Not found")
    
    echo ""
    echo "📋 Deployment Information:"
    echo "  Stack Name: $stack_name"
    echo "  Function URL: $function_url"
    echo "  S3 Bucket: $bucket_name"
    echo "  Region: $(aws configure get region)"
}

# Test deployment
test_deployment() {
    local stack_name=${1:-"hms-dev"}
    print_status "Testing deployment..."
    
    local function_url=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" \
        --output text 2>/dev/null)
    
    if [ "$function_url" = "None" ] || [ -z "$function_url" ]; then
        print_error "Could not get function URL from stack outputs"
        return 1
    fi
    
    # Test basic endpoint
    echo "  Testing patients endpoint..."
    local response=$(curl -s "$function_url/patients" || echo "ERROR")
    
    if [[ "$response" == *"ERROR"* ]]; then
        print_error "API test failed"
        return 1
    fi
    
    print_success "API is responding correctly!"
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup         Check prerequisites and show configuration"
    echo "  build         Build SAM application"
    echo "  deploy        Deploy to AWS (default stack: hms-dev)"
    echo "  info          Show deployment information"
    echo "  test          Test the deployment"
    echo "  full          Complete setup: build + deploy + test"
    echo "  clean         Clean build artifacts"
    echo ""
    echo "Options:"
    echo "  --stack-name NAME    Use custom stack name (default: hms-dev)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 full                    # Complete setup with default stack"
    echo "  $0 deploy --stack-name hms-prod    # Deploy to production stack"
    echo "  $0 info --stack-name hms-dev       # Get info for specific stack"
}

# Clean build artifacts
clean_artifacts() {
    print_status "Cleaning build artifacts..."
    rm -rf .aws-sam
    print_success "Build artifacts cleaned!"
}

# Main script logic
main() {
    local command=${1:-"help"}
    local stack_name="hms-dev"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --stack-name)
                stack_name="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            setup|build|deploy|info|test|full|clean|help)
                command="$1"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    case $command in
        setup)
            check_prerequisites
            show_config
            ;;
        build)
            check_prerequisites
            build_sam
            ;;
        deploy)
            check_prerequisites
            deploy_sam "$stack_name"
            ;;
        info)
            get_deployment_info "$stack_name"
            ;;
        test)
            test_deployment "$stack_name"
            ;;
        full)
            check_prerequisites
            show_config
            build_sam
            deploy_sam "$stack_name"
            get_deployment_info "$stack_name"
            test_deployment "$stack_name"
            print_success "Complete setup finished!"
            ;;
        clean)
            clean_artifacts
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"