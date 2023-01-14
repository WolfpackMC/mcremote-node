export type AppRouter = typeof appRouter

import { client } from './redis'

import { z } from 'zod'

import { Log } from './log'

import { trpc as t } from './trpc'

import { prisma, verifyKey } from './util'

import { BigReactor } from '@prisma/client'

import { pollReactorData } from './prometheus'

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (ctx.token) {
    const sessions = await client.get(ctx.token)

    if (!sessions) {
      throw new Error('Not authorized')
    }

    ctx.res.setHeader('token', ctx.token)

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

      ctx.res.setHeader('token', ctx.uuid)

      ctx.token = token

      return next({
        ctx,
      })
    }
  }

  const key = ctx.req.headers.authorization

  console.log(ctx.req.headers)

  if (key) {
    // Strip "Bearer" from the key
    const apiKey = await verifyKey(key.toString().replace('Bearer ', ''))

    console.log(key)

    if (!apiKey) {
      throw new Error('Not authorized')
    }

    const account = await prisma.account.findUnique({
      where: {
        id: apiKey.accountId,
      },
    })

    if (!account) {
      throw new Error('Not authorized')
    }

    ctx.res.setHeader('token', ctx.uuid)

    await client.set(ctx.uuid, account.id)

    console.log('ye')

    ctx.token = ctx.uuid
    ctx.account = account
  } else {
    throw new Error('Not authorized')
  }

  return next({
    ctx,
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)

export const appRouter = t.router({
  ping: t.procedure
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
    .query(async ({ ctx }) => {
      return 'pong'
    }),
  getBRData: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const reactor = await prisma.bigReactor.findUnique({
        where: {
          id: input,
        },
        include: {
          Endpoint: true,
        },
      })

      if (!reactor) {
        throw new Error('Reactor not found')
      }

      return reactor
    }),
  updateBRReactor: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        summary: 'Update BR Reactor',
        description: 'Update BR Reactor',
        path: '/api/trpc/updateBRReactor',
        tags: ['br'],
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          active: z.boolean(),
          ambientTemperature: z.number(),
          apiVersion: z.string(),
          capacity: z.number(),
          producedLastTick: z.number(),
          stored: z.number(),
          casingTemperature: z.number(),
          connected: z.boolean(),
          controlRodCount: z.number(),
          fuelTemperature: z.number(),
          stackTemperature: z.number(),
          fuelBurnedLastTick: z.number(),
          fuelReactivity: z.number(),
          fuelWaste: z.number(),
          totalFuel: z.number(),
          insertionValue: z.number(),
        }),
      }),
    )
    .output(
      z.object({
        id: z.number(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const start_time = Date.now()

      const reactor = await prisma.bigReactor.findUnique({
        where: {
          id: input.id,
        },
        include: {
          Endpoint: true,
        },
      })

      console.log(input)

      if (!reactor) {
        console.log("Reactor not found")
        throw new Error('Reactor not found')
      }

      console.log(ctx.req.headers.token)

      const acc_id = await client.get(ctx.req.headers.token as string)

      if (reactor.Endpoint.accountId != parseInt(acc_id)) {
        console.log("Not authorized")
        throw new Error('Not authorized')
      }

      const { data } = input

      console.log(`Total fuel: ${data.totalFuel}`)
      console.log(`Insertion value: ${data.insertionValue}`)

      await prisma.bigReactor.update({
        where: {
          id: input.id,
        },
        data: {
          active: data.active,
          ambientTemperature: data.ambientTemperature,
          apiVersion: data.apiVersion,
          capacity: data.capacity,
          producedLastTick: data.producedLastTick,
          stored: data.stored,
          casingTemperature: data.casingTemperature,
          connected: data.connected,
          controlRodCount: data.controlRodCount,
          fuelTemperature: data.fuelTemperature,
          stackTemperature: data.stackTemperature,
          fuelBurnedLastTick: data.fuelBurnedLastTick,
          fuelReactivity: data.fuelReactivity,
          fuelWaste: data.fuelWaste,
          totalFuel: data.totalFuel,
          insertionValue: data.insertionValue,
          updatedAt: new Date(),
        },
      })

      const end_time = Date.now()

      Log.info(`Updated BR Reactor ${input.id} in ${end_time - start_time}ms`)

      return {
        id: input.id,
        message: 'Updated',
      }
    }),
  // Write a curl request to test this
  // curl -X POST -H "Content-Type: application/json" -d '{"input":{"data":{"test":"test"}}}' http://localhost:3002/api/trpc
  setRedstoneState: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        summary: 'Set redstone state',
        description: 'Set redstone state',
        path: '/api/trpc/setRedstoneState',
        tags: ['redstone'],
      },
    })
    .input(
      z.object({
        id: z.number(),
        state: z.boolean(),
      }),
    )
    .output(
      z.object({
        id: z.number(),
        state: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { state } = input

      try {
        const r = await prisma.redstone.update({
          where: {
            id: input.id,
          },
          data: {
            state: state,
          },
        })

        return r
      } catch (e) {
        Log.warn(e)
      }
    }),
  // Write a curl request to test this
  // curl -X POST -H "Content-Type: application/json" -d '{"input":{"state":true}}' http://localhost:3002/api/trpc

  getRedstoneState: protectedProcedure
    .input((val: unknown) => {
      if (typeof val === 'string') {
        return z.number().safeParse(val)
      }
      return z.number().safeParse(val)
    })
    .query(async ({ ctx, input }) => {
      if (input.success) {
        const r = await prisma.redstone.findUnique({
          where: {
            id: input.data,
          },
        })

        return r
      }
    }),
  redstoneWs: protectedProcedure.subscription(async ({ ctx }) => {
    return {
      async onSubscribe() {
        Log.info('Subscribed to redstoneWs')
      },
      async onNext() {
        const r = await prisma.redstone.findMany()

        return r
      },
      async onComplete() {
        Log.info('Unsubscribed from redstoneWs')
      },
    }
  }),
})
