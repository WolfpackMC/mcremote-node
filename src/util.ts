import { PrismaClient } from '@prisma/client'

import { Log } from './log'

export const prisma = new PrismaClient()

import crypto from 'crypto'

Log.info('We have a new Prisma client 🙏')

export const pepper = () => process.env.PEPPER as string

if (!pepper()) {
  Log.fatal('PEPPER environment variable not set')
  process.exit(1)
}

export const crypt = async (
  pepper: string,
  salt: Uint8Array,
  password: string,
) => {
  return await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(pepper + salt + password),
  )
}

export const verifyKey = async (key: string) => {
  // // Decode the salt from base64
  // const saltBuffer = Buffer.from(salt, "base64")
  // const hashed_passwordBuffer = Buffer.from(hashed_password, "base64")

  // // Convert saltBuffer to uint8array
  // const saltUint8Array = new Uint8Array(saltBuffer)

  // const hash = await crypt(pepper(), saltUint8Array, key)

  // const hashBuffer = Buffer.from(hash)

  // return hashBuffer.equals(hashed_passwordBuffer)

  // Loop through each api_key in the database and compare the hash to the key with the algorithm above
  const keys = await prisma.apiKey.findMany()

  for (const apiKey of keys) {
    const [salt, hashed_password] = apiKey.key.split('$')

    const saltBuffer = Buffer.from(salt, 'base64')
    const hashed_passwordBuffer = Buffer.from(hashed_password, 'base64')

    // Convert saltBuffer to uint8array
    const saltUint8Array = new Uint8Array(saltBuffer)

    const hash = await crypt(pepper(), saltUint8Array, key)

    const hashBuffer = Buffer.from(hash)

    if (hashBuffer.equals(hashed_passwordBuffer)) {
      return apiKey
    }
  }
}
