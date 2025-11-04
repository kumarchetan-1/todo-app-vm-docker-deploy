import { prismaClient } from "@repo/db/client";

export const dynamic = 'force-dynamic'

export default async function Home() {
   const todos = await prismaClient.todo.findMany()

  return <>
      { JSON.stringify(todos) }
  </>

}

// export const revalidate = 60 // revalidate after 60 seconds
//  or
// export const dynamic = 'force-dynamic'
