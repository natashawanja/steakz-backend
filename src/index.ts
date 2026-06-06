import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import waiterRoutes from './routes/waiterRoutes.js'
import chefRoutes from './routes/chefRoutes.js'
import cashierRoutes from './routes/cashierRoutes.js'
import bmRoutes from './routes/bmRoutes.js'
import hmRoutes from './routes/hmRoutes.js'
import publicRoutes from './routes/publicRoutes.js'
import { seedDatabase } from './lib/seed.js'

const app = express()
const port = process.env['PORT'] || 3001

app.use(cors({
  origin: [
    process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
    'https://frontend-eight-beige-83.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/waiter', waiterRoutes)
app.use('/api/chef', chefRoutes)
app.use('/api/cashier', cashierRoutes)
app.use('/api/bm', bmRoutes)
app.use('/api/hm', hmRoutes)
app.use('/api/public', publicRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Steakz API is running' })
})

app.listen(port, async () => {
  await seedDatabase()
  console.log(`✅ Backend running on http://localhost:${port}`)
})