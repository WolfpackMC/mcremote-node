import { createClient } from 'redis'
import { Log } from './log'

export const client = createClient()

client.on('error', err => {
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
