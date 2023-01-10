import { Account } from '@prisma/client'
import { inferAsyncReturnType } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'

import crypto from 'crypto'

export const createContext = async ({
  req,
  res,
}: CreateExpressContextOptions) => {
  // random uuid with crypto
  const uuid = crypto.randomBytes(16).toString('hex')

  let account: Account | null = null

  let token: string | null = null

  return {
    uuid,
    req,
    res,
    account,
    token,
  }
}

export type Context = inferAsyncReturnType<typeof createContext>
