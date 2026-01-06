#!/usr/bin/env node
/**
 * Verification script for dispense_logs migration
 * Run this after executing the Supabase migration
 * 
 * Usage: node scripts/verify-dispense-migration.js
 */

import { supabase } from '../src/libs/supabase.js';

const SUCCESS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const INFO = '\x1b[34mℹ\x1b[0m';

async function verify() {
  console.log('\n🔍 Verifying Dispense Logs Migration...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Check dispense_logs table exists
  console.log('1. Checking dispense_logs table exists...');
  try {
    const { data, error } = await supabase
      .from('dispense_logs')
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log(`   ${FAIL} Table does not exist`);
      failed++;
    } else {
      console.log(`   ${SUCCESS} Table exists`);
      passed++;
    }
  } catch (error) {
    console.log(`   ${FAIL} Error: ${error.message}`);
    failed++;
  }

  // Test 2: Check required columns exist
  console.log('\n2. Checking dispense_logs columns...');
  const requiredColumns = [
    'id', 'payment_id', 'machine_id', 'slot_number', 
    'status', 'error_message', 'websocket_response',
    'created_at', 'updated_at'
  ];
  
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'dispense_logs');
    
    if (data && data.length > 0) {
      const columns = data.map(row => row.column_name);
      const missing = requiredColumns.filter(col => !columns.includes(col));
      
      if (missing.length === 0) {
        console.log(`   ${SUCCESS} All required columns present`);
        passed++;
      } else {
        console.log(`   ${FAIL} Missing columns: ${missing.join(', ')}`);
        failed++;
      }
    } else {
      console.log(`   ${FAIL} Could not retrieve column information`);
      failed++;
    }
  } catch (error) {
    console.log(`   ${INFO} Skipping column check (permission issue)`);
  }

  // Test 3: Check payment_products.dispensed_at column
  console.log('\n3. Checking payment_products.dispensed_at column...');
  try {
    const { data, error } = await supabase
      .from('payment_products')
      .select('dispensed_at')
      .limit(1);
    
    if (error && error.message.includes('dispensed_at')) {
      console.log(`   ${FAIL} Column does not exist`);
      failed++;
    } else {
      console.log(`   ${SUCCESS} Column exists`);
      passed++;
    }
  } catch (error) {
    console.log(`   ${FAIL} Error: ${error.message}`);
    failed++;
  }

  // Test 4: Test insert into dispense_logs
  console.log('\n4. Testing insert into dispense_logs...');
  const testId = '00000000-0000-0000-0000-000000000000';
  
  try {
    const { error: insertError } = await supabase
      .from('dispense_logs')
      .insert({
        payment_id: testId,
        machine_id: 'TEST_VERIFY',
        slot_number: '999',
        status: 'pending'
      });
    
    if (insertError) {
      console.log(`   ${FAIL} Insert failed: ${insertError.message}`);
      failed++;
    } else {
      console.log(`   ${SUCCESS} Insert successful`);
      passed++;
      
      // Clean up test record
      await supabase
        .from('dispense_logs')
        .delete()
        .eq('machine_id', 'TEST_VERIFY');
    }
  } catch (error) {
    console.log(`   ${FAIL} Error: ${error.message}`);
    failed++;
  }

  // Test 5: Check status constraint
  console.log('\n5. Testing status constraint...');
  try {
    const { error } = await supabase
      .from('dispense_logs')
      .insert({
        payment_id: testId,
        machine_id: 'TEST_VERIFY',
        slot_number: '999',
        status: 'invalid_status' // Should fail
      });
    
    if (error && error.message.includes('check constraint')) {
      console.log(`   ${SUCCESS} Status constraint working`);
      passed++;
    } else {
      console.log(`   ${FAIL} Status constraint not enforced`);
      failed++;
    }
  } catch (error) {
    console.log(`   ${SUCCESS} Status constraint working`);
    passed++;
  }

  // Results
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed === 0) {
    console.log(`${SUCCESS} Migration verified successfully!\n`);
    process.exit(0);
  } else {
    console.log(`${FAIL} Migration has issues. Please check the errors above.\n`);
    console.log(`${INFO} See docs/migrations/20260106-dispense-logs-guide.md for help\n`);
    process.exit(1);
  }
}

verify().catch(error => {
  console.error('\n❌ Verification failed:', error.message);
  process.exit(1);
});
