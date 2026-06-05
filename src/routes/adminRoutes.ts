import { Router } from 'express'
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(verifyToken, requireRole(['ADMIN']))

// POST /api/admin/users
router.post('/users', async (req: Request, res: Response) => {
  const { name, email, password, role, branchId } = req.body

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'name, email, password and role are required.' })
    return
  }

  const hashed = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, branchId: branchId || null }
    })
    res.status(201).json({ message: 'User created.', userId: user.id })
  } catch {
    res.status(409).json({ error: 'Email already in use.' })
  }
})

// GET /api/admin/users
router.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      branchId: true,
      createdAt: true,
      branch: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json(users)
})

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const { role } = req.body

  if (!role) {
    res.status(400).json({ error: 'role is required.' })
    return
  }

  await prisma.user.update({ where: { id }, data: { role } })
  res.json({ message: 'Role updated.' })
})

// PATCH /api/admin/users/:id/activate
router.patch('/users/:id/activate', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  await prisma.user.update({ where: { id }, data: { isActive: true } })
  res.json({ message: 'User activated.' })
})

// PATCH /api/admin/users/:id/terminate
router.patch('/users/:id/terminate', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  res.json({ message: 'User deactivated.' })
})

// POST /api/admin/branches
router.post('/branches', async (req: Request, res: Response) => {
  const { name, address, city } = req.body

  if (!name || !address || !city) {
    res.status(400).json({ error: 'name, address and city are required.' })
    return
  }

  const branch = await prisma.branch.create({
    data: { name, address, city }
  })
  res.status(201).json({ message: 'Branch created.', branchId: branch.id })
})

// GET /api/admin/branches
router.get('/branches', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' }
  })
  res.json(branches)
})

// PUT /api/admin/branches/:id
router.put('/branches/:id', async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const { name, address, city, isActive } = req.body

  await prisma.branch.update({
    where: { id },
    data: { name, address, city, isActive }
  })
  res.json({ message: 'Branch updated.' })
})

// GET /api/admin/audit-log
router.get('/audit-log', async (_req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, role: true } }
    }
  })
  res.json(logs)
})

// POST /api/admin/promotions
router.post('/promotions', async (req: Request, res: Response) => {
  const { code, discount, startDate, endDate, branchId } = req.body

  if (!code || !discount || !startDate || !endDate) {
    res.status(400).json({ error: 'code, discount, startDate and endDate are required.' })
    return
  }

  try {
    const promo = await prisma.promotion.create({
      data: {
        code,
        discount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        branchId: branchId || null
      }
    })
    res.status(201).json({ message: 'Promotion created.', promoId: promo.id })
  } catch {
    res.status(409).json({ error: 'Promotion code already exists.' })
  }
})

export default router