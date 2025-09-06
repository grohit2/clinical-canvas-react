# HMS Backend - Patient Document Management System

A serverless hospital management system backend built with AWS Lambda, DynamoDB, and S3 for secure patient document and image handling.

## 🚀 Quick Start

### One-Command Setup
```bash
./setup.sh full
```

### Manual Setup
```bash
# 1. Build
sam build

# 2. Deploy
sam deploy --stack-name hms-dev --capabilities CAPABILITY_IAM --resolve-s3

# 3. Test
curl -s https://YOUR_FUNCTION_URL/patients | jq .
```

## 📁 Project Structure

```
backend/dev/
├── 📋 README.md              # This file
├── 📖 DEVELOPMENT_JOURNEY.md  # Complete development documentation
├── 🚀 setup.sh               # Automated setup script
├── 🏗️  template.yaml          # AWS SAM CloudFormation template
├── 🔗 index.mjs              # Entry point
├── 🔗 router.mjs              # Main routing and context
├── 📊 patients.mjs            # Patient CRUD operations  
├── 📊 tasks.mjs               # Medical tasks (with file attachments)
├── 📊 notes.mjs               # Clinical notes (with file attachments)
├── 📊 meds.mjs                # Medications (with file attachments)
├── 📊 doctors.mjs             # Doctor management
├── 📊 timeline.mjs            # Patient timeline
├── 📊 checklists.mjs          # Medical checklists
├── 📁 files.mjs               # S3 file handling with presigned URLs
└── 📁 documents.mjs           # Patient document records
```

## 🔑 Key Features

### 📋 **Patient Document Management**
- **7 Document Categories**: preop, lab, radiology, intraop, OT notes, postop, discharge
- **Blue/Grey UI Logic**: Categories show blue (has files) or grey (empty)
- **Stamps & Verification**: Lab and radiology reports support verification stamps
- **Preop Limits**: Maximum 3 preop images with replaceOldest option

### 📁 **File Upload System**
- **Direct S3 Upload**: Client-side uploads using presigned URLs
- **PHI-Safe Naming**: No patient names in file keys
- **Organized Storage**: `patients/{MRN}/optimized/docs/{category}/`
- **File Attachments**: Notes, medications, and tasks support inline attachments

### 🔐 **Security**
- **Private S3 Bucket**: Public access blocked
- **Presigned URLs**: Time-limited access (15 minutes)
- **Patient-Scoped**: Files only accessible by correct patient MRN
- **No PHI in Keys**: Patient names never stored in S3 paths

## 🛠️ Available Commands

### Setup Script
```bash
./setup.sh full          # Complete setup: build + deploy + test
./setup.sh build         # Build SAM application
./setup.sh deploy        # Deploy to AWS
./setup.sh test          # Test deployment
./setup.sh info          # Show deployment info
./setup.sh clean         # Clean build artifacts
```

### Manual Commands
```bash
# Build and deploy
sam build
sam deploy --stack-name hms-dev --capabilities CAPABILITY_IAM --resolve-s3

# View logs
aws logs tail /aws/lambda/hms-dev-HMSdev-* --follow

# Get deployment info
aws cloudformation describe-stacks --stack-name hms-dev --query "Stacks[0].Outputs"

# Delete stack
aws cloudformation delete-stack --stack-name hms-dev
```

## 🧪 API Testing

### Get Function URL
```bash
FUNCTION_URL=$(aws cloudformation describe-stacks \
  --stack-name hms-dev \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" \
  --output text)
```

### Test Endpoints
```bash
# List patients
curl -s "$FUNCTION_URL/patients" | jq .

# Get patient documents
curl -s "$FUNCTION_URL/patients/20250819644/documents" | jq .

# Generate presigned upload URL
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","mimeType":"image/jpeg","kind":"doc","docType":"preop"}' \
  "$FUNCTION_URL/patients/20250819644/files/presign-upload" | jq .

# List patient files
curl -s "$FUNCTION_URL/patients/20250819644/files?scope=optimized&kind=doc&docType=preop&presign=1" | jq .

# Detach a document from DynamoDB (keeps S3)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"category":"preop_pics","key":"patients/UID/optimized/docs/preop/123-abc-q80-1600w.jpg"}' \
  "$FUNCTION_URL/patients/20250819644/documents/detach" | jq .

# Delete S3 file(s) and optionally invalidate CloudFront
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"keys":["patients/UID/optimized/docs/preop/123-abc-q80-1600w.jpg"],"invalidate":true,"includeSiblings":true}' \
  "$FUNCTION_URL/patients/20250819644/files/delete" | jq .
```

## 📊 Current Deployment

- **Stack Name**: `hms-hyd-dev`
- **Region**: `ap-south-1` 
- **Function URL**: `https://kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws/`
- **S3 Bucket**: `hms-patient-files-hyd-dev-058264275581`
- **CloudFront**: `d9j52cd9e77ji.cloudfront.net`
- **Status**: ✅ Active with delete endpoint deployed

## ⚙️ Configuration

- Env vars:
  - `FILES_BUCKET` (or `DOCS_BUCKET`/`S3_BUCKET`): S3 bucket name for patient files
  - `CF_DISTRIBUTION_ID` (optional): enable CloudFront invalidation on deletes
  - `CDN_DOMAIN` (optional): used by S3 events to populate `cdnUrl`

- IAM permissions (Lambda execution role):
  - `s3:PutObject`, `s3:GetObject`, `s3:ListBucket`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*`
  - `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `Query` on the application table
  - `cloudfront:CreateInvalidation` for the target distribution (if using `CF_DISTRIBUTION_ID`)

## 🧰 New Endpoint Summary

- `POST /patients/:id/files/delete`
  - Body: `{ key?: string, keys?: string[], invalidate?: boolean, includeSiblings?: boolean }`
  - Deletes provided S3 keys that belong to the patient prefix.
  - If `includeSiblings` is true (default), also deletes derived `originals` and `thumb` keys when the input is an `optimized` key.
  - If `CF_DISTRIBUTION_ID` is configured and `invalidate` is not false, creates a CloudFront invalidation for the deleted paths.

## 🔧 Troubleshooting

### Common Issues

1. **AWS Credentials**
   ```bash
   aws configure
   aws sts get-caller-identity
   ```

2. **Build Failures**
   ```bash
   rm -rf .aws-sam/
   sam build --use-container
   ```

3. **Permission Errors**
   - Ensure your AWS user has CloudFormation, Lambda, S3, and DynamoDB permissions

4. **Stack Already Exists**
   ```bash
   # Update existing stack
   sam deploy --stack-name hms-dev --capabilities CAPABILITY_IAM --resolve-s3
   
   # Or delete and recreate
   aws cloudformation delete-stack --stack-name hms-dev
   ```

### View Logs
```bash
# Real-time logs
aws logs tail /aws/lambda/hms-dev-HMSdev-* --follow

# Stack events
aws cloudformation describe-stack-events --stack-name hms-dev
```

## 📖 Documentation

- **Complete Development Journey**: [DEVELOPMENT_JOURNEY.md](./DEVELOPMENT_JOURNEY.md)
- **Architecture & Design Philosophy**: See sections 1-7 in DEVELOPMENT_JOURNEY.md
- **API Endpoints**: See sections 8-12 in DEVELOPMENT_JOURNEY.md
- **Troubleshooting**: See section on troubleshooting in DEVELOPMENT_JOURNEY.md

## 🎯 Next Steps

1. **Frontend Integration**: Use the file upload workflow in your React application
2. **Image Optimization**: Add automatic image compression pipeline
3. **Monitoring**: Set up CloudWatch alarms and dashboards
4. **Encryption**: Enable S3 server-side encryption for production
5. **Backup**: Implement cross-region backup strategy

---

**Need Help?** Check the [DEVELOPMENT_JOURNEY.md](./DEVELOPMENT_JOURNEY.md) for comprehensive documentation of the entire system architecture and development process.
