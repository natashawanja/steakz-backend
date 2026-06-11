// Import Router from Express to create a modular route handler
import { Router } from 'express'

// Import Request and Response types for TypeScript type checking
import type { Request, Response } from 'express'

// Import bcrypt to hash passwords before saving to the database
import bcrypt from 'bcryptjs'

// Import Prisma client to interact with the database
import prisma from '../lib/prisma.js'

// Import auth middleware to protect routes
import { verifyToken, requireRole } from '../middleware/auth.js'

// Create a new Express router instance
const router = Router()

// Apply verifyToken and requireRole to ALL routes in this file
// Only logged in ADMIN users can access any admin route
router.use(verifyToken, requireRole(['ADMIN']))

// POST /api/admin/users — Create a new staff user
router.post('/users', async (req: Request, res: Response) => {

  // Destructure the required fields from the request body
  const { name, email, password, role, branchId } = req.body

  // Validate that all required fields are present
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'name, email, password and role are required.' })
    return
  }

  // Hash the plain text password before storing it in the database
  // 10 is the salt rounds — higher means more secure but slower
  const hashed = await bcrypt.hash(password, 10)

  try {
    // Create the new user in the database using Prisma
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, branchId: branchId || null }
    })

    // this code runs only if the user was created successfully — log this action in the audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER',
        targetId: user.id,
        targetType: 'User',
        performedBy: req.user!.id
      }
    })

    // Return 201 Created with the new user's ID
    res.status(201).json({ message: 'User created.', userId: user.id })
  } catch {
    // If the email already exists Prisma throws an error — return 409 Conflict
    res.status(409).json({ error: 'Email already in use.' })
  }
})

// GET /api/admin/users — Get all users in the system
router.get('/users', async (_req: Request, res: Response) => {

  // Fetch all users from the database
  // select only the fields we need — never return the password
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      branchId: true,
      createdAt: true,
      branch: { select: { name: true } } // Include the branch name for display
    },
    orderBy: { createdAt: 'desc' } // Show newest users first
  })

  // Send the users array as JSON response
  res.json(users)
})

// PATCH /api/admin/users/:id/role — Change a user's role
router.patch('/users/:id/role', async (req: Request, res: Response) => {

  // Get the user ID from the URL parameter
  const id = req.params['id'] as string

  // Get the new role from the request body
  const { role } = req.body

  // Validate that role is provided
  if (!role) {
    res.status(400).json({ error: 'role is required.' })
    return
  }

  // Update the user's role in the database
  await prisma.user.update({ where: { id }, data: { role } })

  // Log this role change action in the audit log
  await prisma.auditLog.create({
    data: {
      action: 'CHANGE_ROLE',
      targetId: id,
      targetType: 'User',
      performedBy: req.user!.id
    }
  })
  // Confirm the update was successful
  res.json({ message: 'Role updated.' })
})

// PATCH /api/admin/users/:id/activate — Reactivate a deactivated user
router.patch('/users/:id/activate', async (req: Request, res: Response) => {

  // Get the user ID from the URL parameter
  const id = req.params['id'] as string

  // Set isActive to true in the database
  await prisma.user.update({ where: { id }, data: { isActive: true } })

  // Log this activation action in the audit log
  await prisma.auditLog.create({
    data: {
      action: 'ACTIVATE_USER',
      targetId: id,
      targetType: 'User',
      performedBy: req.user!.id
    }
  })
  // Confirm the activation
  res.json({ message: 'User activated.' })
})

// PATCH /api/admin/users/:id/terminate — Deactivate a user without deleting them
router.patch('/users/:id/terminate', async (req: Request, res: Response) => {

  // Get the user ID from the URL parameter
  const id = req.params['id'] as string

  // Set isActive to false — user cannot log in but data is preserved
  await prisma.user.update({ where: { id }, data: { isActive: false } })

  // Log this deactivation action in the audit log
  await prisma.auditLog.create({
    data: {
      action: 'DEACTIVATE_USER',
      targetId: id,
      targetType: 'User',
      performedBy: req.user!.id
    }
  })

  // Confirm the deactivation
  res.json({ message: 'User deactivated.' })
})

// POST /api/admin/branches — Create a new branch
router.post('/branches', async (req: Request, res: Response) => {

  // Destructure branch details from the request body
  const { name, address, city } = req.body

  // Validate that all required fields are present
  if (!name || !address || !city) {
    res.status(400).json({ error: 'name, address and city are required.' })
    return
  }

  // Create the new branch in the database
  const branch = await prisma.branch.create({
    data: { name, address, city }
  })

  // Log this branch creation action in the audit log
  await prisma.auditLog.create({
    data: {
      action: 'CREATE_BRANCH',
      targetId: branch.id,
      targetType: 'Branch',
      performedBy: req.user!.id
    }
  })

  // Return 201 Created with the new branch's ID
  res.status(201).json({ message: 'Branch created.', branchId: branch.id })
})

// GET /api/admin/branches — Get all branches
router.get('/branches', async (_req: Request, res: Response) => {

  // Fetch all branches ordered alphabetically by name
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' }
  })

  // Send the branches array as JSON response
  res.json(branches)
})

// PUT /api/admin/branches/:id — Update an existing branch
router.put('/branches/:id', async (req: Request, res: Response) => {

  // Get the branch ID from the URL parameter
  const id = req.params['id'] as string

  // Destructure the fields to update from the request body
  const { name, address, city, isActive } = req.body

  // Update the branch record in the database
  await prisma.branch.update({
    where: { id },
    data: { name, address, city, isActive }
  })

  // Confirm the update was successful
  res.json({ message: 'Branch updated.' })
})

// GET /api/admin/audit-log — Get all audit log entries
router.get('/audit-log', async (_req: Request, res: Response) => {

  // Fetch all audit logs ordered by newest first
  // Include the user's name and role for each log entry
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, role: true } }
    }
  })

  // Send the logs array as JSON response
  res.json(logs)
})

// POST /api/admin/promotions — Create a new promotion
router.post('/promotions', async (req: Request, res: Response) => {

  // Destructure promotion details from the request body
  const { code, discount, startDate, endDate, branchId } = req.body

  // Validate that all required fields are present
  if (!code || !discount || !startDate || !endDate) {
    res.status(400).json({ error: 'code, discount, startDate and endDate are required.' })
    return
  }

  try {
    // Create the promotion in the database
    // Convert startDate and endDate strings to JavaScript Date objects
    const promo = await prisma.promotion.create({
      data: {
        code,
        discount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        branchId: branchId || null // null means the promo applies to all branches
      }
    })
    // Log this promotion creation action in the audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_PROMOTION',
        targetId: promo.id,
        targetType: 'Promotion',
        performedBy: req.user!.id
      }
    })

    // Return 201 Created with the new promotion's ID
    res.status(201).json({ message: 'Promotion created.', promoId: promo.id })
  } catch {
    // If the promo code already exists Prisma throws an error — return 409 Conflict
    res.status(409).json({ error: 'Promotion code already exists.' })
  }
})

// Export the router so it can be used in index.ts
export default router