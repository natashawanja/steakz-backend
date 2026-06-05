import { Router } from 'express'
import type { Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(verifyToken, requireRole(['WAITER']))

// GET /api/waiter/tables — view tables for own branch
router.get('/tables', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const tables = await prisma.table.findMany({
    where: { branchId },
    orderBy: { number: 'asc' }
  })
  res.json(tables)
})

// GET /api/waiter/menu — view menu for own branch
router.get('/menu', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const menu = await prisma.menuItem.findMany({
    where: { branchId, isAvailable: true },
    orderBy: { category: 'asc' }
  })
  res.json(menu)
})

// POST /api/waiter/orders — create a new order
router.post('/orders', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!
  const waiterId = req.user!.id
  const { tableId, items } = req.body

  if (!tableId || !items || items.length === 0) {
    res.status(400).json({ error: 'tableId and items are required.' })
    return
  }

  try {
    // Calculate total
    let total = 0
    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      })
      if (!menuItem) {
        res.status(404).json({ error: `Menu item ${item.menuItemId} not found.` })
        return
      }
      total += Number(menuItem.price) * item.quantity
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        branchId,
        tableId,
        waiterId,
        totalAmount: total,
        items: {
          create: items.map((item: { menuItemId: string; quantity: number; unitPrice: number }) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        }
      },
      include: { items: true }
    })

    // Mark table as occupied
    await prisma.table.update({
      where: { id: tableId },
      data: { isOccupied: true }
    })

    res.status(201).json({ message: 'Order created.', order })
  } catch {
    res.status(500).json({ error: 'Failed to create order.' })
  }
})

// GET /api/waiter/orders — view orders for own branch
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

// PATCH /api/waiter/orders/:id/served — mark order as served
router.patch('/orders/:id/served', async (req: Request, res: Response) => {
  const id = req.params['id'] as string

  const order = await prisma.order.update({
    where: { id },
    data: { status: 'SERVED' }
  })

  res.json({ message: 'Order marked as served.', order })
})

export default router