import { z } from 'zod'

const envSchema = z.preprocess(
  obj => {
    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = value === '' ? undefined : value
      }
      return result
    }
    return obj
  },
  z.object({
    VITE_API_BASE_URL: z.string().default(''),
    VITE_API_TIMEOUT_MS: z
      .string()
      .default('10000')
      .transform(v => parseInt(v, 10)),
    VITE_ENABLE_DEVTOOLS: z
      .string()
      .default('false')
      .transform(v => v === 'true'),
    VITE_ENABLE_MOCK_API: z
      .string()
      .default('false')
      .transform(v => v === 'true'),
    VITE_APP_ENV: z.string().default('development'),
  })
)

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format())
  throw new Error('Invalid environment variables — check .env.example for required fields')
}

const raw = parsed.data

export const env = {
  API_BASE_URL: raw.VITE_API_BASE_URL,
  API_TIMEOUT_MS: raw.VITE_API_TIMEOUT_MS,
  ENABLE_DEVTOOLS: raw.VITE_ENABLE_DEVTOOLS,
  ENABLE_MOCK_API: raw.VITE_ENABLE_MOCK_API,
  APP_ENV: raw.VITE_APP_ENV,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const

export type Env = typeof env
