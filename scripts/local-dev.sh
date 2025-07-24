#!/bin/bash

# Local Development Setup Script for Clinical Canvas

set -e

echo "🏥 Clinical Canvas - Local Development Setup"
echo "============================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if DynamoDB Local is running
echo "📋 Checking DynamoDB Local..."
if ! curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "⚠️  DynamoDB Local is not running."
    echo "   Please start DynamoDB Local on port 8000:"
    echo "   java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb"
    echo ""
    echo "   Or use Docker:"
    echo "   docker run -p 8000:8000 amazon/dynamodb-local"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to backend directory
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "   Please review and update .env file with your configuration"
fi

# Create DynamoDB table locally
echo "🗄️  Setting up local DynamoDB table..."
python3 -c "
import boto3
import sys
from botocore.exceptions import ClientError

try:
    # Connect to local DynamoDB
    dynamodb = boto3.resource('dynamodb', 
                             endpoint_url='http://localhost:8000',
                             region_name='us-east-1',
                             aws_access_key_id='dummy',
                             aws_secret_access_key='dummy')
    
    # Create table
    table = dynamodb.create_table(
        TableName='clinical-canvas',
        KeySchema=[
            {'AttributeName': 'PK', 'KeyType': 'HASH'},
            {'AttributeName': 'SK', 'KeyType': 'RANGE'}
        ],
        AttributeDefinitions=[
            {'AttributeName': 'PK', 'AttributeType': 'S'},
            {'AttributeName': 'SK', 'AttributeType': 'S'},
            {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
            {'AttributeName': 'GSI1SK', 'AttributeType': 'S'},
            {'AttributeName': 'GSI2PK', 'AttributeType': 'S'},
            {'AttributeName': 'GSI2SK', 'AttributeType': 'S'},
            {'AttributeName': 'GSI3PK', 'AttributeType': 'S'},
            {'AttributeName': 'GSI3SK', 'AttributeType': 'S'},
        ],
        GlobalSecondaryIndexes=[
            {
                'IndexName': 'AssigneeDue',
                'KeySchema': [
                    {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                    {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            },
            {
                'IndexName': 'RoleName',
                'KeySchema': [
                    {'AttributeName': 'GSI2PK', 'KeyType': 'HASH'},
                    {'AttributeName': 'GSI2SK', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            },
            {
                'IndexName': 'PathwayState',
                'KeySchema': [
                    {'AttributeName': 'GSI3PK', 'KeyType': 'HASH'},
                    {'AttributeName': 'GSI3SK', 'KeyType': 'RANGE'}
                ],
                'Projection': {'ProjectionType': 'ALL'},
                'BillingMode': 'PAY_PER_REQUEST'
            }
        ],
        BillingMode='PAY_PER_REQUEST'
    )
    
    # Wait for table to be created
    table.wait_until_exists()
    print('✅ DynamoDB table created successfully')
    
except ClientError as e:
    if e.response['Error']['Code'] == 'ResourceInUseException':
        print('✅ DynamoDB table already exists')
    else:
        print(f'❌ Error creating table: {e}')
        sys.exit(1)
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
"

# Initialize database with sample data
echo "🌱 Initializing database with sample data..."
python3 init_db.py

echo ""
echo "✅ Local development environment is ready!"
echo ""
echo "🚀 To start the development server:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python -m app.main"
echo ""
echo "📖 API Documentation will be available at:"
echo "   http://localhost:8000/docs"
echo ""
echo "👤 Sample login credentials:"
echo "   Email: sarah.wilson@hospital.com"
echo "   Password: password123"
echo ""