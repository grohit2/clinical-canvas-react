#!/usr/bin/env python3
"""
DynamoDB Migration Script: HMS (us-east-1) → HMS-HYD (ap-south-1)
Migrates all data from the source table to destination table.
"""

import boto3
import json
from decimal import Decimal
from typing import Dict, Any
import time

# Configuration
SOURCE_REGION = "us-east-1"
SOURCE_TABLE = "HMS"
DEST_REGION = "ap-south-1"
DEST_TABLE = "HMS-HYD"

class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal types in JSON serialization"""
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)

def scan_table(dynamodb, table_name: str, region: str):
    """Scan all items from a table"""
    print(f"🔍 Scanning table {table_name} in {region}...")
    
    table = dynamodb.Table(table_name)
    items = []
    
    # Use paginator to handle large tables
    paginator = dynamodb.meta.client.get_paginator('scan')
    page_iterator = paginator.paginate(TableName=table_name)
    
    for page in page_iterator:
        items.extend(page.get('Items', []))
    
    print(f"✅ Found {len(items)} items in {table_name}")
    return items

def batch_write_items(dynamodb, table_name: str, items: list, region: str):
    """Write items to destination table in batches"""
    print(f"📝 Writing {len(items)} items to {table_name} in {region}...")
    
    table = dynamodb.Table(table_name)
    batch_size = 25  # DynamoDB batch write limit
    
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        
        with table.batch_writer() as batch_writer:
            for item in batch:
                batch_writer.put_item(Item=item)
        
        print(f"📦 Wrote batch {i//batch_size + 1}/{(len(items) + batch_size - 1)//batch_size}")
        time.sleep(0.1)  # Rate limiting
    
    print(f"✅ Successfully wrote all items to {table_name}")

def get_table_info(dynamodb, table_name: str, region: str):
    """Get table information"""
    try:
        table = dynamodb.Table(table_name)
        return {
            'name': table_name,
            'region': region,
            'item_count': table.item_count,
            'status': table.table_status
        }
    except Exception as e:
        return {
            'name': table_name,
            'region': region,
            'error': str(e)
        }

def main():
    print("🚀 Starting DynamoDB Migration: HMS (us-east-1) → HMS-HYD (ap-south-1)")
    print("=" * 70)
    
    # Create DynamoDB resources for both regions
    source_dynamodb = boto3.resource('dynamodb', region_name=SOURCE_REGION)
    dest_dynamodb = boto3.resource('dynamodb', region_name=DEST_REGION)
    
    # Get table info
    print("📊 Table Information:")
    source_info = get_table_info(source_dynamodb, SOURCE_TABLE, SOURCE_REGION)
    dest_info = get_table_info(dest_dynamodb, DEST_TABLE, DEST_REGION)
    
    print(f"  Source: {SOURCE_TABLE} ({SOURCE_REGION}) - {source_info.get('item_count', 'unknown')} items")
    print(f"  Dest:   {DEST_TABLE} ({DEST_REGION}) - {dest_info.get('item_count', 'unknown')} items")
    print()
    
    # Confirm migration
    response = input("🤔 Do you want to proceed with the migration? (y/N): ")
    if response.lower() != 'y':
        print("❌ Migration cancelled")
        return
    
    try:
        # Scan source table
        source_items = scan_table(source_dynamodb, SOURCE_TABLE, SOURCE_REGION)
        
        if not source_items:
            print("⚠️  No items found in source table")
            return
        
        # Write to destination table
        batch_write_items(dest_dynamodb, DEST_TABLE, source_items, DEST_REGION)
        
        print()
        print("🎉 Migration completed successfully!")
        print(f"✅ Migrated {len(source_items)} items from {SOURCE_TABLE} ({SOURCE_REGION}) to {DEST_TABLE} ({DEST_REGION})")
        
        # Final verification
        dest_info_after = get_table_info(dest_dynamodb, DEST_TABLE, DEST_REGION)
        print(f"📊 Final destination table item count: {dest_info_after.get('item_count', 'unknown')}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    main()