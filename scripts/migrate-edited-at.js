#!/usr/bin/env node

// Migration script to add edited_at column to messages table
// Run with: node scripts/migrate-edited-at.js

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

async function runMigration() {
  // You'll need to set these environment variables or update with your values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, '../sql/12_add_edited_at_column.sql')
  const migrationSql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Running migration to add edited_at column...')

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSql
    })

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('Migration completed successfully!')
    console.log('The edited_at column has been added to the messages table.')
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

runMigration()