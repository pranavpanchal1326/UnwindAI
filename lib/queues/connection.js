// lib/queues/connection.js
// Upstash Redis connection for BullMQ
// BullMQ requires ioredis-compatible connection

import IORedis from 'ioredis'

// BullMQ connection — ioredis
// Upstash Redis URL format: rediss://default:TOKEN@HOST:PORT
let _bullmqConnection = null

export function getBullMQConnection() {
  if (_bullmqConnection) return _bullmqConnection

  if (!process.env.UPSTASH_REDIS_URL) {
    throw new Error('UPSTASH_REDIS_URL not set')
  }

  // Parse Upstash URL format
  const url = process.env.UPSTASH_REDIS_URL

  _bullmqConnection = new IORedis(url, {
    maxRetriesPerRequest: null,
    // Required for BullMQ blocking operations
    enableReadyCheck: false,
    tls: url.startsWith('rediss://') ? {} : undefined,
    retryStrategy(times) {
      if (times > 10) return null  // Stop retrying after 10 attempts
      return Math.min(times * 200, 2000)  // Exponential backoff
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT']
      return targetErrors.some(e => err.message.includes(e))
    }
  })

  _bullmqConnection.on('error', (err) => {
    console.error('BullMQ Redis connection error:', err.message)
  })

  _bullmqConnection.on('connect', () => {
    console.log('BullMQ Redis connected')
  })

  return _bullmqConnection
}

// Upstash REST client — for rate limiting (separate from BullMQ)
// Uses @upstash/redis which is HTTP-based (serverless-friendly)
import { Redis } from '@upstash/redis'

let _upstashClient = null

export function getUpstashClient() {
  if (_upstashClient) return _upstashClient

  _upstashClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN
  })

  return _upstashClient
}
