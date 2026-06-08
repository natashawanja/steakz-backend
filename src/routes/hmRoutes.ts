// Import Router from Express to create a modular route handler
import { Router } from 'express'

// Import Request and Response types for TypeScript type checking
import type { Request, Response } from 'express'

// Import Prisma client to query the database
import prisma from '../lib/prisma.js'

// Import auth middleware to protect all HM routes
import { verifyToken, requireRole } from '../middleware/auth.js'

// Create a new Express router instance for HQ Manager routes
const router = Router()

// Apply verifyToken and requireRole to ALL routes in this file
// Only logged in HM users can access any route in this file
router.use(verifyToken, requireRole(['HM']))

// GET /api/hm/dashboard — Returns KPIs for all active branches
router.get('/dashboard', async (_req: Request, res: Response) => {

  // Fetch all active branches from the database
  const branches = await prisma.branch.findMany({
    where: { isActive: true }
  })

  // Set today's date to midnight for filtering today's orders
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Loop through each branch and calculate its stats
  const branchStats = await Promise.all(
    branches.map(async (branch) => {

      // Get all paid orders for this branch including receipts
      const orders = await prisma.order.findMany({
        where: { branchId: branch.id, status: 'PAID' },
        include: { receipt: true }
      })

      // Count how many orders were placed today for this branch
      const todayOrders = await prisma.order.count({
        where: { branchId: branch.id, createdAt: { gte: today } }
      })

      // Calculate total revenue by adding up all receipt totals
      const revenue = orders.reduce((sum, o) =>
        sum + Number(o.receipt?.totalPaid ?? 0), 0
      )

      // Return the stats object for this branch
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

  // Calculate the combined revenue across all branches
  const grandTotal = branchStats.reduce((sum, b) =>
    sum + Number(b.totalRevenue), 0
  )

  // Send all branch stats and the grand total back to the frontend
  res.json({
    branches: branchStats,
    grandTotalRevenue: grandTotal.toFixed(2)
  })
})

// GET /api/hm/branches — Get a list of all branches
router.get('/branches', async (_req: Request, res: Response) => {

  // Fetch all branches ordered alphabetically by name
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' }
  })

  // Send the branches array as JSON response
  res.json(branches)
})

// GET /api/hm/branches/:id/sales — Get sales for a branch within a date range
router.get('/branches/:id/sales', async (req: Request, res: Response) => {

  // Get the branch ID from the URL parameter
  const id = req.params['id'] as string

  // Read optional from and to date filters from the query string
  const { from, to } = req.query

  // If no from date is provided default to the beginning of time
  const fromDate = from ? new Date(from as string) : new Date(0)

  // If no to date is provided default to now
  const toDate = to ? new Date(to as string) : new Date()

  // Fetch all paid orders for this branch within the date range
  const orders = await prisma.order.findMany({
    where: {
      branchId: id,
      status: 'PAID',
      paidAt: { gte: fromDate, lte: toDate } // Between from and to dates
    },
    include: { receipt: true }
  })

  // Calculate total revenue for the period
  const total = orders.reduce((sum, o) =>
    sum + Number(o.receipt?.totalPaid ?? 0), 0
  )

  // Send the sales summary back to the frontend
  res.json({
    branchId: id,
    totalOrders: orders.length,
    totalRevenue: total.toFixed(2),
    from: fromDate,
    to: toDate
  })
})

// GET /api/hm/branches/:id/orders — Get all orders for a specific branch
router.get('/branches/:id/orders', async (req: Request, res: Response) => {

  // Get the branch ID from the URL parameter
  const id = req.params['id'] as string

  // Fetch all orders for this branch including table and menu item details
  const orders = await prisma.order.findMany({
    where: { branchId: id },
    include: {
      table: true,                          // Include table number
      items: { include: { menuItem: true } } // Include menu item names and prices
    },
    orderBy: { createdAt: 'desc' } // Show newest orders first
  })

  // Send the orders array as JSON response
  res.json(orders)
})

// GET /api/hm/branches/:id/top-items — Get the top 5 best selling items for a branch
router.get('/branches/:id/top-items', async (req: Request, res: Response) => {

  // Get the branch ID from the URL parameter
  const id = req.params['id'] as string

  // Group order items by menu item and sum up the quantities sold
  // This gives us a ranked list of the most ordered items
  const items = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: { order: { branchId: id } }, // Only items from this branch
    _sum: { quantity: true },           // Sum the quantity for each item
    orderBy: { _sum: { quantity: 'desc' } }, // Sort by most sold first
    take: 5 // Only return the top 5 items
  })

  // For each top item look up the menu item name from the database
  const itemsWithNames = await Promise.all(
    items.map(async (item) => {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      })

      // Return the item name and total quantity sold
      return {
        name: menuItem?.name,
        totalSold: item._sum.quantity
      }
    })
  )

  // Send the top items array as JSON response
  res.json(itemsWithNames)
})

// GET /api/hm/report/export — Export a full performance summary for all branches
router.get('/report/export', async (_req: Request, res: Response) => {

  // Fetch all active branches
  const branches = await prisma.branch.findMany({
    where: { isActive: true }
  })

  // Build the report by calculating revenue for each branch
  const report = await Promise.all(
    branches.map(async (branch) => {

      // Get all paid orders for this branch including receipts
      const orders = await prisma.order.findMany({
        where: { branchId: branch.id, status: 'PAID' },
        include: { receipt: true }
      })

      // Calculate total revenue for this branch
      const revenue = orders.reduce((sum, o) =>
        sum + Number(o.receipt?.totalPaid ?? 0), 0
      )

      // Return the branch summary for the report
      return {
        branch: branch.name,
        city: branch.city,
        totalOrders: orders.length,
        totalRevenue: revenue.toFixed(2)
      }
    })
  )

  // Send the full report and the time it was generated
  res.json({ report, generatedAt: new Date() })
})

// Export the router so it can be registered in index.ts
export default router