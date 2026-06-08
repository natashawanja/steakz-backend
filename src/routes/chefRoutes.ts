// Import Router from Express to create a modular route handler
import { Router } from 'express'

// Import Request and Response types for TypeScript type checking
import type { Request, Response } from 'express'

// Import Prisma client to query the database
import prisma from '../lib/prisma.js'

// Import auth middleware to protect all Chef routes
import { verifyToken, requireRole } from '../middleware/auth.js'

// Create a new Express router instance for Chef routes
const router = Router()

// Apply verifyToken and requireRole to ALL routes in this file
// Only logged in CHEF users can access any route in this file
router.use(verifyToken, requireRole(['CHEF']))

// GET /api/chef/orders — Get all pending and in-progress orders for the kitchen
router.get('/orders', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in Chef's token
  const branchId = req.user!.branchId!

  // Fetch orders that are either PENDING or IN_PROGRESS — these need to be cooked
  const orders = await prisma.order.findMany({
    where: {
      branchId,
      status: { in: ['PENDING', 'IN_PROGRESS'] } // Only show orders that need attention
    },
    include: {
      table: true, // Include table number so chef knows where the order is going
      items: {
        include: { menuItem: true } // Include menu item details so chef knows what to cook
      }
    },
    orderBy: { createdAt: 'asc' } // Show oldest orders first — first in first out
  })

  // Send the orders array as JSON response
  res.json(orders)
})

// PATCH /api/chef/orders/:id/ready — Mark an order as ready to be served
router.patch('/orders/:id/ready', async (req: Request, res: Response) => {

  // Get the order ID from the URL parameter
  const id = req.params['id'] as string

  // Update the order status to READY in the database
  // This notifies the waiter that the food is ready to be collected
  const order = await prisma.order.update({
    where: { id },
    data: { status: 'READY' }
  })

  // Send confirmation and the updated order back to the frontend
  res.json({ message: 'Order marked as ready.', order })
})

// GET /api/chef/menu — Get all menu items for the chef's branch
router.get('/menu', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in Chef's token
  const branchId = req.user!.branchId!

  // Fetch all menu items for this branch grouped by category
  const menu = await prisma.menuItem.findMany({
    where: { branchId },
    orderBy: { category: 'asc' } // Group items by category alphabetically
  })

  // Send the menu items array as JSON response
  res.json(menu)
})

// POST /api/chef/menu — Add a new menu item to the branch menu
router.post('/menu', async (req: Request, res: Response) => {

  // Get the branch ID from the logged in Chef's token
  const branchId = req.user!.branchId!

  // Destructure the new menu item details from the request body
  const { name, description, price, category } = req.body

  // Validate that the required fields are provided
  if (!name || !price || !category) {
    res.status(400).json({ error: 'name, price and category are required.' })
    return
  }

  // Create the new menu item in the database linked to this branch
  const item = await prisma.menuItem.create({
    data: { name, description, price, category, branchId }
  })

  // Return 201 Created with the new menu item
  res.status(201).json({ message: 'Menu item created.', item })
})

// PUT /api/chef/menu/:id — Update an existing menu item
router.put('/menu/:id', async (req: Request, res: Response) => {

  // Get the menu item ID from the URL parameter
  const id = req.params['id'] as string

  // Destructure the updated fields from the request body
  const { name, description, price, category } = req.body

  // Update the menu item in the database
  const item = await prisma.menuItem.update({
    where: { id },
    data: { name, description, price, category }
  })

  // Send confirmation and the updated item back to the frontend
  res.json({ message: 'Menu item updated.', item })
})

// PATCH /api/chef/menu/:id/availability — Toggle a menu item on or off
router.patch('/menu/:id/availability', async (req: Request, res: Response) => {

  // Get the menu item ID from the URL parameter
  const id = req.params['id'] as string

  // Get the new availability value from the request body — true or false
  const { isAvailable } = req.body

  // Update the isAvailable field in the database
  // If false the item will not show on the public menu
  const item = await prisma.menuItem.update({
    where: { id },
    data: { isAvailable }
  })

  // Send confirmation and the updated item back to the frontend
  res.json({ message: 'Availability updated.', item })
})

// Export the router so it can be registered in index.ts
export default router