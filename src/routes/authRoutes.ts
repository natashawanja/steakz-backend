// Import Router from Express to create a modular route handler
import { Router } from 'express'

// Import Request and Response types for TypeScript type checking
import type { Request, Response } from 'express'

// Import bcrypt to hash and compare passwords securely
import bcrypt from 'bcryptjs'

// Import jsonwebtoken to generate JWT tokens after successful login
import jwt from 'jsonwebtoken'

// Import Prisma client to query the database
import prisma from '../lib/prisma.js'

// Import verifyToken middleware to protect the /me route
import { verifyToken } from '../middleware/auth.js'

// Create a new Express router instance for auth routes
const router = Router()

// Read the JWT secret from environment variables — falls back to 'dev-secret' locally
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret'

// POST /api/auth/login — Log in a staff user and return a JWT token
router.post('/login', async (req: Request, res: Response) => {

  // Destructure email and password from the request body
  const { email, password } = req.body

  // Validate that both email and password are provided
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' })
    return
  }

  // Look up the user in the database by email
  // Also include their branch details so we can add branch info to the token
  const user = await prisma.user.findUnique({
    where: { email },
    include: { branch: true }
  })

  // Reject if user does not exist or their account has been deactivated
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials.' })
    return
  }

  // Compare the plain text password with the hashed password in the database
  // bcrypt.compare returns true if they match, false if they do not
  const match = await bcrypt.compare(password, user.password)

  // Reject if the password is incorrect
  if (!match) {
    res.status(401).json({ error: 'Invalid credentials.' })
    return
  }

  // Create a JWT token containing the user's key information
  // This token is sent to the frontend and used for all future requests
  const token = jwt.sign(
    {
      id: user.id,                           // User's unique ID
      role: user.role,                       // User's role e.g. ADMIN, WAITER
      branchId: user.branchId,               // Branch the user belongs to
      branchName: user.branch?.name ?? null, // Branch name for display in the UI
      branchIsMain: user.branch?.isMain ?? false // Whether this is the main branch
    },
    JWT_SECRET,        // Sign the token with our secret key
    { expiresIn: '7d' } // Token expires after 7 days
  )

  // Send the token and user details back to the frontend
  // The frontend stores the token and sends it with every future request
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

// GET /api/auth/me — Get the currently logged in user's details
// verifyToken runs first to make sure the user is authenticated
router.get('/me', verifyToken, async (req: Request, res: Response) => {

  // Find the user in the database using the ID from the verified token
  // req.user is set by the verifyToken middleware
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      branch: {
        select: { name: true, isMain: true } // Include branch name and isMain flag
      }
    }
  })

  // Send back the user object with branch name and isMain flattened to the top level
  // The spread operator (...user) copies all user fields into the response
  res.json({
    ...user,
    branchName: (user as any)?.branch?.name ?? null,
    branchIsMain: (user as any)?.branch?.isMain ?? false
  })
})

// Export the router so it can be registered in index.ts
export default router