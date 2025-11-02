import { prismaClient } from "@repo/db/client";

export default async function Home() {
   const todos = await prismaClient.todo.findMany()

  return <>
      { JSON.stringify(todos) }
  </>

}
