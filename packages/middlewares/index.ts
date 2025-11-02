import jwt from "jsonwebtoken"
import type { Request, Response, NextFunction } from 'express'

// Extend Express Request type to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string | number;
        }
    }
}

export default function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    
    if (!authHeader) {
        res.status(401).json({
            message: "Authorization header is missing"
        });
        return;
    }

    // Check if Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            message: "Invalid authorization header format. Expected 'Bearer <token>'"
        });
        return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({
            message: "Token is not provided"
        });
        return;
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        res.status(500).json({
            message: "JWT_SECRET not set in environment"
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        
        // Extract userId from token payload
        if (decoded.userId) {
            req.userId = decoded.userId;
            next();
        } else {
            res.status(401).json({
                message: "Invalid token: userId not found in payload"
            });
        }
    } catch (error) {
        // JWT errors should yield 401, not 500
        res.status(401).send("Invalid or expired token");
    }
}