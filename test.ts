import WebSocket from 'ws'

const ws = new WebSocket('ws://127.0.0.1:3002/api/trpc/redstoneWs')

ws.on('open', () => {
  console.log('connected')
})

ws.on('redstone', data => {
  console.log(data)
})
