'use server';

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or with admin token
    const adminToken = request.headers.get('admin-token');
    if (process.env.NODE_ENV === 'production' && adminToken !== process.env.ADMIN_MIGRATION_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - admin token required'
      }, { status: 401 });
    }

    console.log('🔄 Starting database migration...');
    console.log('📊 Database URL configured:', !!process.env.DATABASE_URL);
    
    // Run Prisma migration
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    
    console.log('✅ Migration completed successfully');
    console.log('Migration output:', stdout);
    
    if (stderr) {
      console.warn('Migration warnings:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      output: stdout,
      warnings: stderr || null
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
