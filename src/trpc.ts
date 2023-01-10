import { initTRPC } from '@trpc/server'
import { OpenApiMeta } from 'trpc-openapi'
import { Context } from './context'

const t = initTRPC.context<Context>().meta<OpenApiMeta>().create()

export const trpc = t
