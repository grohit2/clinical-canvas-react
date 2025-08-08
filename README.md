# Clinical Canvas Backend System

A comprehensive backend system for the Clinical Canvas patient management application, built with Python FastAPI, AWS DynamoDB, and deployed using AWS CDK.

## 🏗️ Architecture Overview

- **API Framework**: FastAPI with automatic OpenAPI documentation
- **Database**: AWS DynamoDB with single-table design
- **Deployment**: AWS Lambda + API Gateway using AWS CDK
- **Infrastructure as Code**: AWS CDK (Python)

## 📋 Features

### Core Functionality
- **Patient Management**: Create, read, update, delete patient records
- **Task Management**: Kanban-style task tracking with assignees and due dates
- **Dashboard Analytics**: KPI metrics, upcoming procedures, stage heatmaps
- **Authentication**: Secure JWT-based login with role-based permissions
- **Real-time Updates**: Patient update counters and notification system

### API Endpoints

#### Authentication

#### Patients
- `GET /api/patients` - List patients with filtering
- `POST /api/patients` - Create new patient
- `GET /api/patients/{id}` - Get patient details
- `PUT /api/patients/{id}` - Update patient
- `DELETE /api/patients/{id}` - Delete patient
- `GET /api/patients/{id}/qr` - Get QR code data
- `GET /api/patients/{id}/timeline` - Get patient timeline
- `GET /api/patients/{id}/notes` - Get patient notes
- `POST /api/patients/{id}/notes` - Create patient note

#### Tasks
- `GET /api/tasks` - List tasks with filtering
- `POST /api/tasks` - Create new task
- `GET /api/tasks/patient/{id}` - Get tasks for patient
- `GET /api/tasks/due-today` - Get tasks due today
- `GET /api/tasks/completed-today` - Get completed tasks
- `GET /api/tasks/urgent-alerts` - Get urgent alerts

#### Dashboard
- `GET /api/dashboard/kpi` - Get KPI metrics
- `GET /api/dashboard/procedures/upcoming` - Get upcoming procedures
- `GET /api/dashboard/stage-heatmap` - Get stage distribution

#### Staff
- `GET /api/doctors` - List doctors/staff
- `GET /api/doctors/{id}` - Get doctor profile

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)
- DynamoDB Local (for local development)

### Local Development

1. **Setup Local Environment**
   ```bash
   chmod +x scripts/local-dev.sh
   ./scripts/local-dev.sh
   ```

2. **Start DynamoDB Local** (if not already running)
   ```bash
   # Using Docker (recommended)
   docker run -p 8000:8000 amazon/dynamodb-local
   
   # Or download and run locally
   java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
   ```

3. **Start the Development Server**
   ```bash
   cd backend
   source venv/bin/activate
   python -m app.main
   ```

4. **Access the API**
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### AWS Deployment

1. **Deploy to AWS**
   ```bash
   chmod +x scripts/deploy-aws.sh
   ./scripts/deploy-aws.sh
   ```

2. **Update Frontend Configuration**
   Update your frontend `.env` file with the deployed API URL:
   ```env
   VITE_API_BASE_URL=https://your-api-url.amazonaws.com/prod/api
   VITE_USE_REAL_API=true
   ```

## 🗄️ Database Design

### Single-Table DynamoDB Schema

The system uses a single-table design with the following key structure:

```
PK (Partition Key) | SK (Sort Key)           | Description
PATIENT#{id}       | META                    | Patient metadata
PATIENT#{id}       | TASK#{due}#{taskId}     | Patient tasks
PATIENT#{id}       | NOTE#{timestamp}#{id}   | Patient notes
PATIENT#{id}       | TIMELINE#{timestamp}    | Timeline entries
USER#{id}          | PROFILE                 | User profiles
```

### Global Secondary Indexes (GSIs)

1. **AssigneeDue** - For "my tasks" queries
   - PK: `ASSIGNEE#{userId}`
   - SK: `DUE#{timestamp}#PATIENT#{patientId}`

2. **RoleName** - For staff directory
   - PK: `ROLE#{role}`
   - SK: `NAME#{lastName,firstName}`

3. **PathwayState** - For ward/theatre dashboards
   - PK: `PATHWAY#{pathway}`
   - SK: `STATE#{state}#{patientName}`

4. **EntityTS** - For site-wide feeds (optional)
   - PK: `ENTITY#{entityType}`
   - SK: `TS#{epochMs}`

5. **Unread** - For update ring counts (optional)
   - PK: `USER#{readerId}`
   - SK: `UNREAD#{patientId}#{lastNoteTs}`

## 🔐 Authentication & Authorization

### JWT Authentication
- JWT tokens with 30-minute expiration
- Automatic token refresh on API calls
- Secure password hashing with bcrypt

### Role-Based Access Control
- **Doctor**: Full access to patients, tasks, and procedures
- **Nurse**: Patient care tasks, assessments, medications
- **Technician**: Lab results, specific task types
- **Admin**: System administration and user management

### Sample Users
```
Email: sarah.wilson@hospital.com
Password: password123
Role: doctor

Email: emily.johnson@hospital.com
Password: password123
Role: nurse

Email: michael.chen@hospital.com
Password: password123
Role: technician
```

## 📁 Project Structure

```
clinical-canvas-backend/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/            # API route handlers
│   │   ├── database/       # DynamoDB service layer
│   │   ├── models/         # Pydantic data models
│   │   └── main.py         # FastAPI application entry point
│   ├── init_db.py          # Database initialization script
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
├── infrastructure/         # AWS CDK infrastructure
│   ├── stacks/
│   │   └── clinical_canvas_stack.py  # Main CDK stack
│   ├── app.py              # CDK app entry point
│   └── requirements.txt    # CDK dependencies
├── scripts/                # Deployment and setup scripts
│   ├── local-dev.sh        # Local development setup
│   └── deploy-aws.sh       # AWS deployment script
└── README.md              # This file
```

## 🛠️ Development

### Adding New Endpoints

1. **Create route handler** in `backend/app/api/`
2. **Add data models** in `backend/app/models/base.py`
3. **Update database service** in `backend/app/database/dynamodb.py`
4. **Include router** in `backend/app/main.py`

### Database Operations

```python
# Create patient
patient_data = {"name": "John Doe", "pathway": "surgical", ...}
patient = await db_service.create_patient(patient_data)

# Get patient
patient = await db_service.get_patient("patient-id")

# List tasks by assignee
tasks = await db_service.list_tasks_by_assignee("user-id")
```

### Testing

```bash
# Run tests (when implemented)
cd backend
python -m pytest

# Manual API testing
curl -X GET http://localhost:8000/health
```

## 🔧 Configuration

### Environment Variables

```env
# Database
DYNAMODB_TABLE_NAME=clinical-canvas
AWS_REGION=us-east-1

# Authentication
JWT_SECRET_KEY=your-secret-key-change-in-production

# API
PORT=8000

# AWS (for local development)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Frontend Integration

Update your frontend configuration to use the backend API:

```env
# Frontend .env
VITE_API_BASE_URL=http://localhost:8000/api  # Local
VITE_API_BASE_URL=https://api.yourdomain.com/api  # Production
VITE_USE_REAL_API=true
VITE_ENABLE_AUTH_API=true
VITE_ENABLE_PATIENTS_API=true
VITE_ENABLE_TASKS_API=true
VITE_ENABLE_DASHBOARD_API=true
```

## 📊 Monitoring & Observability

### CloudWatch Logs
- API Gateway logs: `/aws/apigateway/clinical-canvas`
- Lambda logs: `/aws/lambda/clinical-canvas-api`

### Metrics
- API response times
- DynamoDB read/write capacity
- Lambda invocation counts
- Error rates

### Health Checks
- `GET /health` - Basic health check
- `GET /` - API information

## 🚨 Security Considerations

### Production Checklist
- [ ] Change JWT secret key (use AWS Secrets Manager)
- [ ] Enable API Gateway throttling
- [ ] Configure proper CORS origins
- [ ] Enable DynamoDB encryption at rest
- [ ] Set up CloudWatch alarms
- [ ] Enable AWS WAF protection
- [ ] Use HTTPS only
- [ ] Implement rate limiting

### Data Privacy
- Patient data is encrypted at rest in DynamoDB
- JWT tokens contain minimal user information
- Role-based access controls limit data access

## 🔄 CI/CD Pipeline (Future Enhancement)

```yaml
# Suggested GitHub Actions workflow
name: Deploy Clinical Canvas
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - name: Install dependencies
        run: pip install -r backend/requirements.txt
      - name: Run tests
        run: python -m pytest
      - name: Deploy to AWS
        run: ./scripts/deploy-aws.sh
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**DynamoDB Connection Error**
```bash
# Ensure DynamoDB Local is running
docker run -p 8000:8000 amazon/dynamodb-local
```

**JWT Token Errors**
```bash
# Check JWT_SECRET_KEY in environment variables
echo $JWT_SECRET_KEY
```

**CDK Deployment Fails**
```bash
# Bootstrap CDK
cdk bootstrap

# Check AWS credentials
aws sts get-caller-identity
```

**CORS Issues**
- Update CORS configuration in `backend/app/main.py`
- Ensure frontend origin is allowed

### Getting Help

- Check the [API documentation](http://localhost:8000/docs) when running locally
- Review CloudWatch logs for AWS deployments
- Open an issue on GitHub for bugs or feature requests

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the API documentation at `/docs`
- Review the troubleshooting section above

---

**Built with ❤️ for healthcare professionals**
