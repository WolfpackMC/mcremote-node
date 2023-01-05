import { createClient } from 'redis'
import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import cors from 'cors'
import * as trpcExpress from '@trpc/server/adapters/express'
import express, { Application } from 'express'
import 'colorts/lib/string'
import { inferAsyncReturnType } from '@trpc/server/dist/deprecated/router'
import * as dotenv from 'dotenv'
import crypto from 'crypto'

import jwt from 'jsonwebtoken'

import { createOpenApiExpressMiddleware } from 'trpc-openapi'

import swaggerUi from 'swagger-ui-express'

import { Account, ApiKey, PrismaClient } from '@prisma/client'

dotenv.config()

const log_prefix = () => {
    const prefix = `[${new Date().toLocaleTimeString()}] 📄`.gray
    return prefix
}

class Log {
    static info(message: string) {
        console.log(`${log_prefix()} ${'INFO'.green} ${message}`.green)
    }

    static error(message: string) {
        console.log(`${log_prefix()} ${'ERROR'.red} ${message}`.red)
    }

    static warn(message: string) {
        console.log(`${log_prefix()} ${'WARN'.yellow} ${message}`.yellow)
    }

    static debug(message: string) {
        console.log(`${log_prefix()} ${'DEBUG'.blue} ${message}`.blue)
    }

    static trace(message: string) {
        console.log(`${log_prefix()} ${'TRACE'.cyan} ${message}`.cyan)
    }

    static fatal(message: string) {
        console.log(`${log_prefix()} ${'FATAL'.red} ${message}`.red)
    }

    static success(message: string) {
        console.log(`${log_prefix()} ${'SUCCESS'.green} ${message}`.green)
    }

    static log(message: string) {
        console.log(`${log_prefix()} ${message}`)
    }
}

const pepper = () => process.env.PEPPER as string

if (!pepper()) {
    Log.fatal('PEPPER environment variable not set')
    process.exit(1)
}

const crypt = async (pepper: string, salt: Uint8Array, password: string) => {
    return await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pepper + salt + password))
}

const prisma = new PrismaClient()

Log.info("We have a new Prisma client 🙏")

const verifyKey = async (key: string) => {
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

        const saltBuffer = Buffer.from(salt, "base64")
        const hashed_passwordBuffer = Buffer.from(hashed_password, "base64")

        // Convert saltBuffer to uint8array
        const saltUint8Array = new Uint8Array(saltBuffer)

        const hash = await crypt(pepper(), saltUint8Array, key)

        const hashBuffer = Buffer.from(hash)

        if (hashBuffer.equals(hashed_passwordBuffer)) {
            return apiKey
        }
    }
}

const createContext = async ({
        req,
        res,
    }: trpcExpress.CreateExpressContextOptions) => {
        
        // random uuid with crypto
        const uuid = crypto.randomBytes(16).toString('hex')

        res.setHeader('x-request-id', uuid)

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

type Context = inferAsyncReturnType<typeof createContext>

import { generateOpenApiDocument, OpenApiMeta } from 'trpc-openapi'

const t = initTRPC
    .context<Context>()
    .meta<OpenApiMeta>()
    .create()


// Validate redis connection

const app: Application = express()


const client = createClient()

client.on('error', (err) => {
    Log.error('Redis error: ' + err)
})

client.on('connect', () => {
    Log.info('Redis connected')
})

client.on('ready', () => {
    Log.info('Redis ready')
})

client.on('reconnecting', () => {
    Log.info('Redis reconnecting')
})

client.on('end', () => {
    Log.info('Redis disconnected')
})

client.connect()

export type AppRouter = typeof appRouter

export const trpc = t

const isAuthed = t.middleware(async ({ctx, next}) => {

    if (ctx.token) {

        const sessions = await client.get(ctx.token)

        if (!sessions) {
            throw new Error('Not authorized')
        }
    
        return next({
            ctx,
        })
    } else {
        const token: string = ctx.req.headers.token as string

        if (token) {
            const sessions = await client.get(token.toString())

            if (!sessions) {
                throw new Error('Not authorized')
            }

            ctx.token = token

            return next({
                ctx,
            })
        }
    }

    const key = ctx.req.headers.authorization

    if (key) {
        const apiKey = await verifyKey(key)


        if (!apiKey) {
            throw new Error('Not authorized')
        }

        const account = await prisma.account.findUnique({
            where: {
                id: apiKey.accountId
            }
        })

        if (!account) {
            throw new Error('Not authorized')
        }

        const res = await client.get(ctx.uuid)

        // Assert that res is a type of string[]
        if (!res) {
            await client.set(ctx.uuid, key)
            ctx.res.setHeader('token', ctx.uuid)
        } else {
            ctx.res.setHeader('token', res)
        }

        ctx.token = ctx.uuid
        ctx.account = account
    } else {
        throw new Error('Not authorized')
    }

    return next({
        ctx,
    })
})

const protectedProcedure = t.procedure.use(isAuthed)

const appRouter = t.router({
    ping:
        t.procedure
            .meta({
                openapi: {
                    method: 'GET',
                    summary: 'Ping!',
                    description: 'Ping!',
                    path: '/api/trpc/ping',
                    tags: ['ping'],
                },
            })
            .input(z.void())
            .output(z.string())
            .query(async ({ctx}) => {
                return 'pong'
            }),
    setRedstoneState:
        protectedProcedure
            .meta({
                openapi: {
                    method: 'POST',
                    summary: 'Set redstone state',
                    description: 'Set redstone state',
                    path: '/api/trpc/setRedstoneState',
                    tags: ['redstone'],
                },
            })
            .input(z.object({
                id: z.number(),
                state: z.boolean()
            }))
            .output(z.object({
                id: z.number(),
                state: z.boolean()
            }))
            .mutation(async ({ctx, input}) => {

                const { state } = input

                try {
                    const r = await prisma.redstone.update({
                        where: {
                            id: input.id
                        },
                        data: {
                            state: state
                        }
                    })

                    return r
                } catch (e) {
                    Log.warn(e)
                }
            }),
                // Write a curl request to test this
                // curl -X POST -H "Content-Type: application/json" -d '{"input":{"state":true}}' http://localhost:3002/api/trpc

    getRedstoneState:
        protectedProcedure
            .input((val: unknown) => {
                if (typeof val === 'string') {
                    return z.number().safeParse(val)
                }
                return z.number().safeParse(val)
            })
            .query(async ({ctx, input}) => {
                if (input.success) {
                    const r = await prisma.redstone.findUnique({
                        where: {
                            id: input.data
                        }
                    })

                    return r
                }
            }),
        })

const openApiDocument = generateOpenApiDocument(appRouter, {
    title: 'tRPC OpenAPI',
    version: '1.0.0',
    baseUrl: 'http://localhost:3002',
})

app.use(express.json())
Log.info('Express JSON parser enabled')
app.use(cors())
Log.info('Express CORS enabled')

app.use('/api/trpc', trpcExpress.createExpressMiddleware({ router: appRouter, createContext }))
Log.info('TRPC middleware enabled')

app.use('/api', createOpenApiExpressMiddleware({router: appRouter, createContext }))

app.use('/api-docs', swaggerUi.serve)

app.get('/api-docs', swaggerUi.setup(openApiDocument))

app.on('error', (err) => {
    Log.error(err.toString())
})

app.addListener('close', async () => {
    Log.info('Server closed')
    await client.quit()
})

app.listen(3002, () => {
    Log.success('Server started on port 3002')
})