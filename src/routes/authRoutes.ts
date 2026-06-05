import { Router } from 'express'
import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret'

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { branch: true }
  })

  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials.' })
    return
  }

  const match = await bcrypt.compare(password, user.password)

  if (!match) {
    res.status(401).json({ error: 'Invalid credentials.' })
    return
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name ?? null,
      branchIsMain: user.branch?.isMain ?? false
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name ?? null,
      branchIsMain: user.branch?.isMain ?? false
    }
  })
})

// GET /api/auth/me
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      branch: {
        select: { name: true, isMain: true }
      }
    }
  })
  res.json({
    ...user,
    branchName: (user as any)?.branch?.name ?? null,
    branchIsMain: (user as any)?.branch?.isMain ?? false
  })
})

export default router