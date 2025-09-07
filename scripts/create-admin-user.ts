#!/usr/bin/env tsx

/**
 * Script для создания admin пользователя для тестирования
 * Запуск: npx tsx scripts/create-admin-user.ts
 */

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...')

    const adminEmail = 'admin@cascaisfishing.com'
    const adminPassword = 'admin123'
    const adminName = 'Admin Test User'

    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      console.log('⚠️  Admin user already exists:', existingUser.email)
      console.log('🔍 Current role:', existingUser.role)
      
      // Update role to ADMIN if not already
      if (existingUser.role !== 'ADMIN') {
        const updatedUser = await prisma.user.update({
          where: { email: adminEmail },
          data: { role: 'ADMIN' }
        })
        console.log('✅ Updated role to ADMIN for:', updatedUser.email)
      }
      
      return existingUser
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', adminUser.email)
    console.log('🔑 Password: admin123')
    console.log('👤 Role:', adminUser.role)
    console.log('🆔 ID:', adminUser.id)

    return adminUser

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('🎉 Script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

export { createAdminUser }
