import { createTRPCProxyClient } from '@trpc/client'
import { httpBatchLink } from '@trpc/client/links/httpBatchLink'
import { createWSClient, wsLink } from '@trpc/client/links/wsLink'
import { AppRouter } from './router'
// create persistent WebSocket connection
const wsClient = createWSClient({
  url: `ws://localhost:3001`,
})
