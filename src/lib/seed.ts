import bcrypt from 'bcryptjs'
import prisma from './prisma.js'

export async function seedDatabase() {
  console.log('Seeding database...')

  const branches = await Promise.all([
    prisma.branch.upsert({ where: { id: 'london' }, update: { isMain: true }, create: { id: 'london', name: 'London Flagship', address: '1 Oxford St', city: 'London', isMain: true } }),
    prisma.branch.upsert({ where: { id: 'manchester' }, update: {}, create: { id: 'manchester', name: 'Manchester', address: '5 Deansgate', city: 'Manchester' } }),
    prisma.branch.upsert({ where: { id: 'birmingham' }, update: {}, create: { id: 'birmingham', name: 'Birmingham', address: '10 Broad St', city: 'Birmingham' } }),
    prisma.branch.upsert({ where: { id: 'leeds' }, update: {}, create: { id: 'leeds', name: 'Leeds', address: '3 The Headrow', city: 'Leeds' } }),
    prisma.branch.upsert({ where: { id: 'edinburgh' }, update: {}, create: { id: 'edinburgh', name: 'Edinburgh', address: '7 Royal Mile', city: 'Edinburgh' } }),
    prisma.branch.upsert({ where: { id: 'bristol' }, update: {}, create: { id: 'bristol', name: 'Bristol', address: '2 Park St', city: 'Bristol' } }),
    prisma.branch.upsert({ where: { id: 'liverpool' }, update: {}, create: { id: 'liverpool', name: 'Liverpool', address: '4 Albert Dock', city: 'Liverpool' } }),
  ])

  console.log(`✅ ${branches.length} branches created`)

  const hash = (pw: string) => bcrypt.hash(pw, 10)

  await Promise.all([

    // Global roles - only one each
    prisma.user.upsert({ where: { email: 'admin@steakz.com' }, update: {}, create: { email: 'admin@steakz.com', name: 'Admin', role: 'ADMIN', password: await hash('Admin123!'), branchId: null } }),
    prisma.user.upsert({ where: { email: 'hm@steakz.com' }, update: {}, create: { email: 'hm@steakz.com', name: 'HQ Manager', role: 'HM', password: await hash('HM123!'), branchId: null } }),

    // London branch
    prisma.user.upsert({ where: { email: 'bm.london@steakz.com' }, update: {}, create: { email: 'bm.london@steakz.com', name: 'Branch Manager London', role: 'BM', password: await hash('BM123!'), branchId: 'london' } }),
    prisma.user.upsert({ where: { email: 'chef.london@steakz.com' }, update: {}, create: { email: 'chef.london@steakz.com', name: 'Head Chef London', role: 'CHEF', password: await hash('Chef123!'), branchId: 'london' } }),
    prisma.user.upsert({ where: { email: 'cashier.london@steakz.com' }, update: {}, create: { email: 'cashier.london@steakz.com', name: 'Cashier London', role: 'CASHIER', password: await hash('Cash123!'), branchId: 'london' } }),
    prisma.user.upsert({ where: { email: 'waiter.london@steakz.com' }, update: {}, create: { email: 'waiter.london@steakz.com', name: 'Waiter London', role: 'WAITER', password: await hash('Wait123!'), branchId: 'london' } }),

    // Leeds branch
    prisma.user.upsert({ where: { email: 'bm.leeds@steakz.com' }, update: {}, create: { email: 'bm.leeds@steakz.com', name: 'Branch Manager Leeds', role: 'BM', password: await hash('BM123!'), branchId: 'leeds' } }),
    prisma.user.upsert({ where: { email: 'chef.leeds@steakz.com' }, update: {}, create: { email: 'chef.leeds@steakz.com', name: 'Head Chef Leeds', role: 'CHEF', password: await hash('Chef123!'), branchId: 'leeds' } }),
    prisma.user.upsert({ where: { email: 'cashier.leeds@steakz.com' }, update: {}, create: { email: 'cashier.leeds@steakz.com', name: 'Cashier Leeds', role: 'CASHIER', password: await hash('Cash123!'), branchId: 'leeds' } }),
    prisma.user.upsert({ where: { email: 'waiter.leeds@steakz.com' }, update: {}, create: { email: 'waiter.leeds@steakz.com', name: 'Waiter Leeds', role: 'WAITER', password: await hash('Wait123!'), branchId: 'leeds' } }),

    // Liverpool branch
    prisma.user.upsert({ where: { email: 'bm.liverpool@steakz.com' }, update: {}, create: { email: 'bm.liverpool@steakz.com', name: 'Branch Manager Liverpool', role: 'BM', password: await hash('BM123!'), branchId: 'liverpool' } }),
    prisma.user.upsert({ where: { email: 'chef.liverpool@steakz.com' }, update: {}, create: { email: 'chef.liverpool@steakz.com', name: 'Head Chef Liverpool', role: 'CHEF', password: await hash('Chef123!'), branchId: 'liverpool' } }),
    prisma.user.upsert({ where: { email: 'cashier.liverpool@steakz.com' }, update: {}, create: { email: 'cashier.liverpool@steakz.com', name: 'Cashier Liverpool', role: 'CASHIER', password: await hash('Cash123!'), branchId: 'liverpool' } }),
    prisma.user.upsert({ where: { email: 'waiter.liverpool@steakz.com' }, update: {}, create: { email: 'waiter.liverpool@steakz.com', name: 'Waiter Liverpool', role: 'WAITER', password: await hash('Wait123!'), branchId: 'liverpool' } }),

  ])

  console.log('✅ Users created')

  const branchIds = ['london', 'manchester', 'birmingham', 'leeds', 'edinburgh', 'bristol', 'liverpool']

  for (const branchId of branchIds) {
    const tableCount = await prisma.table.count({ where: { branchId } })
    if (tableCount === 0) {
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          prisma.table.create({
            data: {
              number: i + 1,
              seats: i % 3 === 0 ? 2 : i % 3 === 1 ? 4 : 6,
              branchId
            }
          })
        )
      )
      console.log(`✅ 10 tables created for ${branchId} branch`)
    }
  }

  console.log('✅ Seed complete!')
}