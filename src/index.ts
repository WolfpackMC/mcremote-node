import cors from 'cors'
import * as trpcExpress from '@trpc/server/adapters/express'
import express, { Application } from 'express'
import 'colorts/lib/string'
import * as dotenv from 'dotenv'

import { generateOpenApiDocument, OpenApiMeta } from 'trpc-openapi'
import { Context, createContext } from './context'

import { Log } from './log'

import { EventEmitter } from 'events'

const ee = new EventEmitter()

import jwt from 'jsonwebtoken'

import { createOpenApiExpressMiddleware } from 'trpc-openapi'

import swaggerUi from 'swagger-ui-express'

import { appRouter } from './router'

dotenv.config()

const app: Application = express()

const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'tRPC OpenAPI',
  version: '1.0.0',
  baseUrl: 'http://localhost:3002',
})

app.use(express.json())
Log.info('Express JSON parser enabled')
app.use(cors())
Log.info('Express CORS enabled')

app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({ router: appRouter, createContext }),
)
Log.info('TRPC middleware enabled')

app.use(
  '/api',
  createOpenApiExpressMiddleware({ router: appRouter, createContext }),
)

app.use('/api-docs', swaggerUi.serve)

app.get('/api-docs', swaggerUi.setup(openApiDocument))

app.on('error', err => {
  Log.error(err.toString())
})

app.listen(3002, () => {
  Log.success('Server started on port 3002')
})
