// Import Router from Express to create a modular route handler
import { Router } from 'express'

// Import Request and Response types for TypeScript type checking
import type { Request, Response } from 'express'

// Import Prisma client to query the database
import prisma from '../lib/prisma.js'

// Import auth middleware to protect all Waiter routes
import { verifyToken, requireRole } from '../middleware/auth.js'

// Create a new Express router instance for Waiter routes
const router = Router()

// Apply verifyToken and requireRole to ALL routes in this file
// Only logged in WAITER users can access any route in this file
router.use(verifyToken, requireRole(['WAITER']))

// GET /api/waiter/tables — Get all tables for the waiter's branch
router.get('/tables', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in Waiter's token
  const branchId = req.user!.branchId!

  // Fetch all tables for this branch ordered by table number
  const tables = await prisma.table.findMany({
    where: { branchId },
    orderBy: { number: 'asc' } // Show tables in numerical order on the floor plan
  })

  // Send the tables array as JSON response
  res.json(tables)
})

// GET /api/waiter/menu — Get the available menu for the waiter's branch
router.get('/menu', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in Waiter's token
  const branchId = req.user!.branchId!

  // Fetch only available menu items for this branch
  // Unavailable items are hidden so the waiter cannot order them
  const menu = await prisma.menuItem.findMany({
    where: { branchId, isAvailable: true },
    orderBy: { category: 'asc' } // Group items by category
  })

  // Send the menu items array as JSON response
  res.json(menu)
})

// POST /api/waiter/orders — Create a new order for a table
router.post('/orders', async (req: Request, res: Response) => {

  // Get the branch ID and waiter ID from the logged in Waiter's token
  const branchId = req.user!.branchId!
  const waiterId = req.user!.id

  // Destructure the table ID and items array from the request body
  const { tableId, items } = req.body

  // Validate that a table and at least one item are provided
  if (!tableId || !items || items.length === 0) {
    res.status(400).json({ error: 'tableId and items are required.' })
    return
  }

  try {
    // Calculate the order total by looping through each item
    let total = 0
    for (const item of items) {

      // Look up each menu item in the database to get its current price
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      })

      // If a menu item does not exist return a 404 error
      if (!menuItem) {
        res.status(404).json({ error: `Menu item ${item.menuItemId} not found.` })
        return
      }

      // Add the line total (price x quantity) to the running total
      total += Number(menuItem.price) * item.quantity
    }

    // Create the order in the database with all its items in one query
    const order = await prisma.order.create({
      data: {
        branchId,
        tableId,
        waiterId,
        totalAmount: total, // Calculated total from the loop above
        items: {
          // Create all order items at the same time as the order
          create: items.map((item: { menuItemId: string; quantity: number; unitPrice: number }) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice // Store the price at the time of ordering
          }))
        }
      },
      include: { items: true } // Return the created items in the response
    })

    // Mark the table as occupied now that an order has been placed
    await prisma.table.update({
      where: { id: tableId },
      data: { isOccupied: true }
    })

    // Return 201 Created with the new order
    res.status(201).json({ message: 'Order created.', order })

  } catch {
    // Catch any unexpected database errors
    res.status(500).json({ error: 'Failed to create order.' })
  }
})

// GET /api/waiter/orders — Get all orders for the waiter's branch
router.get('/orders', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in Waiter's token
  const branchId = req.user!.branchId!

  // Fetch all orders for this branch including table and menu item details
  const orders = await prisma.order.findMany({
    where: { branchId },
    include: {
      table: true, // Include table number for display
      items: {
        include: { menuItem: true } // Include menu item names and prices
      }
    },
    orderBy: { createdAt: 'desc' } // Show newest orders first
  })

  // Send the orders array as JSON response
  res.json(orders)
})

// PATCH /api/waiter/orders/:id/served — Mark an order as served to the customer
router.patch('/orders/:id/served', async (req: Request, res: Response) => {

  // Get the order ID from the URL parameter
  const id = req.params['id'] as string

  // Update the order status to SERVED in the database
  // This tells the cashier the food has been delivered and is ready for payment
  const order = await prisma.order.update({
    where: { id },
    data: { status: 'SERVED' }
  })

  // Send confirmation and the updated order back to the frontend
  res.json({ message: 'Order marked as served.', order })
})

// Export the router so it can be registered in index.ts
export default router