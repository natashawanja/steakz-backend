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

    // Manchester branch
    prisma.user.upsert({ where: { email: 'bm.manchester@steakz.com' }, update: {}, create: { email: 'bm.manchester@steakz.com', name: 'Branch Manager Manchester', role: 'BM', password: await hash('BM@Manc1'), branchId: 'manchester' } }),
    prisma.user.upsert({ where: { email: 'chef.manchester@steakz.com' }, update: {}, create: { email: 'chef.manchester@steakz.com', name: 'Head Chef Manchester', role: 'CHEF', password: await hash('Chef@Manc1'), branchId: 'manchester' } }),
    prisma.user.upsert({ where: { email: 'cashier.manchester@steakz.com' }, update: {}, create: { email: 'cashier.manchester@steakz.com', name: 'Cashier Manchester', role: 'CASHIER', password: await hash('Cash@Manc1'), branchId: 'manchester' } }),
    prisma.user.upsert({ where: { email: 'waiter.manchester@steakz.com' }, update: {}, create: { email: 'waiter.manchester@steakz.com', name: 'Waiter Manchester', role: 'WAITER', password: await hash('Wait@Manc1'), branchId: 'manchester' } }),

    // Birmingham branch
    prisma.user.upsert({ where: { email: 'bm.birmingham@steakz.com' }, update: {}, create: { email: 'bm.birmingham@steakz.com', name: 'Branch Manager Birmingham', role: 'BM', password: await hash('BM@Birm1'), branchId: 'birmingham' } }),
    prisma.user.upsert({ where: { email: 'chef.birmingham@steakz.com' }, update: {}, create: { email: 'chef.birmingham@steakz.com', name: 'Head Chef Birmingham', role: 'CHEF', password: await hash('Chef@Birm1'), branchId: 'birmingham' } }),
    prisma.user.upsert({ where: { email: 'cashier.birmingham@steakz.com' }, update: {}, create: { email: 'cashier.birmingham@steakz.com', name: 'Cashier Birmingham', role: 'CASHIER', password: await hash('Cash@Birm1'), branchId: 'birmingham' } }),
    prisma.user.upsert({ where: { email: 'waiter.birmingham@steakz.com' }, update: {}, create: { email: 'waiter.birmingham@steakz.com', name: 'Waiter Birmingham', role: 'WAITER', password: await hash('Wait@Birm1'), branchId: 'birmingham' } }),

    // Leeds branch
    prisma.user.upsert({ where: { email: 'bm.leeds@steakz.com' }, update: {}, create: { email: 'bm.leeds@steakz.com', name: 'Branch Manager Leeds', role: 'BM', password: await hash('BM123!'), branchId: 'leeds' } }),
    prisma.user.upsert({ where: { email: 'chef.leeds@steakz.com' }, update: {}, create: { email: 'chef.leeds@steakz.com', name: 'Head Chef Leeds', role: 'CHEF', password: await hash('Chef123!'), branchId: 'leeds' } }),
    prisma.user.upsert({ where: { email: 'cashier.leeds@steakz.com' }, update: {}, create: { email: 'cashier.leeds@steakz.com', name: 'Cashier Leeds', role: 'CASHIER', password: await hash('Cash123!'), branchId: 'leeds' } }),
    prisma.user.upsert({ where: { email: 'waiter.leeds@steakz.com' }, update: {}, create: { email: 'waiter.leeds@steakz.com', name: 'Waiter Leeds', role: 'WAITER', password: await hash('Wait123!'), branchId: 'leeds' } }),

    // Edinburgh branch
    prisma.user.upsert({ where: { email: 'bm.edinburgh@steakz.com' }, update: {}, create: { email: 'bm.edinburgh@steakz.com', name: 'Branch Manager Edinburgh', role: 'BM', password: await hash('BM@Edin1'), branchId: 'edinburgh' } }),
    prisma.user.upsert({ where: { email: 'chef.edinburgh@steakz.com' }, update: {}, create: { email: 'chef.edinburgh@steakz.com', name: 'Head Chef Edinburgh', role: 'CHEF', password: await hash('Chef@Edin1'), branchId: 'edinburgh' } }),
    prisma.user.upsert({ where: { email: 'cashier.edinburgh@steakz.com' }, update: {}, create: { email: 'cashier.edinburgh@steakz.com', name: 'Cashier Edinburgh', role: 'CASHIER', password: await hash('Cash@Edin1'), branchId: 'edinburgh' } }),
    prisma.user.upsert({ where: { email: 'waiter.edinburgh@steakz.com' }, update: {}, create: { email: 'waiter.edinburgh@steakz.com', name: 'Waiter Edinburgh', role: 'WAITER', password: await hash('Wait@Edin1'), branchId: 'edinburgh' } }),

    // Bristol branch
    prisma.user.upsert({ where: { email: 'bm.bristol@steakz.com' }, update: {}, create: { email: 'bm.bristol@steakz.com', name: 'Branch Manager Bristol', role: 'BM', password: await hash('BM@Bris1'), branchId: 'bristol' } }),
    prisma.user.upsert({ where: { email: 'chef.bristol@steakz.com' }, update: {}, create: { email: 'chef.bristol@steakz.com', name: 'Head Chef Bristol', role: 'CHEF', password: await hash('Chef@Bris1'), branchId: 'bristol' } }),
    prisma.user.upsert({ where: { email: 'cashier.bristol@steakz.com' }, update: {}, create: { email: 'cashier.bristol@steakz.com', name: 'Cashier Bristol', role: 'CASHIER', password: await hash('Cash@Bris1'), branchId: 'bristol' } }),
    prisma.user.upsert({ where: { email: 'waiter.bristol@steakz.com' }, update: {}, create: { email: 'waiter.bristol@steakz.com', name: 'Waiter Bristol', role: 'WAITER', password: await hash('Wait@Bris1'), branchId: 'bristol' } }),

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

seedDatabase()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })