#!/usr/bin/env node
/**
 * Simple DynamoDB migration script
 * Imports data from exported JSON to ap-south-1 HMS-HYD table
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Starting DynamoDB Migration: HMS (us-east-1) → HMS-HYD (ap-south-1)');
console.log('=' .repeat(70));

// Check if export file exists
const exportFile = '/tmp/hms_export.json';
if (!fs.existsSync(exportFile)) {
    console.error('❌ Export file not found:', exportFile);
    process.exit(1);
}

// Read the exported data
console.log('📖 Reading exported data...');
const data = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
const items = data.Items;
console.log(`✅ Found ${items.length} items to migrate`);

if (items.length === 0) {
    console.log('⚠️  No items to migrate');
    process.exit(0);
}

console.log('');
console.log('🤔 This will import all items to HMS-HYD table in ap-south-1');
console.log('   The destination table currently has some data that may be overwritten.');
console.log('');

// For now, let's show a few sample items to verify
console.log('📋 Sample items to migrate:');
items.slice(0, 3).forEach((item, i) => {
    const pk = item.PK?.S || item.PK;
    const sk = item.SK?.S || item.SK;
    console.log(`   ${i+1}. PK: ${pk}, SK: ${sk}`);
});

if (items.length > 3) {
    console.log(`   ... and ${items.length - 3} more items`);
}

console.log('');
console.log('⚠️  IMPORTANT: This will use AWS CLI batch-write-item commands.');
console.log('   Make sure you have appropriate permissions for ap-south-1 DynamoDB.');

// Create batch write commands
const batchSize = 25; // DynamoDB batch write limit
const batches = [];

for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    batches.push(batch);
}

console.log(`📦 Will write ${batches.length} batches of up to ${batchSize} items each`);
console.log('');

// Import function
function importBatch(batch, batchNum) {
    console.log(`📝 Writing batch ${batchNum}/${batches.length} (${batch.length} items)...`);
    
    const requestItems = {
        'HMS-HYD': batch.map(item => ({
            PutRequest: { Item: item }
        }))
    };
    
    // Write to temp file
    const tempFile = `/tmp/batch_${batchNum}.json`;
    fs.writeFileSync(tempFile, JSON.stringify({ RequestItems: requestItems }));
    
    try {
        // Use AWS CLI to write batch
        const command = `AWS_DEFAULT_REGION=ap-south-1 aws dynamodb batch-write-item --request-items file://${tempFile}`;
        execSync(command, { stdio: 'pipe' });
        console.log(`✅ Batch ${batchNum} completed`);
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
        // Small delay to avoid throttling
        if (batchNum < batches.length) {
            require('child_process').execSync('sleep 0.1');
        }
        
    } catch (error) {
        console.error(`❌ Batch ${batchNum} failed:`, error.message);
        throw error;
    }
}

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Do you want to proceed with the migration? (y/N): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
        console.log('❌ Migration cancelled');
        rl.close();
        process.exit(0);
    }
    
    console.log('🚀 Starting migration...');
    
    try {
        batches.forEach((batch, index) => {
            importBatch(batch, index + 1);
        });
        
        console.log('');
        console.log('🎉 Migration completed successfully!');
        console.log(`✅ Migrated ${items.length} items to HMS-HYD (ap-south-1)`);
        
        // Verify
        console.log('🔍 Verifying migration...');
        const verifyCommand = 'AWS_DEFAULT_REGION=ap-south-1 aws dynamodb describe-table --table-name HMS-HYD --query "Table.ItemCount"';
        const itemCount = execSync(verifyCommand, { encoding: 'utf8' }).trim();
        console.log(`📊 HMS-HYD table now has ${itemCount} items`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
    
    rl.close();
});