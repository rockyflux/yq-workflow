import { Counter } from 'counterapi'
import { readCcgConfig } from './config'

const COUNTERAPI_DEBUG_ENV = 'YQ_COUNTERAPI_DEBUG'
const COUNTERAPI_TOKEN_ENV = 'YQ_COUNTERAPI_ACCESS_TOKEN'
const COUNTERAPI_WORKSPACE_ENV = 'YQ_COUNTERAPI_WORKSPACE'
const DEFAULT_COUNTERAPI_ACCESS_TOKEN = 'ut_SP7Tp8kEONhHSsldaXKry6jmU9jfKtyLh8qpklLw'
const DEFAULT_COUNTERAPI_WORKSPACE = 'yq-workflow'
const DEFAULT_COUNTERAPI_NAME = 'yq-workflow'
const COUNTERAPI_TIMEOUT_MS = 1200

type CounterApiConfig = {
  accessToken: string
  counterName: string
  workspace: string
}

let counterClientPromise: Promise<Counter | null> | null = null

function isCounterApiDebugEnabled(): boolean {
  return process.env[COUNTERAPI_DEBUG_ENV] === 'true'
}

function logCounterApiDebug(message: string, error?: unknown): void {
  if (!isCounterApiDebugEnabled()) {
    return
  }

  console.warn(`[counterapi] ${message}`)
  if (error) {
    console.warn(error)
  }
}

async function resolveCounterApiConfig(): Promise<CounterApiConfig | null> {
  const config = await readCcgConfig()
  const workspace = process.env[COUNTERAPI_WORKSPACE_ENV]
    || config?.telemetry?.counterApi?.workspace
    || DEFAULT_COUNTERAPI_WORKSPACE
  const accessToken = process.env[COUNTERAPI_TOKEN_ENV]
    || config?.telemetry?.counterApi?.accessToken
    || DEFAULT_COUNTERAPI_ACCESS_TOKEN

  if (!workspace || !accessToken) {
    return null
  }

  return {
    accessToken,
    counterName: DEFAULT_COUNTERAPI_NAME,
    workspace,
  }
}

async function getCounterClient(): Promise<Counter | null> {
  counterClientPromise ??= resolveCounterApiConfig()
    .then((config) => {
      if (!config) {
        return null
      }

      return new Counter({
        workspace: config.workspace,
        timeout: COUNTERAPI_TIMEOUT_MS,
        accessToken: config.accessToken,
      })
    })
    .catch((error) => {
      logCounterApiDebug('failed to create client', error)
      return null
    })

  return counterClientPromise
}

async function incrementCounter(name: string): Promise<void> {
  const client = await getCounterClient()
  if (!client) {
    return
  }

  try {
    await client.up(name)
  }
  catch (error) {
    logCounterApiDebug(`failed to increment ${name}`, error)
  }
}

export async function trackMenuLaunch(): Promise<void> {
  await incrementCounter(DEFAULT_COUNTERAPI_NAME)
}
