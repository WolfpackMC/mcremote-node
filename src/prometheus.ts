import promClient from 'prom-client'
import { Log } from './log'

import { prisma } from './util'

const collectDefaultMetrics = promClient.collectDefaultMetrics
const Registry = promClient.Registry
const register = new Registry()
collectDefaultMetrics({ register })

export const metrics = async () => {
  const metrics = await register.metrics()
  return metrics
}

const reactorMetricData: any = {}

let reactor_length = 0

const registerReactorData = async () => {
  Log.info('Polling reactor data')
  const reactors = await prisma.bigReactor.findMany()
  reactor_length = reactors.length

  for (const reactor of reactors) {
    const prefix = `reactor_${reactor.id}_`
    const ambientTemperature = new promClient.Histogram({
      name: `${prefix}ambient_temperature`,
      help: 'Ambient temperature',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    ambientTemperature.observe(
      { reactor_id: reactor.id },
      reactor.ambientTemperature,
    )

    const energy_stored = new promClient.Histogram({
      name: `${prefix}energy_stored`,
      help: 'Energy stored',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    energy_stored.observe({ reactor_id: reactor.id }, reactor.stored)

    const energy_produced = new promClient.Histogram({
      name: `${prefix}energy_produced`,
      help: 'Energy produced',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    energy_produced.observe(
      { reactor_id: reactor.id },
      reactor.producedLastTick,
    )

    const casing_temperature = new promClient.Histogram({
      name: `${prefix}casing_temperature`,
      help: 'Casing temperature',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    casing_temperature.observe(
      { reactor_id: reactor.id },
      reactor.casingTemperature,
    )

    const fuel_temperature = new promClient.Histogram({
      name: `${prefix}fuel_temperature`,
      help: 'Fuel temperature',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    fuel_temperature.observe(
      { reactor_id: reactor.id },
      reactor.fuelTemperature,
    )

    const stack_temperature = new promClient.Histogram({
      name: `${prefix}stack_temperature`,
      help: 'Stack temperature',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    stack_temperature.observe(
      { reactor_id: reactor.id },
      reactor.stackTemperature,
    )

    const fuel_burned_last_tick = new promClient.Histogram({
      name: `${prefix}fuel_burned_last_tick`,
      help: 'Fuel burned last tick',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    fuel_burned_last_tick.observe(
      { reactor_id: reactor.id },
      reactor.fuelBurnedLastTick,
    )

    const fuel_reactivity = new promClient.Histogram({
      name: `${prefix}fuel_reactivity`,
      help: 'Fuel reactivity',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    fuel_reactivity.observe({ reactor_id: reactor.id }, reactor.fuelReactivity)

    const fuel_waste = new promClient.Histogram({
      name: `${prefix}fuel_waste`,
      help: 'Fuel waste',
      labelNames: ['reactor_id'],
      registers: [register],
    })
    fuel_waste.observe({ reactor_id: reactor.id }, reactor.fuelWaste)

    reactorMetricData[reactor.id] = {
      ambientTemperature,
      energy_stored,
      energy_produced,
      casing_temperature,
      fuel_temperature,
      stack_temperature,
      fuel_burned_last_tick,
      fuel_reactivity,
      fuel_waste,
    }
  }
}

registerReactorData()

export const pollReactorData = async () => {
  Log.info('Polling reactor data')
  const reactors = await prisma.bigReactor.findMany()
  if (reactors.length !== reactor_length) {
    Log.info('Reactor count has changed, re-registering reactor data')
    await registerReactorData()
  }
  for (const reactor of reactors) {
    reactorMetricData[reactor.id].ambientTemperature.observe(
      { reactor_id: reactor.id },
      reactor.ambientTemperature,
    )
    reactorMetricData[reactor.id].energy_stored.observe(
      { reactor_id: reactor.id },
      reactor.stored,
    )
    reactorMetricData[reactor.id].energy_produced.observe(
      { reactor_id: reactor.id },
      reactor.producedLastTick,
    )
    reactorMetricData[reactor.id].casing_temperature.observe(
      { reactor_id: reactor.id },
      reactor.casingTemperature,
    )
    reactorMetricData[reactor.id].fuel_temperature.observe(
      { reactor_id: reactor.id },
      reactor.fuelTemperature,
    )
    reactorMetricData[reactor.id].stack_temperature.observe(
      { reactor_id: reactor.id },
      reactor.stackTemperature,
    )
    reactorMetricData[reactor.id].fuel_burned_last_tick.observe(
      { reactor_id: reactor.id },
      reactor.fuelBurnedLastTick,
    )
    reactorMetricData[reactor.id].fuel_reactivity.observe(
      { reactor_id: reactor.id },
      reactor.fuelReactivity,
    )
    reactorMetricData[reactor.id].fuel_waste.observe(
      { reactor_id: reactor.id },
      reactor.fuelWaste,
    )
  }

  return await register.metrics()
}
