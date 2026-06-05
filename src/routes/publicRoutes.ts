import { Router } from 'express'
import type { Request, Response } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// No auth required for any of these routes

// GET /api/public/menu — full menu
router.get('/menu', async (_req: Request, res: Response) => {
  const menu = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { category: 'asc' }
  })
  res.json(menu)
})

// GET /api/public/menu/:branchId — menu for a specific branch
router.get('/menu/:branchId', async (req: Request, res: Response) => {
  const branchId = req.params['branchId'] as string

  const menu = await prisma.menuItem.findMany({
    where: { branchId, isAvailable: true },
    orderBy: { category: 'asc' }
  })
  res.json(menu)
})

// GET /api/public/promotions — active promotions
router.get('/promotions', async (_req: Request, res: Response) => {
  const now = new Date()

  const promos = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    }
  })
  res.json(promos)
})

// GET /api/public/branches — list all branches
router.get('/branches', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      address: true,
      city: true
    },
    orderBy: { name: 'asc' }
  })
  res.json(branches)
})

export default router