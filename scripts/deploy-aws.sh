#!/bin/bash

# AWS Deployment Script for Clinical Canvas

set -e

echo "🏥 Clinical Canvas - AWS Deployment"
echo "==================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is required but not installed."
    echo "   Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK is required but not installed."
    echo "   Install with: npm install -g aws-cdk"
    exit 1
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured."
    echo "   Run: aws configure"
    exit 1
fi

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo "📋 Deployment Details:"
echo "   AWS Account: $AWS_ACCOUNT"
echo "   AWS Region: $AWS_REGION"
echo ""

# Confirm deployment
read -p "🚀 Deploy to AWS? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Navigate to infrastructure directory
cd infrastructure

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install CDK dependencies
echo "📦 Installing CDK dependencies..."
pip install -r requirements.txt

# Bootstrap CDK (if not already done)
echo "🔧 Bootstrapping CDK..."
cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION

# Deploy the stack
echo "🚀 Deploying Clinical Canvas stack..."
cdk deploy --require-approval never

echo ""
echo "✅ Deployment completed successfully!"
echo ""

# Get the API URL from stack outputs
API_URL=$(aws cloudformation describe-stacks \
    --stack-name ClinicalCanvasStack \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text \
    --region $AWS_REGION)

INIT_FUNCTION=$(aws cloudformation describe-stacks \
    --stack-name ClinicalCanvasStack \
    --query 'Stacks[0].Outputs[?OutputKey==`InitLambdaFunctionName`].OutputValue' \
    --output text \
    --region $AWS_REGION)

echo "📋 Deployment Information:"
echo "   API URL: $API_URL"
echo "   API Documentation: ${API_URL}docs"
echo ""

# Initialize database with sample data
echo "🌱 Initializing database with sample data..."
aws lambda invoke \
    --function-name $INIT_FUNCTION \
    --region $AWS_REGION \
    --payload '{}' \
    /tmp/init-response.json

echo "✅ Database initialized!"
echo ""

# Update frontend configuration
echo "🔧 Frontend Configuration:"
echo "   Update your frontend .env file with:"
echo "   VITE_API_BASE_URL=${API_URL}api"
echo "   VITE_USE_REAL_API=true"
echo ""

echo "👤 Sample login credentials:"
echo "   Email: sarah.wilson@hospital.com"
echo "   Password: password123"
echo ""

echo "🎉 Clinical Canvas is now deployed and ready to use!"