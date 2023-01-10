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
})

-- DO NOT EDIT BELOW THIS LINE

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
  local response, err = http.get(endpoint.config.http_url .. "/getBRData?input=1", endpoint.headers)

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

local function main()
  local res, err = http.get(endpoint.config.http_url .. "/getBRData?input=1", endpoint.headers)

  if err then
    print(err)
    return
  end

  local data = res.readAll()

  print("It worked!")
end

main()
