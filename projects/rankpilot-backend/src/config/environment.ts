import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3100),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().min(1),
  CORS_ORIGIN: z.string().default('https://geekatyourspot.com'),
  CRAWL_DEPTH_DEFAULT: z.coerce.number().default(50),
  CRAWL_CONCURRENCY: z.coerce.number().default(3),
});

export type Environment = z.infer<typeof envSchema>;

let env: Environment;

export function loadEnvironment(): Environment {
  if (env) return env;
  env = envSchema.parse(process.env);
  return env;
}

export function getEnv(): Environment {
  if (!env) return loadEnvironment();
  return env;
}
