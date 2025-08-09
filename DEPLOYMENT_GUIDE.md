# 🚀 Clinical Canvas Backend - Deployment Guide

This guide provides detailed step-by-step instructions for deploying the Clinical Canvas backend system both locally and on AWS.

## 📋 Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required Software
- **Python 3.11+**: Download from [python.org](https://www.python.org/downloads/)
- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **AWS CLI**: Install from [AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **AWS CDK CLI**: Install with `npm install -g aws-cdk`
- **Git**: For version control

### AWS Account Setup
1. **AWS Account**: You need an active AWS account
2. **AWS Credentials**: Configure with `aws configure`
3. **Appropriate Permissions**: Your AWS user should have permissions for:
   - DynamoDB (create tables, read/write data)
   - Lambda (create functions, manage execution)
   - API Gateway (create APIs, manage deployments)
   - CloudFormation (create/update stacks)
   - IAM (create roles and policies)

## 🏠 Local Development Setup

### Step 1: Clone and Setup Project

```bash
# Clone the repository
git clone <your-repo-url>
cd clinical-canvas-backend

# Make scripts executable
chmod +x scripts/local-dev.sh scripts/deploy-aws.sh
```

### Step 2: Setup DynamoDB Local

#### Option A: Using Docker (Recommended)
```bash
# Pull and run DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Keep this terminal open and running
```

#### Option B: Download and Run Locally
```bash
# Download DynamoDB Local
wget https://s3.us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz
tar -xzf dynamodb_local_latest.tar.gz

# Run DynamoDB Local
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

### Step 3: Run Local Setup Script

```bash
# Run the automated setup script
./scripts/local-dev.sh
```

This script will:
- ✅ Check Python installation
- ✅ Verify DynamoDB Local is running
- ✅ Create Python virtual environment
- ✅ Install all dependencies
- ✅ Create `.env` file from template
- ✅ Create DynamoDB table with GSIs
- ✅ Initialize database with sample data

### Step 4: Start the Development Server

```bash
cd backend
source venv/bin/activate
python -m app.main
```

### Step 5: Verify Local Setup

1. **API Health Check**
   ```bash
   curl http://localhost:8000/health
   ```

2. **API Documentation**
   - Open http://localhost:8000/docs in your browser
   - You should see the FastAPI Swagger documentation

3. **Test Authentication**
   ```bash
     -H "Content-Type: application/json" \
     -d '{"email": "sarah.wilson@hospital.com", "password": "password123"}'
   ```

### Step 6: Configure Frontend

Update your frontend `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_REAL_API=true
VITE_ENABLE_AUTH_API=true
VITE_ENABLE_PATIENTS_API=true
VITE_ENABLE_TASKS_API=true
VITE_ENABLE_DASHBOARD_API=true
```

## ☁️ AWS Deployment

### Step 1: Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Verify configuration
aws sts get-caller-identity
```

You should see output showing your AWS account ID and user information.

### Step 2: Install AWS CDK

```bash
# Install CDK globally
npm install -g aws-cdk

# Verify installation
cdk --version
```

### Step 3: Run AWS Deployment Script

```bash
# Run the automated deployment script
./scripts/deploy-aws.sh
```

This script will:
- ✅ Verify AWS CLI and CDK installation
- ✅ Check AWS credentials
- ✅ Create Python virtual environment for CDK
- ✅ Install CDK dependencies
- ✅ Bootstrap CDK (if needed)
- ✅ Deploy the CloudFormation stack
- ✅ Initialize database with sample data
- ✅ Display deployment information

### Step 4: Verify AWS Deployment

1. **Check CloudFormation Stack**
   ```bash
   aws cloudformation describe-stacks --stack-name ClinicalCanvasStack
   ```

2. **Test API Gateway**
   ```bash
   # Get the API URL from the deployment output
   API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/prod"
   
   # Test health endpoint
   curl $API_URL/health
   ```

3. **Test Authentication**
   ```bash
     -H "Content-Type: application/json" \
     -d '{"email": "sarah.wilson@hospital.com", "password": "password123"}'
   ```

### Step 5: Update Frontend Configuration

Update your frontend `.env` file with the deployed API URL:
```env
VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/api
VITE_USE_REAL_API=true
VITE_ENABLE_AUTH_API=true
VITE_ENABLE_PATIENTS_API=true
VITE_ENABLE_TASKS_API=true
VITE_ENABLE_DASHBOARD_API=true
```

## 🔧 Manual Setup (Alternative)

If the automated scripts don't work for your environment, here's how to set up manually:

### Local Manual Setup

1. **Create Virtual Environment**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create Environment File**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Create DynamoDB Table**
   ```python
   import boto3
   
   dynamodb = boto3.resource('dynamodb', 
                            endpoint_url='http://localhost:8000',
                            region_name='us-east-1',
                            aws_access_key_id='dummy',
                            aws_secret_access_key='dummy')
   
   # Create table (see scripts/local-dev.sh for full table definition)
   ```

5. **Initialize Database**
   ```bash
   python init_db.py
   ```

### AWS Manual Setup

1. **Setup CDK Environment**
   ```bash
   cd infrastructure
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Bootstrap CDK**
   ```bash
   cdk bootstrap
   ```

3. **Deploy Stack**
   ```bash
   cdk deploy
   ```

4. **Initialize Database**
   ```bash
   # Get the Lambda function name from CDK output
   aws lambda invoke \
     --function-name ClinicalCanvasStack-ClinicalCanvasInitLambda... \
     --payload '{}' \
     /tmp/response.json
   ```

## 🧪 Testing Your Deployment

### Sample API Calls

1. **Login and Get Token**
   ```bash
     -H "Content-Type: application/json" \
     -d '{"email": "sarah.wilson@hospital.com", "password": "password123"}' \
     | jq -r '.token')
   ```

2. **Get Patients**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     $API_URL/api/patients
   ```

3. **Get Dashboard KPIs**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     $API_URL/api/dashboard/kpi
   ```

4. **Get Tasks**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     $API_URL/api/tasks
   ```

### Sample Users for Testing

The system comes with pre-configured test users:

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| sarah.wilson@hospital.com | password123 | doctor | Full access |
| emily.johnson@hospital.com | password123 | nurse | Patient care |
| michael.chen@hospital.com | password123 | technician | Lab results |

## 🚨 Troubleshooting

### Common Local Development Issues

**Issue: DynamoDB Connection Error**
```
botocore.exceptions.EndpointConnectionError: Could not connect to the endpoint URL
```
**Solution:**
- Ensure DynamoDB Local is running on port 8000
- Check if another service is using port 8000
- Try restarting DynamoDB Local

**Issue: Python Virtual Environment Issues**
```
Command 'python3' not found
```
**Solution:**
- Ensure Python 3.11+ is installed
- Try using `python` instead of `python3`
- Check your PATH environment variable

**Issue: Permission Denied on Scripts**
```
Permission denied: ./scripts/local-dev.sh
```
**Solution:**
```bash
chmod +x scripts/local-dev.sh scripts/deploy-aws.sh
```

### Common AWS Deployment Issues

**Issue: AWS Credentials Not Found**
```
Unable to locate credentials
```
**Solution:**
```bash
aws configure
# Enter your Access Key ID, Secret Access Key, and region
```

**Issue: CDK Bootstrap Required**
```
This stack uses assets, so the toolkit stack must be deployed
```
**Solution:**
```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

**Issue: Insufficient Permissions**
```
User: arn:aws:iam::123456789012:user/username is not authorized to perform: dynamodb:CreateTable
```
**Solution:**
- Ensure your AWS user has the required permissions
- Consider using an admin user for initial deployment
- Review the IAM permissions in the prerequisites section

**Issue: Stack Already Exists**
```
Stack ClinicalCanvasStack already exists
```
**Solution:**
```bash
# Update existing stack
cdk deploy

# Or destroy and recreate
cdk destroy
cdk deploy
```

### Performance Issues

**Issue: Slow API Responses**
- Check CloudWatch logs for Lambda cold starts
- Consider increasing Lambda memory allocation
- Review DynamoDB read/write capacity

**Issue: High AWS Costs**
- Monitor DynamoDB usage in CloudWatch
- Consider switching from on-demand to provisioned capacity
- Review Lambda execution duration and memory usage

## 🔒 Security Considerations

### Production Deployment Checklist

- [ ] **Change JWT Secret**: Use AWS Secrets Manager for production
- [ ] **Enable HTTPS**: Ensure all API calls use HTTPS
- [ ] **Configure CORS**: Restrict origins to your frontend domain
- [ ] **Enable API Gateway Throttling**: Prevent abuse
- [ ] **Set up CloudWatch Alarms**: Monitor for errors and unusual activity
- [ ] **Enable DynamoDB Encryption**: Encrypt data at rest
- [ ] **Review IAM Policies**: Use least privilege principle
- [ ] **Enable AWS WAF**: Protect against common web attacks

### Environment-Specific Configuration

**Development**
```env
JWT_SECRET_KEY=dev-secret-key
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080"]
LOG_LEVEL=DEBUG
```

**Production**
```env
JWT_SECRET_KEY=use-aws-secrets-manager
CORS_ORIGINS=["https://yourdomain.com"]
LOG_LEVEL=INFO
```

## 📊 Monitoring and Maintenance

### CloudWatch Monitoring

1. **Set up CloudWatch Alarms**
   - Lambda error rates
   - API Gateway 4xx/5xx errors
   - DynamoDB throttling

2. **Log Monitoring**
   - Check `/aws/lambda/clinical-canvas-api` logs
   - Monitor API Gateway access logs

3. **Performance Metrics**
   - Lambda duration and memory usage
   - DynamoDB read/write capacity utilization

### Regular Maintenance

1. **Update Dependencies**
   ```bash
   pip list --outdated
   pip install -U package-name
   ```

2. **Security Updates**
   - Regularly update Python packages
   - Monitor AWS security bulletins
   - Review IAM permissions quarterly

3. **Backup Strategy**
   - Enable DynamoDB point-in-time recovery
   - Consider cross-region backups for critical data

## 🆘 Getting Help

### Resources
- **API Documentation**: Available at `/docs` endpoint
- **AWS Documentation**: [AWS Lambda](https://docs.aws.amazon.com/lambda/), [DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- **FastAPI Documentation**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com/)

### Support Channels
- Create an issue on GitHub for bugs
- Check existing issues for common problems
- Review CloudWatch logs for detailed error information

### Useful Commands

```bash
# View CDK stack resources
cdk ls
cdk diff

# Check DynamoDB tables
aws dynamodb list-tables

# View Lambda functions
aws lambda list-functions

# Check API Gateway APIs
aws apigateway get-rest-apis

# View CloudFormation stack events
aws cloudformation describe-stack-events --stack-name ClinicalCanvasStack
```

---

**🎉 Congratulations! Your Clinical Canvas backend is now deployed and ready to serve healthcare professionals.**