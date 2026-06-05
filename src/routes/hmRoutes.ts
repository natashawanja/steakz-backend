import { Router } from 'express'
import type { Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(verifyToken, requireRole(['HM']))

// GET /api/hm/dashboard — all branches KPIs
router.get('/dashboard', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    where: { isActive: true }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const branchStats = await Promise.all(
    branches.map(async (branch) => {
      const orders = await prisma.order.findMany({
        where: { branchId: branch.id, status: 'PAID' },
        include: { receipt: true }
      })

      const todayOrders = await prisma.order.count({
        where: { branchId: branch.id, createdAt: { gte: today } }
      })

      const revenue = orders.reduce((sum, o) =>
        sum + Number(o.receipt?.totalPaid ?? 0), 0
      )

      return {
        branchId: branch.id,
        branchName: branch.name,
        city: branch.city,
        totalOrders: orders.length,
        todayOrders,
        totalRevenue: revenue.toFixed(2)
      }
    })
  )

  const grandTotal = branchStats.reduce((sum, b) =>
    sum + Number(b.totalRevenue), 0
  )

  res.json({
    branches: branchStats,
    grandTotalRevenue: grandTotal.toFixed(2)
  })
})

// GET /api/hm/branches — list all branches
router.get('/branches', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' }
  })
  res.json(branches)
})

// GET /api/hm/branches/:id/sales — sales for a branch with date filter
router.get('/branches/:id/sales', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const { from, to } = req.query

  const fromDate = from ? new Date(from as string) : new Date(0)
  const toDate = to ? new Date(to as string) : new Date()

  const orders = await prisma.order.findMany({
    where: {
      branchId: id,
      status: 'PAID',
      paidAt: { gte: fromDate, lte: toDate }
    },
    include: { receipt: true }
  })

  const total = orders.reduce((sum, o) =>
    sum + Number(o.receipt?.totalPaid ?? 0), 0
  )

  res.json({
    branchId: id,
    totalOrders: orders.length,
    totalRevenue: total.toFixed(2),
    from: fromDate,
    to: toDate
  })
})

// GET /api/hm/branches/:id/orders — all orders for a branch
router.get('/branches/:id/orders', async (req: Request, res: Response) => {
  const id = req.params['id'] as string

  const orders = await prisma.order.findMany({
    where: { branchId: id },
    include: {
      table: true,
      items: { include: { menuItem: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json(orders)
})

// GET /api/hm/branches/:id/top-items — top selling items
router.get('/branches/:id/top-items', async (req: Request, res: Response) => {
  const id = req.params['id'] as string

  const items = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: { order: { branchId: id } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5
  })

  const itemsWithNames = await Promise.all(
    items.map(async (item) => {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      })
      return {
        name: menuItem?.name,
        totalSold: item._sum.quantity
      }
    })
  )

  res.json(itemsWithNames)
})

// GET /api/hm/report/export — export all branch summary
router.get('/report/export', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    where: { isActive: true }
  })

  const report = await Promise.all(
    branches.map(async (branch) => {
      const orders = await prisma.order.findMany({
        where: { branchId: branch.id, status: 'PAID' },
        include: { receipt: true }
      })

      const revenue = orders.reduce((sum, o) =>
        sum + Number(o.receipt?.totalPaid ?? 0), 0
      )

      return {
        branch: branch.name,
        city: branch.city,
        totalOrders: orders.length,
        totalRevenue: revenue.toFixed(2)
      }
    })
  )

  res.json({ report, generatedAt: new Date() })
})

export default router