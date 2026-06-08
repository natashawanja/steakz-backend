// Import Router from Express to create a modular route handler
import { Router } from 'express'

// Import Request and Response types for TypeScript type checking
import type { Request, Response } from 'express'

// Import Prisma client to query the database
import prisma from '../lib/prisma.js'

// Import auth middleware to protect all Cashier routes
import { verifyToken, requireRole } from '../middleware/auth.js'

// Create a new Express router instance for Cashier routes
const router = Router()

// Apply verifyToken and requireRole to ALL routes in this file
// Only logged in CASHIER users can access any route in this file
router.use(verifyToken, requireRole(['CASHIER']))

// GET /api/cashier/orders — Get all orders ready for payment
router.get('/orders', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in Cashier's token
  const branchId = req.user!.branchId!

  // Fetch orders with status SERVED or READY — these are ready to be paid
  const orders = await prisma.order.findMany({
    where: {
      branchId,
      status: { in: ['SERVED', 'READY'] } // Only show orders the cashier needs to process
    },
    include: {
      table: true,       // Include table number for display
      items: {
        include: { menuItem: true } // Include menu item details for the receipt
      },
      promotion: true    // Include any applied promotion for discount calculation
    },
    orderBy: { createdAt: 'desc' } // Show newest orders first
  })

  // Send the orders array as JSON response
  res.json(orders)
})

// GET /api/cashier/orders/:id/receipt — Generate a receipt preview for an order
router.get('/orders/:id/receipt', async (req: Request, res: Response) => {

  // Get the order ID from the URL parameter
  const id = req.params['id'] as string

  // Fetch the full order including all related data needed for the receipt
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

  // Return 404 if the order does not exist
  if (!order) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }

  // Calculate the subtotal from the order's total amount
  const subtotal = Number(order.totalAmount)

  // Calculate the discount — if a promo is applied work out the percentage off
  const discount = order.promotion
    ? (subtotal * Number(order.promotion.discount)) / 100
    : 0

  // Calculate 20% VAT on the amount after discount
  const tax = (subtotal - discount) * 0.2

  // Calculate the final amount the customer pays
  const totalPaid = subtotal - discount + tax

  // Send the receipt data back to the frontend for display
  res.json({
    orderId: order.id,
    branch: order.branch.name,
    table: order.table.number,
    items: order.items.map(i => ({
      name: i.menuItem.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      total: Number(i.unitPrice) * i.quantity // Line total for each item
    })),
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    tax: tax.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    promoCode: order.promotion?.code || null
  })
})

// POST /api/cashier/orders/:id/pay — Process payment and close the order
router.post('/orders/:id/pay', async (req: Request, res: Response) => {

  // Get the order ID from the URL parameter
  const id = req.params['id'] as string

  // Get the payment method from the request body e.g. CASH or CARD
  const { paymentMethod } = req.body

  // Validate that a payment method was provided
  if (!paymentMethod) {
    res.status(400).json({ error: 'paymentMethod is required.' })
    return
  }

  // Fetch the order and its promotion to calculate the final total
  const order = await prisma.order.findUnique({
    where: { id },
    include: { promotion: true }
  })

  // Return 404 if the order does not exist
  if (!order) {
    res.status(404).json({ error: 'Order not found.' })
    return
  }

  // Recalculate the totals the same way as the receipt preview
  const subtotal = Number(order.totalAmount)

  // Apply discount if a promotion exists
  const discount = order.promotion
    ? (subtotal * Number(order.promotion.discount)) / 100
    : 0

  // Calculate 20% VAT on the discounted amount
  const tax = (subtotal - discount) * 0.2

  // Calculate the final total the customer pays
  const totalPaid = subtotal - discount + tax

  // Save the receipt record to the database
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

  // Update the order status to PAID and record the payment time
  await prisma.order.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date() }
  })

  // Free up the table so it can be used again
  await prisma.table.update({
    where: { id: order.tableId },
    data: { isOccupied: false }
  })

  // Send confirmation and the receipt back to the frontend
  res.json({ message: 'Payment processed.', receipt })
})

// POST /api/cashier/orders/:id/promo — Apply a promo code to an order
router.post('/orders/:id/promo', async (req: Request, res: Response) => {

  // Get the order ID from the URL parameter
  const id = req.params['id'] as string

  // Get the promo code from the request body
  const { code } = req.body

  // Validate that a promo code was provided
  if (!code) {
    res.status(400).json({ error: 'Promo code is required.' })
    return
  }

  // Look up the promo code in the database
  const promo = await prisma.promotion.findUnique({
    where: { code }
  })

  // Reject if the promo does not exist or is no longer active
  if (!promo || !promo.isActive) {
    res.status(404).json({ error: 'Invalid or expired promo code.' })
    return
  }

  // Link the promotion to the order in the database
  await prisma.order.update({
    where: { id },
    data: { promoId: promo.id }
  })

  // Send back the discount percentage so the frontend can update the total
  res.json({ message: 'Promo applied.', discount: promo.discount })
})

// GET /api/cashier/transactions — Get all of today's completed transactions
router.get('/transactions', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in Cashier's token
  const branchId = req.user!.branchId!

  // Set today's date to midnight to filter only today's transactions
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Fetch all paid orders for today at this branch
  const orders = await prisma.order.findMany({
    where: {
      branchId,
      status: 'PAID',
      paidAt: { gte: today } // Only orders paid today
    },
    include: {
      receipt: true, // Include receipt for revenue calculation
      table: true    // Include table number for display
    },
    orderBy: { paidAt: 'desc' } // Show most recent payments first
  })

  // Calculate total revenue for the day
  const total = orders.reduce((sum, o) =>
    sum + Number(o.receipt?.totalPaid ?? 0), 0
  )

  // Send the transactions and total revenue back to the frontend
  res.json({
    transactions: orders,
    totalRevenue: total.toFixed(2)
  })
})

// Export the router so it can be registered in index.ts
export default router