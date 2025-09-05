export interface BrunoEnvironment {
  name: string
  variables: BrunoVariable[]
}

export interface BrunoVariable {
  name: string
  value: string
  enabled: boolean
  secret: boolean
  type?: string
}

export interface SecretMap {
  [environment: string]: {
    [variableName: string]: string
  }
}

export interface BrunoConfig {
  version: string
  name: string
  type: string
  scripts?: {
    filesystemAccess?: {
      allow: boolean
    }
    preRequestScript?: string
    postResponseScript?: string
  }
}

export interface CollectionFile {
  meta?: {
    name?: string
    type?: string
  }
  script?: {
    req?: string
    res?: string
  }
  auth?: any
  headers?: any[]
}

export interface OnePasswordOptions {
  vault: string
  title: string
  category: string
}