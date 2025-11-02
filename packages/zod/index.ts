import { z } from "zod";

export const signupSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(8),
    name: z.string().min(1)
})

export const signinSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(8)
})