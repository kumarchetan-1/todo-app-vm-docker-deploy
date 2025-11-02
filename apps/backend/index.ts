import express from "express";
import { prismaClient } from "@repo/db/client";
import { signupSchema, signinSchema } from "@repo/zod/signup";
import bcrypt from "bcrypt";
import authMiddleware from '@repo/middlewares'
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv"

dotenv.config()

const app = express();
app.use(express.json());

app.get("/", async (req, res) => {
    const users = await prismaClient.user.findMany();
    res.json({
        users
    })
})

app.post("/signup", async (req, res) => {
    const { username, password, name } = req.body

    try {
        const validatedData = signupSchema.parse({ username, password, name })
        const hashedPassword = await bcrypt.hash(validatedData.password, 10)

        const user = await prismaClient.user.create({
            data: {
                username: validatedData.username,
                password: hashedPassword,
                name: validatedData.name
            }
        })

        res.json({
            message: "User created successfully",
            user
        })
    } catch (error) {
        res.json({
            error,
            message: "Unable to signup"
        })
    }
})


app.post("/signin", async (req, res) => {
    const { username, password } = req.body
    const validatedData = signinSchema.parse({ username, password })
    const userData = await prismaClient.user.findFirst({
        where: {
            username: validatedData.username,
        }
    })

    if (!userData) {
        res.send("User doesn't exist in the database")
        return
    }

    const isPasswordCorrect = await bcrypt.compare(validatedData.password, userData.password)

    if (!isPasswordCorrect) {
        res.send("Incorrect credentials")
    }

    if (!process.env.JWT_SECRET) {
        res.status(500).json({
            message: "JWT_SECRET is not configured"
        });
        return;
    }

    const token = jwt.sign({ userId: userData.id }, process.env.JWT_SECRET)
    res.json({
        message: "successfully signed in",
        token,
        userId: userData.id
    })
})


app.post("/todo", authMiddleware, async (req, res) => {
    // Get userId from authenticated token (set by auth middleware)
    if (!req.userId) {
        res.status(401).json({
            message: "User ID not found in token"
        });
        return;
    }

    const { status, task } = req.body
    const userId = String(req.userId); // Ensure userId is a string

    try {
        const todo = await prismaClient.todo.create({
            data: {
                task,
                status: status,
                userId: userId
            }
        })

        res.json({
            message: "Todo created successfully",
            todo
        })
    } catch (error) {
        res.status(500).json({
            error: error,
            message: "Failed to create todo"
        })
    }
})

app.get("/todos", authMiddleware, async (req, res) => {
    // Get userId from authenticated token (set by auth middleware)
    if (!req.userId) {
        res.status(401).json({
            message: "User ID not found in token"
        });
        return;
    }

    const userId = String(req.userId); // Ensure userId is a string

    try {
        const todos = await prismaClient.todo.findMany({
            where: {
                userId: userId
            }
        })

        res.json({
            todos: todos
        })
    } catch (error) {
        res.status(500).json({
            error: error,
            message: "Failed to fetch todos"
        })
    }
})

app.listen(3001, () => console.log("Server is running on port 3001"));