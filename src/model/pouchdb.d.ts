export interface ServerConfig {
  url: string,
  key?: string
  cert?: string
}

export interface DbConfig {
  server: ServerConfig
  name: string
}
