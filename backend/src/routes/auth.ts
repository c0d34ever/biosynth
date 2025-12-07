import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getPool } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const generateToken = (userId: number, role: string): string => {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  return jwt.sign({ userId, role }, secret, { expiresIn: '7d' });
};

// Register
router.post('/register', async (req, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const pool = getPool();

    // Check if user exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [data.email]
    ) as any[];

    if (existing.length > 0) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [data.email, passwordHash, data.name || null, 'user']
    ) as any[];

    const userId = result.insertId;
    const token = generateToken(userId, 'user');

    res.status(201).json({
      token,
      user: {
        id: userId,
        email: data.email,
        name: data.name,
        role: 'user'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const pool = getPool();

    const [users] = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = ?',
      [data.email]
    ) as any[];

    if (users.length === 0) {
      res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'No user found with this email. Please register first or check your email.'
      });
      return;
    }

    const user = users[0];
    
    // Check if password_hash exists (shouldn't happen, but safety check)
    if (!user.password_hash) {
      res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'User account is corrupted. Please contact administrator.'
      });
      return;
    }

    const isValid = await bcrypt.compare(data.password, user.password_hash);

    if (!isValid) {
      res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Incorrect password. Please try again.'
      });
      return;
    }

    const token = generateToken(user.id, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    throw error;
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [req.userId]
    ) as any[];

    if (users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = users[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at
    });
  } catch (error) {
    throw error;
  }
});

export { router as authRouter };

