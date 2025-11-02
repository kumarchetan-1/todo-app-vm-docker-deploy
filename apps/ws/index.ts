import { WebSocketServer, WebSocket } from "ws"
import { prismaClient } from "@repo/db/client"
import jwt from "jsonwebtoken"
import * as dotenv from "dotenv"

dotenv.config()

// Extend WebSocket to store userId
interface AuthenticatedWebSocket extends WebSocket {
    userId?: string
}

const wss = new WebSocketServer({ port: 8080 })

wss.on("connection", (ws: AuthenticatedWebSocket, req) => {
    // Extract token from Authorization header during WebSocket upgrade
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        ws.send(JSON.stringify({
            type: "error",
            message: "Authorization header is missing or invalid"
        }))
        ws.close()
        return
    }

    const token = authHeader.split(' ')[1] || " "
    const JWT_SECRET = process.env.JWT_SECRET

    if (!JWT_SECRET) {
        ws.send(JSON.stringify({
            type: "error",
            message: "JWT_SECRET not configured"
        }))
        ws.close()
        return
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
        console.log("Decoded ",decoded.userId)

        if (decoded.userId) {
            ws.userId = String(decoded.userId)
        } else {
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid token: userId not found"
            }))
            ws.close()
            return
        }
    } catch (error) {
        ws.send(JSON.stringify({
            type: "error",
            message: "Invalid or expired token"
        }))
        ws.close()
        return
    }

    ws.on("message", async (data) => {
        try {
            const msg = JSON.parse(data.toString())
            
            if (!ws.userId) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "User not authenticated"
                }))
                return
            }

            const userId = ws.userId
            
            if(msg.type === "add_todo" && typeof msg.task==="string"){
                // Accept status from message if provided, otherwise default to false
                const status = typeof msg.status === "boolean" ? msg.status : false
                
                const todo = await prismaClient.todo.create({
                    data:{
                        userId,
                        task: msg.task,
                        status: status
                    }
                })
    
                // Broadcast to all clients belonging to the same user
                wss.clients.forEach((client: AuthenticatedWebSocket) => {
                    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
                        client.send(JSON.stringify({
                            type: "todo_added",
                            todo
                        }))
                    }
                });
    
            } else if(msg.type === "get_todos"){
                const todos = await prismaClient.todo.findMany({
                    where: {
                        userId
                    }
                })
    
                ws.send(
                   JSON.stringify({
                     type: "todos_list",
                     todos
                   })
                )
            }
        } catch (error) {
            ws.send(JSON.stringify({
                error: error,
                message: "Server Error or invalid request"
            }))
        }
    })
})