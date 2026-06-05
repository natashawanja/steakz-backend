import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: string
        branchId: string | null
      }
    }
  }
}

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret'

export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers['authorization']

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided.' })
    return
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1]!, JWT_SECRET) as {
      id: string
      role: string
      branchId: string | null
    }
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied.' })
      return
    }
    next()
  }
}