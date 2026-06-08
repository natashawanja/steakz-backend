// Import Router from Express to create a modular route handler
import { Router } from 'express'

// Import Request and Response types for TypeScript type checking
import type { Request, Response } from 'express'

// Import Prisma client to query the database
import prisma from '../lib/prisma.js'

// Create a new Express router instance for public routes
const router = Router()

// No authentication required for any of these routes
// These endpoints are accessible by anyone visiting the website
// including customers who are not logged in

// GET /api/public/menu — Get the full menu across all branches
router.get('/menu', async (_req: Request, res: Response) => {

  // Fetch all available menu items from the database
  // Only return items where isAvailable is true — hidden items are excluded
  const menu = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { category: 'asc' } // Group items by category alphabetically
  })

  // Send the full menu as JSON response
  res.json(menu)
})

// GET /api/public/menu/:branchId — Get the menu for a specific branch
router.get('/menu/:branchId', async (req: Request, res: Response) => {

  // Get the branch ID from the URL parameter
  const branchId = req.params['branchId'] as string

  // Fetch only available menu items for the requested branch
  const menu = await prisma.menuItem.findMany({
    where: { branchId, isAvailable: true },
    orderBy: { category: 'asc' } // Group items by category alphabetically
  })

  // Send the branch menu as JSON response
  res.json(menu)
})

// GET /api/public/promotions — Get all currently active promotions
router.get('/promotions', async (_req: Request, res: Response) => {

  // Get the current date and time
  const now = new Date()

  // Fetch promotions that are active and within their start and end date range
  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now }, // Promotion must have already started
      endDate: { gte: now }    // Promotion must not have ended yet
    }
  })

  // Send the active promotions as JSON response
  res.json(promos)
})

// GET /api/public/branches — Get a list of all active branches
router.get('/branches', async (_req: Request, res: Response) => {

  // Fetch all active branches from the database
  // Only select the fields needed for public display — no sensitive data
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: {
      id: true,      // Needed to filter the menu by branch
      name: true,    // Branch name for display
      address: true, // Branch address for the locations section
      city: true     // City name for display
    },
    orderBy: { name: 'asc' } // Order alphabetically by branch name
  })

  // Send the branches array as JSON response
  res.json(branches)
})

// Export the router so it can be registered in index.ts
export default router