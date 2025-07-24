import boto3
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from decimal import Decimal
import json
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)


class DynamoDBService:
    """DynamoDB service implementing single-table design"""
    
    def __init__(self):
        self.table_name = os.getenv('DYNAMODB_TABLE_NAME', 'clinical-canvas')
        
        # Initialize DynamoDB client
        if os.getenv('AWS_REGION'):
            self.dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION'))
        else:
            # For local development
            self.dynamodb = boto3.resource(
                'dynamodb',
                endpoint_url='http://localhost:8000',
                region_name='us-east-1',
                aws_access_key_id='dummy',
                aws_secret_access_key='dummy'
            )
        
        self.table = self.dynamodb.Table(self.table_name)
    
    def _serialize_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Python types to DynamoDB-compatible types"""
        def convert_value(value):
            if isinstance(value, datetime):
                return value.isoformat() + 'Z'
            elif isinstance(value, float):
                return Decimal(str(value))
            elif isinstance(value, dict):
                return {k: convert_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [convert_value(v) for v in value]
            return value
        
        return {k: convert_value(v) for k, v in item.items()}
    
    def _deserialize_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert DynamoDB types back to Python types"""
        def convert_value(value):
            if isinstance(value, Decimal):
                return float(value)
            elif isinstance(value, dict):
                return {k: convert_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [convert_value(v) for v in value]
            return value
        
        return {k: convert_value(v) for k, v in item.items()}
    
    # Patient operations
    async def create_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new patient"""
        patient_id = patient_data['patient_id']
        qr_code = f"https://clinical-canvas.com/qr/{patient_id}"
        
        item = {
            'PK': f'PATIENT#{patient_id}',
            'SK': 'META',
            'patient_id': patient_id,
            'name': patient_data['name'],
            'qr_code': qr_code,
            'pathway': patient_data['pathway'],
            'current_state': patient_data['current_state'],
            'diagnosis': patient_data['diagnosis'],
            'comorbidities': patient_data.get('comorbidities', []),
            'update_counter': 0,
            'last_updated': datetime.utcnow().isoformat() + 'Z',
            'assigned_doctor': patient_data.get('assigned_doctor'),
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            # GSI-3 keys for pathway/state queries
            'GSI3PK': f"PATHWAY#{patient_data['pathway']}",
            'GSI3SK': f"STATE#{patient_data['current_state']}#{patient_data['name']}"
        }
        
        serialized_item = self._serialize_item(item)
        
        try:
            self.table.put_item(Item=serialized_item)
            return self._deserialize_item(serialized_item)
        except ClientError as e:
            logger.error(f"Error creating patient: {e}")
            raise
    
    async def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Get patient metadata"""
        try:
            response = self.table.get_item(
                Key={
                    'PK': f'PATIENT#{patient_id}',
                    'SK': 'META'
                }
            )
            
            if 'Item' in response:
                return self._deserialize_item(response['Item'])
            return None
        except ClientError as e:
            logger.error(f"Error getting patient: {e}")
            raise
    
    async def update_patient(self, patient_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update patient metadata"""
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.utcnow().isoformat() + 'Z'}
        
        # Build update expression dynamically
        for field, value in updates.items():
            if field not in ['patient_id', 'PK', 'SK']:
                update_expression += f", {field} = :{field}"
                expression_values[f":{field}"] = value
        
        # Update GSI keys if pathway or current_state changed
        if 'pathway' in updates or 'current_state' in updates:
            # Get current patient data to build new GSI keys
            current_patient = await self.get_patient(patient_id)
            if current_patient:
                new_pathway = updates.get('pathway', current_patient['pathway'])
                new_state = updates.get('current_state', current_patient['current_state'])
                new_name = updates.get('name', current_patient['name'])
                
                update_expression += ", GSI3PK = :gsi3pk, GSI3SK = :gsi3sk"
                expression_values[':gsi3pk'] = f"PATHWAY#{new_pathway}"
                expression_values[':gsi3sk'] = f"STATE#{new_state}#{new_name}"
        
        try:
            response = self.table.update_item(
                Key={
                    'PK': f'PATIENT#{patient_id}',
                    'SK': 'META'
                },
                UpdateExpression=update_expression,
                ExpressionAttributeValues=self._serialize_item(expression_values),
                ReturnValues='ALL_NEW'
            )
            
            return self._deserialize_item(response['Attributes'])
        except ClientError as e:
            logger.error(f"Error updating patient: {e}")
            raise
    
    async def delete_patient(self, patient_id: str) -> bool:
        """Delete patient and all related items"""
        try:
            # First, get all items for this patient
            response = self.table.query(
                KeyConditionExpression=Key('PK').eq(f'PATIENT#{patient_id}')
            )
            
            # Delete all items in batches
            with self.table.batch_writer() as batch:
                for item in response['Items']:
                    batch.delete_item(
                        Key={
                            'PK': item['PK'],
                            'SK': item['SK']
                        }
                    )
            
            return True
        except ClientError as e:
            logger.error(f"Error deleting patient: {e}")
            raise
    
    async def list_patients(self, 
                          pathway: Optional[str] = None,
                          state: Optional[str] = None,
                          limit: int = 50) -> List[Dict[str, Any]]:
        """List patients with optional filtering"""
        try:
            if pathway and state:
                # Use GSI-3 for pathway/state filtering
                response = self.table.query(
                    IndexName='PathwayState',
                    KeyConditionExpression=Key('GSI3PK').eq(f'PATHWAY#{pathway}') & 
                                         Key('GSI3SK').begins_with(f'STATE#{state}#'),
                    Limit=limit
                )
            elif pathway:
                # Use GSI-3 for pathway filtering
                response = self.table.query(
                    IndexName='PathwayState',
                    KeyConditionExpression=Key('GSI3PK').eq(f'PATHWAY#{pathway}'),
                    Limit=limit
                )
            else:
                # Scan for all patients (less efficient)
                response = self.table.scan(
                    FilterExpression=Attr('SK').eq('META'),
                    Limit=limit
                )
            
            items = [self._deserialize_item(item) for item in response.get('Items', [])]
            return items
        except ClientError as e:
            logger.error(f"Error listing patients: {e}")
            raise
    
    # Task operations
    async def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task"""
        task_id = task_data['task_id']
        patient_id = task_data['patient_id']
        due_date = task_data['due']
        
        item = {
            'PK': f'PATIENT#{patient_id}',
            'SK': f'TASK#{due_date}#{task_id}',
            'task_id': task_id,
            'patient_id': patient_id,
            'title': task_data['title'],
            'type': task_data['type'],
            'due': due_date,
            'assignee_id': task_data['assignee_id'],
            'status': task_data.get('status', 'open'),
            'priority': task_data.get('priority', 'medium'),
            'recurring': task_data.get('recurring', False),
            'details': task_data.get('details'),
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            # GSI-1 keys for assignee queries
            'GSI1PK': f"ASSIGNEE#{task_data['assignee_id']}",
            'GSI1SK': f"DUE#{due_date}#PATIENT#{patient_id}"
        }
        
        serialized_item = self._serialize_item(item)
        
        try:
            self.table.put_item(Item=serialized_item)
            return self._deserialize_item(serialized_item)
        except ClientError as e:
            logger.error(f"Error creating task: {e}")
            raise
    
    async def get_task(self, patient_id: str, task_sk: str) -> Optional[Dict[str, Any]]:
        """Get a specific task"""
        try:
            response = self.table.get_item(
                Key={
                    'PK': f'PATIENT#{patient_id}',
                    'SK': task_sk
                }
            )
            
            if 'Item' in response:
                return self._deserialize_item(response['Item'])
            return None
        except ClientError as e:
            logger.error(f"Error getting task: {e}")
            raise
    
    async def update_task(self, patient_id: str, task_sk: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a task"""
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.utcnow().isoformat() + 'Z'}
        
        # Build update expression dynamically
        for field, value in updates.items():
            if field not in ['task_id', 'patient_id', 'PK', 'SK']:
                update_expression += f", {field} = :{field}"
                expression_values[f":{field}"] = value
        
        try:
            response = self.table.update_item(
                Key={
                    'PK': f'PATIENT#{patient_id}',
                    'SK': task_sk
                },
                UpdateExpression=update_expression,
                ExpressionAttributeValues=self._serialize_item(expression_values),
                ReturnValues='ALL_NEW'
            )
            
            return self._deserialize_item(response['Attributes'])
        except ClientError as e:
            logger.error(f"Error updating task: {e}")
            raise
    
    async def delete_task(self, patient_id: str, task_sk: str) -> bool:
        """Delete a task"""
        try:
            self.table.delete_item(
                Key={
                    'PK': f'PATIENT#{patient_id}',
                    'SK': task_sk
                }
            )
            return True
        except ClientError as e:
            logger.error(f"Error deleting task: {e}")
            raise
    
    async def list_tasks_by_assignee(self, assignee_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """List tasks assigned to a specific user"""
        try:
            response = self.table.query(
                IndexName='AssigneeDue',
                KeyConditionExpression=Key('GSI1PK').eq(f'ASSIGNEE#{assignee_id}'),
                Limit=limit
            )
            
            items = [self._deserialize_item(item) for item in response.get('Items', [])]
            return items
        except ClientError as e:
            logger.error(f"Error listing tasks by assignee: {e}")
            raise
    
    async def list_tasks_by_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        """List all tasks for a patient"""
        try:
            response = self.table.query(
                KeyConditionExpression=Key('PK').eq(f'PATIENT#{patient_id}') & 
                                     Key('SK').begins_with('TASK#')
            )
            
            items = [self._deserialize_item(item) for item in response.get('Items', [])]
            return items
        except ClientError as e:
            logger.error(f"Error listing tasks by patient: {e}")
            raise
    
    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        user_id = user_data['user_id']
        
        item = {
            'PK': f'USER#{user_id}',
            'SK': 'PROFILE',
            'user_id': user_id,
            'name': user_data['name'],
            'role': user_data['role'],
            'avatar': user_data.get('avatar'),
            'contact_info': user_data.get('contact_info', {}),
            'permissions': user_data.get('permissions', []),
            'email': user_data['email'],
            'password_hash': user_data.get('password_hash'),
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'updated_at': datetime.utcnow().isoformat() + 'Z',
            # GSI-2 keys for role-based queries
            'GSI2PK': f"ROLE#{user_data['role']}",
            'GSI2SK': f"NAME#{user_data['name']}"
        }
        
        serialized_item = self._serialize_item(item)
        
        try:
            self.table.put_item(Item=serialized_item)
            return self._deserialize_item(serialized_item)
        except ClientError as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile"""
        try:
            response = self.table.get_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': 'PROFILE'
                }
            )
            
            if 'Item' in response:
                return self._deserialize_item(response['Item'])
            return None
        except ClientError as e:
            logger.error(f"Error getting user: {e}")
            raise
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email (requires scan - consider adding GSI for production)"""
        try:
            response = self.table.scan(
                FilterExpression=Attr('email').eq(email) & Attr('SK').eq('PROFILE')
            )
            
            items = response.get('Items', [])
            if items:
                return self._deserialize_item(items[0])
            return None
        except ClientError as e:
            logger.error(f"Error getting user by email: {e}")
            raise
    
    async def list_users_by_role(self, role: str) -> List[Dict[str, Any]]:
        """List users by role"""
        try:
            response = self.table.query(
                IndexName='RoleName',
                KeyConditionExpression=Key('GSI2PK').eq(f'ROLE#{role}')
            )
            
            items = [self._deserialize_item(item) for item in response.get('Items', [])]
            return items
        except ClientError as e:
            logger.error(f"Error listing users by role: {e}")
            raise
    
    # Note operations
    async def create_note(self, note_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new note and increment patient update counter"""
        patient_id = note_data['patient_id']
        note_id = note_data['note_id']
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        note_item = {
            'PK': f'PATIENT#{patient_id}',
            'SK': f'NOTE#{timestamp}#{note_id}',
            'note_id': note_id,
            'patient_id': patient_id,
            'author_id': note_data['author_id'],
            'category': note_data['category'],
            'content': note_data['content'],
            'created_at': timestamp,
            'updated_at': timestamp,
            # GSI-4 keys for entity-based queries
            'GSI4PK': 'ENTITY#Note',
            'GSI4SK': f"TS#{int(datetime.utcnow().timestamp() * 1000)}"
        }
        
        try:
            # Use transaction to create note and increment patient update counter
            self.table.transact_write_items(
                TransactItems=[
                    {
                        'Put': {
                            'TableName': self.table_name,
                            'Item': self._serialize_item(note_item)
                        }
                    },
                    {
                        'Update': {
                            'TableName': self.table_name,
                            'Key': {
                                'PK': f'PATIENT#{patient_id}',
                                'SK': 'META'
                            },
                            'UpdateExpression': 'ADD update_counter :inc SET last_updated = :timestamp',
                            'ExpressionAttributeValues': {
                                ':inc': 1,
                                ':timestamp': timestamp
                            }
                        }
                    }
                ]
            )
            
            return self._deserialize_item(note_item)
        except ClientError as e:
            logger.error(f"Error creating note: {e}")
            raise
    
    async def list_notes_by_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        """List notes for a patient"""
        try:
            response = self.table.query(
                KeyConditionExpression=Key('PK').eq(f'PATIENT#{patient_id}') & 
                                     Key('SK').begins_with('NOTE#'),
                ScanIndexForward=False  # Most recent first
            )
            
            items = [self._deserialize_item(item) for item in response.get('Items', [])]
            return items
        except ClientError as e:
            logger.error(f"Error listing notes by patient: {e}")
            raise


# Global instance
db_service = DynamoDBService()