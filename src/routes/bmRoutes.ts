import { Router } from 'express'
import type { Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(verifyToken, requireRole(['BM']))

// GET /api/bm/dashboard — branch KPIs
router.get('/dashboard', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalOrders, paidOrders, occupiedTables, totalTables] = await Promise.all([
    prisma.order.count({
      where: { branchId, createdAt: { gte: today } }
    }),
    prisma.order.findMany({
      where: { branchId, status: 'PAID', paidAt: { gte: today } },
      include: { receipt: true }
    }),
    prisma.table.count({
      where: { branchId, isOccupied: true }
    }),
    prisma.table.count({
      where: { branchId }
    })
  ])

  const revenue = paidOrders.reduce((sum, o) =>
    sum + Number(o.receipt?.totalPaid ?? 0), 0
  )

  res.json({
    todayOrders: totalOrders,
    todayRevenue: revenue.toFixed(2),
    occupiedTables,
    totalTables
  })
})

// GET /api/bm/orders — all orders for own branch
router.get('/orders', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const orders = await prisma.order.findMany({
    where: { branchId },
    include: {
      table: true,
      items: {
        include: { menuItem: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json(orders)
})

// GET /api/bm/sales — sales summary
router.get('/sales', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!
  const { period } = req.query

  const now = new Date()
  let from = new Date()

  if (period === 'week') {
    from.setDate(now.getDate() - 7)
  } else if (period === 'month') {
    from.setMonth(now.getMonth() - 1)
  } else {
    from.setHours(0, 0, 0, 0)
  }

  const orders = await prisma.order.findMany({
    where: {
      branchId,
      status: 'PAID',
      paidAt: { gte: from }
    },
    include: { receipt: true }
  })

  const total = orders.reduce((sum, o) =>
    sum + Number(o.receipt?.totalPaid ?? 0), 0
  )

  res.json({
    period: period || 'today',
    totalOrders: orders.length,
    totalRevenue: total.toFixed(2)
  })
})

// GET /api/bm/tables — table occupancy
router.get('/tables', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const tables = await prisma.table.findMany({
    where: { branchId },
    orderBy: { number: 'asc' }
  })
  res.json(tables)
})

// GET /api/bm/staff — staff list for own branch
router.get('/staff', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const staff = await prisma.user.findMany({
    where: { branchId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { role: 'asc' }
  })
  res.json(staff)
})

// GET /api/bm/promotions — active promotions for branch
router.get('/promotions', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      OR: [
        { branchId },
        { branchId: null }
      ]
    }
  })
  res.json(promos)
})

export default router
