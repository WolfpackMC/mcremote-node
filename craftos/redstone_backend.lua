-- Using CraftOS API: 1.8

local config = require("config")

-- DO NOT EDIT ABOVE THIS LINE

local function concat(t1, t2)
  for k, v in pairs(t2) do
    t1[k] = v
  end
  return t1
end

config = concat(config, {
  input = "left",
  outputs = {
    "right"
  }
})

-- DO NOT EDIT BELOW THIS LINE

local sides = {
  "top",
  "bottom",
  "left",
  "right",
  "front",
  "back"
}

local function check_io_conflicts()
  for _, side in pairs(config.outputs) do
    if side == config.input then
      error("Input and output cannot be the same side!")
    end
  end
end

check_io_conflicts()

local daemon_type = ...

local endpoint = {
  config = config,
  token = nil,
  headers = {
    ["Content-Type"] = "application/json",
    ["authorization"] = config.api_key,
    ["Accept"] = "application/json",
    ["User-Agent"] = "CraftOS/1.8",
    ["X-Endpoint-Id"] = config.endpoint_id,
  }
}

function endpoint.check(url)
  return http.checkURL(url)
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
  local response, err = http.get(endpoint.config.http_url .. "/getRedstoneState", endpoint.headers)

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

function endpoint.set_redstone_state(state)
  local response, err = http.post(endpoint.config.http_url .. "/setRedstoneState", textutils.serializeJSON({
    state = state,
    id = endpoint.config.endpoint_id
  }), endpoint.headers)

  if response then
    local data = response.readAll()
    print(data)
  end
end

function endpoint.get_redstone_state()
  local response, err = http.get(endpoint.config.http_url .. "/getRedstoneState?input=" .. endpoint.config.endpoint_id,
    endpoint.headers)

  if response then
    local data = textutils.unserializeJSON(response.readAll()).result.data
    return data.state
  end
end

local function main()
  if daemon_type == "setter" then
    while true do
      os.pullEvent("redstone")

      local state = redstone.getInput(endpoint.config.input)

      for _, side in pairs(config.outputs) do
        redstone.setOutput(side, state)
      end

      endpoint.set_redstone_state(state)
    end
  elseif daemon_type == "getter" then
    while true do
      local state = endpoint.get_redstone_state()

      for _, side in pairs(config.outputs) do
        redstone.setOutput(side, state)
      end

      sleep(0.25)
    end
  end
end

main()
