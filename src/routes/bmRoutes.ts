// Import Router from Express to create a modular route handler
import { Router } from 'express'

// Import Request and Response types for TypeScript type checking
import type { Request, Response } from 'express'

// Import Prisma client to query the database
import prisma from '../lib/prisma.js'

// Import auth middleware to protect all BM routes
import { verifyToken, requireRole } from '../middleware/auth.js'

// Create a new Express router instance for Branch Manager routes
const router = Router()

// Apply verifyToken and requireRole to ALL routes in this file
// Only logged in BM users can access any route in this file
router.use(verifyToken, requireRole(['BM']))

// GET /api/bm/dashboard — Returns today's KPIs for the BM's branch
router.get('/dashboard', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in BM's token
  const branchId = req.user!.branchId!

  // Set today's date to midnight so we only count today's orders
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Run all four database queries at the same time for better performance
  const [totalOrders, paidOrders, occupiedTables, totalTables] = await Promise.all([

    // Count all orders created today for this branch
    prisma.order.count({
      where: { branchId, createdAt: { gte: today } }
    }),

    // Get all paid orders today including their receipts for revenue calculation
    prisma.order.findMany({
      where: { branchId, status: 'PAID', paidAt: { gte: today } },
      include: { receipt: true }
    }),

    // Count how many tables are currently occupied
    prisma.table.count({
      where: { branchId, isOccupied: true }
    }),

    // Count the total number of tables in the branch
    prisma.table.count({
      where: { branchId }
    })
  ])

  // Calculate total revenue by adding up totalPaid from each receipt
  // Falls back to 0 if a receipt does not exist
  const revenue = paidOrders.reduce((sum, o) =>
    sum + Number(o.receipt?.totalPaid ?? 0), 0
  )

  // Send the dashboard KPIs back to the frontend
  res.json({
    todayOrders: totalOrders,
    todayRevenue: revenue.toFixed(2), // Format to 2 decimal places
    occupiedTables,
    totalTables
  })
})

// GET /api/bm/orders — Returns all orders for the BM's own branch
router.get('/orders', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in BM's token
  const branchId = req.user!.branchId!

  // Fetch all orders for this branch including table and menu item details
  const orders = await prisma.order.findMany({
    where: { branchId },
    include: {
      table: true,   // Include the table number the order was placed at
      items: {
        include: { menuItem: true } // Include the menu item details for each order item
      }
    },
    orderBy: { createdAt: 'desc' } // Show newest orders first
  })

  // Send the orders array as JSON response
  res.json(orders)
})

// GET /api/bm/sales — Returns sales summary for a given time period
router.get('/sales', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in BM's token
  const branchId = req.user!.branchId!

  // Read the period query parameter from the URL e.g. ?period=week
  const { period } = req.query

  const now = new Date()
  let from = new Date()

  // Set the start date based on the requested period
  if (period === 'week') {
    from.setDate(now.getDate() - 7)   // Last 7 days
  } else if (period === 'month') {
    from.setMonth(now.getMonth() - 1) // Last 30 days
  } else {
    from.setHours(0, 0, 0, 0)         // Default to today only
  }

  // Fetch all paid orders within the selected time period
  const orders = await prisma.order.findMany({
    where: {
      branchId,
      status: 'PAID',
      paidAt: { gte: from } // Only orders paid after the start date
    },
    include: { receipt: true }
  })

  // Calculate total revenue from all receipts in the period
  const total = orders.reduce((sum, o) =>
    sum + Number(o.receipt?.totalPaid ?? 0), 0
  )

  // Send the sales summary back to the frontend
  res.json({
    period: period || 'today',
    totalOrders: orders.length,
    totalRevenue: total.toFixed(2)
  })
})

// GET /api/bm/tables — Returns all tables and their occupancy status
router.get('/tables', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in BM's token
  const branchId = req.user!.branchId!

  // Fetch all tables for this branch ordered by table number
  const tables = await prisma.table.findMany({
    where: { branchId },
    orderBy: { number: 'asc' }
  })

  // Send the tables array as JSON response
  res.json(tables)
})

// GET /api/bm/staff — Returns all active staff for the BM's branch
router.get('/staff', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in BM's token
  const branchId = req.user!.branchId!

  // Fetch all active users in this branch
  // Only return safe fields — never return the password
  const staff = await prisma.user.findMany({
    where: { branchId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { role: 'asc' } // Group staff by role alphabetically
  })

  // Send the staff array as JSON response
  res.json(staff)
})

// GET /api/bm/promotions — Returns active promotions for the BM's branch
router.get('/promotions', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in BM's token
  const branchId = req.user!.branchId!

  // Fetch promotions that are either for this specific branch or global (branchId null)
  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      OR: [
        { branchId },       // Promotions specific to this branch
        { branchId: null }  // Global promotions that apply to all branches
      ]
    }
  })

  // Send the promotions array as JSON response
  res.json(promos)
})

// Export the router so it can be registered in index.ts
export default router