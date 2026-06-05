import { Router } from 'express'
import type { Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(verifyToken, requireRole(['CHEF']))

// GET /api/chef/orders — view pending orders for own branch
router.get('/orders', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const orders = await prisma.order.findMany({
    where: {
      branchId,
      status: { in: ['PENDING', 'IN_PROGRESS'] }
    },
    include: {
      table: true,
      items: {
        include: { menuItem: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })
  res.json(orders)
})

// PATCH /api/chef/orders/:id/ready — mark order as ready
router.patch('/orders/:id/ready', async (req: Request, res: Response) => {
  const id = req.params['id'] as string

  const order = await prisma.order.update({
    where: { id },
    data: { status: 'READY' }
  })

  res.json({ message: 'Order marked as ready.', order })
})

// GET /api/chef/menu — view menu for own branch
router.get('/menu', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!

  const menu = await prisma.menuItem.findMany({
    where: { branchId },
    orderBy: { category: 'asc' }
  })
  res.json(menu)
})

// POST /api/chef/menu — add a new menu item
router.post('/menu', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!
  const { name, description, price, category } = req.body

  if (!name || !price || !category) {
    res.status(400).json({ error: 'name, price and category are required.' })
    return
  }

  const item = await prisma.menuItem.create({
    data: { name, description, price, category, branchId }
  })

  res.status(201).json({ message: 'Menu item created.', item })
})

// PUT /api/chef/menu/:id — update a menu item
router.put('/menu/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const { name, description, price, category } = req.body

  const item = await prisma.menuItem.update({
    where: { id },
    data: { name, description, price, category }
  })

  res.json({ message: 'Menu item updated.', item })
})

// PATCH /api/chef/menu/:id/availability — toggle item available/unavailable
router.patch('/menu/:id/availability', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const { isAvailable } = req.body

  const item = await prisma.menuItem.update({
    where: { id },
    data: { isAvailable }
  })

  res.json({ message: 'Availability updated.', item })
})

export default router