local config = require("config")

local function concat(t1, t2)
  for k, v in pairs(t2) do
    t1[k] = v
  end
  return t1
end

config = concat(config, {
  interval = 0.1,
})


local induction_matrix = peripheral.wrap("bottom")
local ic = induction_matrix

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
  local response, err = http.get(endpoint.config.http_url .. "/token" .. endpoint.config.endpoint_id,
    endpoint.headers)
    
  if err then print(err) return end

  local res_headers = response.getResponseHeaders()

  if res_headers["token"] then
    endpoint.token = res_headers["token"]
    endpoint.headers["token"] = endpoint.token
    file = io.open("token", "w")
    if file then
      file:write(endpoint.token)
      file:close()
    end
    print("Set token!")
  end

  if response then
    local data = response.readAll()
    print(textutils.unserializeJSON(data))
  end
end

endpoint.set_token()

local function poll_matrix()
  local matrix_data = {
    id = endpoint.config.endpoint_id,
    data = {
      active = ic.isFormed(),
      energy = ic.getEnergy(),
      energyFilledPercentage = ic.getEnergyFilledPercentage(),
      energyNeeded = ic.getEnergyNeeded(),
      installedCells = ic.getInstalledCells(),
      installedProviders = ic.getInstalledProviders(),
      lastInput = ic.getLastInput(),
      lastOutput = ic.getLastOutput(),
      maxEnergy = ic.getMaxEnergy(),
      transferCap = ic.getTransferCap(),
      length = ic.getLength(),
      width = ic.getWidth(),
      height = ic.getHeight(),
    }
  }
  return matrix_data
end

local function main()
  while true do
    local matrix_data = poll_matrix()
    local res, err = http.post(endpoint.config.http_url .. "/updateIMatrix", textutils.serializeJSON(matrix_data),
      endpoint.headers)
    if err then
      print(err)
      return
    end
    print(os.time())
    sleep(config.interval)
  end
end

main()
