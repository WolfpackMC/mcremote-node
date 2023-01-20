-- Using CraftOS API: 1.8

local config = require("config")

-- DO NOT EDIT ABOVE THIS LINE


-- Configure redstone input and outputs here

local function concat(t1, t2)
  for k, v in pairs(t2) do
    t1[k] = v
  end
  return t1
end

config = concat(config, {
  interval = 0.1,
  control_rod_level = 95
})

-- DO NOT EDIT BELOW THIS LINE

local reactor = peripheral.wrap("back")

local endpoint = {
  config = config,
  insertion_value = 100,
  token = nil,
  headers = {
    ["Content-Type"] = "application/json",
    ["authorization"] = config.api_key,
    ["Accept"] = "application/json",
    ["User-Agent"] = "CraftOS/1.8",
    ["X-Endpoint-Id"] = config.endpoint_id,
  }
}

for k, v in pairs(endpoint.config) do
  print(k, v)
end

local file = io.open("token")
if file then
  endpoint.token = file:read()
  print("Read token")
  endpoint.headers["token"] = endpoint.token
  file:close()
end

function endpoint.set_token()
  if endpoint.token then
    endpoint.headers["token"] = endpoint.token
    return
  end

  print(endpoint)
  local response, err = http.get(endpoint.config.http_url .. "/token",
    endpoint.headers)

  local res_headers = response.getResponseHeaders()

  if res_headers["token"] then
    endpoint.token = res_headers["token"]
    endpoint.headers["token"] = endpoint.token
    local file = io.open("token", "w")
    file:write(endpoint.token)
    file:close()
    print("Set token!")
  end

  if response then
    local data = response.readAll()
    print(textutils.unserializeJSON(data))
  end
end

endpoint.set_token()

local function control_reactor(reactor_data)
  if (reactor_data.stored / reactor_data.capacity < 0.80) then
    print("Set control rod level to" .. endpoint.config.control_rod_level)
    endpoint.insertion_value = endpoint.config.control_rod_level
  elseif (reactor_data.stored / reactor_data.capacity > 0.99) then
    print("Set control rod level to 100")
    endpoint.insertion_value = 100
  end
  reactor.getControlRod(0).setLevel(endpoint.config.control_rod_level)
end

local function poll_reactor()
  local reactor_data = {
    id = endpoint.config.endpoint_id,
    data = {
      active = reactor.active(),
      ambientTemperature = reactor.ambientTemperature(),
      apiVersion = reactor.apiVersion(),
      capacity = reactor.battery().capacity(),
      producedLastTick = reactor.battery().producedLastTick(),
      stored = reactor.battery().stored(),
      casingTemperature = reactor.casingTemperature(),
      connected = reactor.connected(),
      controlRodCount = reactor.controlRodCount(),
      fuelTemperature = reactor.fuelTemperature(),
      stackTemperature = reactor.stackTemperature(),
      fuelBurnedLastTick = reactor.fuelTank().burnedLastTick(),
      fuelReactivity = reactor.fuelTank().fuelReactivity(),
      fuelWaste = reactor.fuelTank().waste(),
      totalFuel = reactor.fuelTank().totalReactant(),
      insertionValue = endpoint.insertion_value,
    }
  }
  control_reactor(reactor_data.data)
  return reactor_data
end

local function main()
  while true do
    local state_res, err = http.get(endpoint.config.http_url .. "/getBRState?input=" .. endpoint.config.endpoint_id, endpoint.headers)
    if err then
      print(err)
      return
    end
    local data_string = state_res.readAll()
    print(data_string)
    local data = textutils.unserializeJSON(data_string)
    local reactor_data = poll_reactor()
    reactor_data.data.active = data.result.data.active
    reactor.setActive(reactor_data.data.active)
    local res, err = http.post(endpoint.config.http_url .. "/updateBRReactor", textutils.serializeJSON(reactor_data),
      endpoint.headers)
    if err then
      print(err)
      return
    end
    print(os.time())
    sleep(0.5)
  end
end

main()
