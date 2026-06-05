import { Router } from 'express'
import type { Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(verifyToken, requireRole(['CASHIER']))

// GET /api/cashier/orders — view served orders ready for payment
router.get('/orders', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const orders = await prisma.order.findMany({
    where: {
      branchId,
      status: { in: ['SERVED', 'READY'] }
    },
    include: {
      table: true,
      items: {
        include: { menuItem: true }
      },
      promotion: true
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json(orders)
})

// GET /api/cashier/orders/:id/receipt — generate receipt
router.get('/orders/:id/receipt', async (req: Request, res: Response) => {
  const id = req.params['id'] as string

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      items: {
        include: { menuItem: true }
      },
      promotion: true,
      branch: true
    }
  })

  if (!order) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }

  const subtotal = Number(order.totalAmount)
  const discount = order.promotion
    ? (subtotal * Number(order.promotion.discount)) / 100
    : 0
  const tax = (subtotal - discount) * 0.2
  const totalPaid = subtotal - discount + tax

  res.json({
    orderId: order.id,
    branch: order.branch.name,
    table: order.table.number,
    items: order.items.map(i => ({
      name: i.menuItem.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      total: Number(i.unitPrice) * i.quantity
    })),
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    tax: tax.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    promoCode: order.promotion?.code || null
  })
})

// POST /api/cashier/orders/:id/pay — process payment
router.post('/orders/:id/pay', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const { paymentMethod } = req.body

  if (!paymentMethod) {
    res.status(400).json({ error: 'paymentMethod is required.' })
    return
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { promotion: true }
  })

  if (!order) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }

  const subtotal = Number(order.totalAmount)
  const discount = order.promotion
    ? (subtotal * Number(order.promotion.discount)) / 100
    : 0
  const tax = (subtotal - discount) * 0.2
  const totalPaid = subtotal - discount + tax

  // Create receipt
  const receipt = await prisma.receipt.create({
    data: {
      orderId: id,
      subtotal,
      discount,
      tax,
      totalPaid,
      paymentMethod
    }
  })

  // Mark order as paid and free up the table
  await prisma.order.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date() }
  })

  await prisma.table.update({
    where: { id: order.tableId },
    data: { isOccupied: false }
  })

  res.json({ message: 'Payment processed.', receipt })
})

// POST /api/cashier/orders/:id/promo — apply promo code
router.post('/orders/:id/promo', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const { code } = req.body

  if (!code) {
    res.status(400).json({ error: 'Promo code is required.' })
    return
  }

  const promo = await prisma.promotion.findUnique({
    where: { code }
  })

  if (!promo || !promo.isActive) {
    res.status(404).json({ error: 'Invalid or expired promo code.' })
    return
  }

  await prisma.order.update({
    where: { id },
    data: { promoId: promo.id }
  })

  res.json({ message: 'Promo applied.', discount: promo.discount })
})

// GET /api/cashier/transactions — today's transactions
router.get('/transactions', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const orders = await prisma.order.findMany({
    where: {
      branchId,
      status: 'PAID',
      paidAt: { gte: today }
    },
    include: {
      receipt: true,
      table: true
    },
    orderBy: { paidAt: 'desc' }
  })

  const total = orders.reduce((sum, o) =>
    sum + Number(o.receipt?.totalPaid ?? 0), 0
  )

  res.json({
    transactions: orders,
    totalRevenue: total.toFixed(2)
  })
})

export default router