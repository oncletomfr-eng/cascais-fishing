#!/usr/bin/env tsx

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user...')

    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@cascaisfishing.com' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        createdAt: true
      }
    })

    if (!adminUser) {
      console.log('❌ Admin user not found!')
      return
    }

    console.log('✅ Admin user found:')
    console.log('🆔 ID:', adminUser.id)
    console.log('📧 Email:', adminUser.email) 
    console.log('👤 Name:', adminUser.name)
    console.log('🔐 Role:', adminUser.role)
    console.log('📅 Created:', adminUser.createdAt)
    console.log('🔑 Has Password:', adminUser.password ? 'YES' : 'NO')
    
    if (adminUser.password) {
      console.log('🔑 Password Hash:', adminUser.password.substring(0, 20) + '...')
      
      // Test password verification
      const testPasswords = ['admin123', 'qwerty123']
      
      for (const testPassword of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPassword, adminUser.password)
          console.log(`🧪 Test password "${testPassword}":`, isValid ? '✅ VALID' : '❌ INVALID')
        } catch (error) {
          console.log(`🧪 Test password "${testPassword}":`, '💥 ERROR -', error)
        }
      }
    }

    return adminUser

  } catch (error) {
    console.error('❌ Error checking admin user:', error)
    throw error
  }
}

// Run the script
if (require.main === module) {
  checkAdminUser()
    .then(() => {
      console.log('🎉 Check completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Check failed:', error)
      process.exit(1)
    })
}

export { checkAdminUser }
