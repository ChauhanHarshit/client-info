import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';

// JWT Configuration
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '8h'; // 8 hours for better user experience
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// User type definitions
export interface JWTPayload {
  id: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  accessLevel: string;
  massAccess: boolean;
  teamId: string | null;
  type: 'employee' | 'creator';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Generate JWT tokens
export function generateTokens(user: any, type: 'employee' | 'creator' = 'employee'): AuthTokens {
  const payload: JWTPayload = {
    id: user.id,
    username: user.username,
    email: user.email || user.username,
    firstName: user.first_name || user.firstName || 'User',
    lastName: user.last_name || user.lastName || '',
    accessLevel: user.mass_access || user.massAccess ? 'admin' : 'employee',
    massAccess: !!(user.mass_access || user.massAccess),
    teamId: user.team_id || user.teamId || null,
    type
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });

  const refreshToken = jwt.sign(
    { id: payload.id, username: payload.username, type },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

// Verify access token
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): { id: string; username?: string; type: string } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string; username?: string; type: string };
  } catch (error) {
    return null;
  }
}

// Set authentication cookies
export function setAuthCookies(res: Response, tokens: AuthTokens, type: 'employee' | 'creator' = 'employee') {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  };

  // Set access token cookie
  res.cookie(`${type}_access_token`, tokens.accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  // Set refresh token cookie
  res.cookie(`${type}_refresh_token`, tokens.refreshToken, cookieOptions);
}

// Clear authentication cookies
export function clearAuthCookies(res: Response, type: 'employee' | 'creator' = 'employee') {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
  };

  res.clearCookie(`${type}_access_token`, cookieOptions);
  res.clearCookie(`${type}_refresh_token`, cookieOptions);
  
  // Also clear old session cookies for cleanup
  res.clearCookie('connect.sid', cookieOptions);
  res.clearCookie('tasty_session', cookieOptions);
}

// Authentication middleware
export function authenticateToken(type: 'employee' | 'creator' = 'employee') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from cookie or Authorization header
      let accessToken = req.cookies[`${type}_access_token`];
      
      // Fallback to Authorization header
      if (!accessToken) {
        const authHeader = req.headers['authorization'];
        accessToken = authHeader && authHeader.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : null;
      }

      if (!accessToken) {
        return res.status(401).json({ 
          message: 'Not authenticated',
          sessionValid: false,
          requiresLogin: true
        });
      }

      // Verify access token
      const payload = verifyAccessToken(accessToken);
      if (!payload || payload.type !== type) {
        // Try to refresh token if access token is invalid
        const refreshToken = req.cookies[`${type}_refresh_token`];
        if (!refreshToken) {
          return res.status(401).json({ 
            message: 'Not authenticated',
            sessionValid: false,
            requiresLogin: true
          });
        }

        // Verify refresh token
        const refreshPayload = verifyRefreshToken(refreshToken);
        if (!refreshPayload || refreshPayload.type !== type) {
          return res.status(401).json({ 
            message: 'Invalid refresh token',
            sessionValid: false,
            requiresLogin: true
          });
        }

        // Get fresh user data from database
        const { queryDb } = await import('../db');
        let user;
        
        if (type === 'employee') {
          const users = await queryDb('SELECT * FROM users WHERE id = $1', [refreshPayload.id]);
          user = users[0];
        } else {
          const creators = await queryDb(`
            SELECT c.*, cl.username, cl.password 
            FROM creators c
            JOIN creator_logins cl ON c.id = cl.creator_id
            WHERE c.id = $1
          `, [refreshPayload.id]);
          user = creators[0];
        }

        if (!user) {
          return res.status(401).json({ 
            message: 'User not found',
            sessionValid: false,
            requiresLogin: true
          });
        }

        // Generate new tokens
        const newTokens = generateTokens(user, type);
        setAuthCookies(res, newTokens, type);

        // Attach user to request
        (req as any).user = {
          ...user,
          type
        };
      } else {
        // Token is valid, attach payload to request
        (req as any).user = payload;
      }

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ 
        message: 'Authentication failed',
        sessionValid: false,
        requiresLogin: true
      });
    }
  };
}

// Password hashing utility
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Password comparison utility
export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}