// Import Request, Response, NextFunction types from Express
import type { Request, Response, NextFunction } from 'express'

// Import jsonwebtoken to create and verify JWT tokens
import jwt from 'jsonwebtoken'

// Extend Express Request to include our custom user object
// This lets us access req.user in any route after token verification
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string            // Logged in user's ID
        role: string          // User's role e.g. ADMIN, WAITER, CHEF
        branchId: string | null  // User's branch — null for ADMIN and HM
      }
    }
  }
}

// Read JWT secret from .env — falls back to 'dev-secret' locally
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret'

// Middleware to check if the user is logged in before accessing a route
export function verifyToken(
  req: Request,       // Incoming request from the frontend
  res: Response,      // Response we send back
  next: NextFunction  // Moves to the next middleware or route
): void {

  // Read the Authorization header from the request
  const header = req.headers['authorization']

  // Reject if header is missing or not in Bearer format
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided.' })
    return
  }

  try {
    // Remove 'Bearer ' and verify the token using the secret key
    const decoded = jwt.verify(header.split(' ')[1]!, JWT_SECRET) as {
      id: string
      role: string
      branchId: string | null
    }

    // Attach decoded user data to the request so routes can use req.user
    req.user = decoded

    // Move on to the actual route handler
    next()

  } catch {
    // Token is fake, tampered or expired — reject the request
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// Middleware to restrict a route to specific roles only
// Usage: requireRole(['ADMIN']) or requireRole(['CHEF', 'BM'])
export function requireRole(roles: string[]) {

  return (req: Request, res: Response, next: NextFunction): void => {

    // Block if user is not logged in
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' })
      return
    }

    // Block if user's role is not in the allowed roles list
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied.' })
      return
    }

    // User is authenticated and has the correct role — allow through
    next()
  }
}