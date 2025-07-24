# 📮 Clinical Canvas API - Postman Collections

This directory contains comprehensive Postman collections for testing the Clinical Canvas API. These collections provide complete coverage of all API endpoints with automated testing and environment management.

## 📁 Files Overview

### Collections
- **`Clinical-Canvas-API.postman_collection.json`** - Main collection with all endpoints organized by feature
- **`Clinical-Canvas-Test-Workflow.postman_collection.json`** - Automated testing workflow

### Environments
- **`Clinical-Canvas-Local.postman_environment.json`** - Local development environment
- **`Clinical-Canvas-AWS.postman_environment.json`** - AWS deployment environment

## 🚀 Quick Start

### 1. Import Collections and Environments

1. **Open Postman**
2. **Import Collections:**
   - Click `Import` → `File` → Select both `.postman_collection.json` files
3. **Import Environments:**
   - Click `Import` → `File` → Select both `.postman_environment.json` files

### 2. Select Environment

- **For Local Development:** Select `Clinical Canvas - Local` environment
- **For AWS Testing:** Select `Clinical Canvas - AWS` environment and update the `base_url`

### 3. Start Testing

1. **Manual Testing:** Use the main `Clinical Canvas API` collection
2. **Automated Testing:** Run the `Clinical Canvas - Test Workflow` collection

## 📋 Main Collection Structure

### 🔐 Authentication
- **Login** - Authenticate with different user roles
- **Get Current User** - Retrieve authenticated user profile
- **Logout** - End user session

### 👥 Patients
- **List Patients** - Get all patients with filtering options
- **Create Patient** - Add new patient to system
- **Get Patient Details** - Retrieve specific patient information
- **Update Patient** - Modify patient information
- **Delete Patient** - Remove patient from system
- **Patient QR Data** - Get QR code information for bedside scanning
- **Patient Timeline** - Retrieve patient care timeline
- **Patient Notes** - Get and create patient notes
- **Patient Assignments** - Get patients assigned to doctors

### 📋 Tasks
- **List Tasks** - Get tasks with filtering options
- **Create Task** - Add new tasks to patients
- **Tasks by Patient** - Get all tasks for specific patient
- **Tasks Due Today** - Get tasks due today
- **Completed Tasks** - Get tasks completed today
- **Urgent Alerts** - Get urgent tasks requiring immediate attention

### 📊 Dashboard
- **KPI Data** - Get dashboard metrics and statistics
- **Upcoming Procedures** - Get scheduled procedures
- **Stage Heatmap** - Get patient distribution across care stages

### 👨‍⚕️ Doctors & Staff
- **List Doctors** - Get all doctors/staff by role
- **Doctor Profile** - Get specific doctor information
- **Update Profile** - Modify doctor profile information

### 🏥 System
- **Health Check** - Verify system status
- **API Root** - Get API information

## 🔧 Environment Variables

### Automatic Variables (Set by Tests)
- `auth_token` - JWT authentication token
- `current_user_id` - ID of currently logged-in user
- `current_user_role` - Role of current user
- `test_patient_id` - Patient ID for testing
- `created_patient_id` - ID of patient created during tests

### Manual Configuration
- `base_url` - API base URL (update for AWS deployment)
- `api_version` - API version prefix (default: "api")

## 🧪 Test Features

### Automated Authentication
- Login requests automatically store JWT tokens
- Subsequent requests use stored tokens
- Multiple user role tokens supported (doctor, nurse, technician)

### Data Validation
- Response status code validation
- JSON structure validation
- Required field presence checks
- Data type validation
- Business logic validation

### Environment Management
- Automatic variable storage and cleanup
- Cross-request data sharing
- Environment-specific configuration

## 🔄 Automated Test Workflow

The **Test Workflow** collection provides a complete end-to-end test of the API:

1. **System Health Check** - Verify API is running
2. **Authentication** - Login as doctor
3. **Patient Management** - Create, read, update patient
4. **Task Management** - Create and manage tasks
5. **Notes** - Add patient notes
6. **Dashboard** - Verify analytics endpoints
7. **Cleanup** - Remove test data

### Running the Workflow

1. Select the `Clinical Canvas - Test Workflow` collection
2. Click `Run` button
3. Select environment (`Local` or `AWS`)
4. Click `Run Clinical Canvas - Test Workflow`
5. Watch automated tests execute

## 👤 Sample User Credentials

### Doctor (Full Access)
```
Email: sarah.wilson@hospital.com
Password: password123
Role: doctor
```

### Nurse (Patient Care)
```
Email: emily.johnson@hospital.com
Password: password123
Role: nurse
```

### Technician (Lab Results)
```
Email: michael.chen@hospital.com
Password: password123
Role: technician
```

## 🌐 Environment Setup

### Local Development
```json
{
  "base_url": "http://localhost:8000",
  "api_version": "api"
}
```

### AWS Deployment
```json
{
  "base_url": "https://your-api-id.execute-api.us-east-1.amazonaws.com/prod",
  "api_version": "api"
}
```

## 📊 Testing Scenarios

### Patient Management Flow
1. **Login** as doctor
2. **List** existing patients
3. **Create** new patient
4. **Get** patient details
5. **Update** patient information
6. **Add** patient notes
7. **Get** QR code data
8. **Delete** patient (cleanup)

### Task Management Flow
1. **Create** task for patient
2. **List** all tasks
3. **Filter** tasks by status/type
4. **Get** tasks due today
5. **Get** urgent alerts
6. **Get** completed tasks

### Dashboard Analytics
1. **Get** KPI metrics
2. **Get** upcoming procedures
3. **Get** stage heatmap data
4. **Verify** data consistency

### Multi-User Testing
1. **Login** as different roles
2. **Test** role-based permissions
3. **Verify** access controls
4. **Test** concurrent operations

## 🐛 Troubleshooting

### Common Issues

**Authentication Failures**
- Verify correct credentials
- Check if backend is running
- Ensure environment variables are set

**Connection Errors**
- Verify `base_url` in environment
- Check if API server is accessible
- Confirm network connectivity

**Test Failures**
- Check API server logs
- Verify test data exists
- Review environment variables

**CORS Issues**
- Ensure API allows Postman requests
- Check CORS configuration in backend

### Debug Tips

1. **Check Console:** View test results and logs in Postman console
2. **Environment Variables:** Verify all variables are set correctly  
3. **Request/Response:** Inspect raw request/response data
4. **Test Scripts:** Review test script logic for failures

## 📈 Advanced Usage

### Custom Test Scripts

Add custom validation to requests:

```javascript
pm.test("Custom validation", function () {
    const jsonData = pm.response.json();
    // Add your custom assertions here
    pm.expect(jsonData.custom_field).to.exist;
});
```

### Data-Driven Testing

Use CSV files for multiple test scenarios:
1. Create CSV with test data
2. Import to collection runner
3. Use `{{variable}}` syntax in requests

### Continuous Integration

Run collections via Newman (CLI):

```bash
# Install Newman
npm install -g newman

# Run collection
newman run Clinical-Canvas-API.postman_collection.json \
  -e Clinical-Canvas-Local.postman_environment.json \
  --reporters cli,json
```

### Custom Environments

Create additional environments for:
- **Staging** - Pre-production testing
- **Production** - Production API testing
- **Mock** - Mock server testing

## 🔐 Security Considerations

### Token Management
- Tokens are stored as secret variables
- Automatic token cleanup after logout
- Environment-specific token storage

### Sensitive Data
- Passwords are in plain text (for demo only)
- Use environment variables for production
- Consider using OAuth for production

### Access Control
- Test role-based permissions
- Verify unauthorized access is blocked
- Test token expiration handling

## 📝 Contributing

### Adding New Endpoints

1. **Add Request** to main collection
2. **Add Tests** for validation
3. **Update Workflow** if needed
4. **Document** in this README

### Test Standards

- Always include status code validation
- Validate response structure
- Use descriptive test names
- Clean up test data
- Add console logging for debugging

## 🆘 Support

### Getting Help

1. **Check Logs** - Review Postman console output
2. **API Documentation** - Visit `/docs` endpoint
3. **Backend Logs** - Check server logs for errors
4. **GitHub Issues** - Report bugs and feature requests

### Best Practices

1. **Always login first** before testing protected endpoints
2. **Use environments** for different deployment targets
3. **Run cleanup** after testing to remove test data
4. **Monitor tokens** and refresh when expired
5. **Test error scenarios** not just happy paths

---

**🎯 Ready to test your Clinical Canvas API!**

Start with the automated workflow to verify everything is working, then explore individual endpoints for detailed testing.