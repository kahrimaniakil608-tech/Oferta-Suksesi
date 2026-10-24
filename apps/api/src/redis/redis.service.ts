import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async ping() { return this.client.ping(); }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Reserve a bounded quota atomically; rejected requests do not consume it. */
  async reserveQuota(key: string, amount: number, limit: number, ttl: number): Promise<boolean> {
    const result = await this.client.eval(`
      local current = tonumber(redis.call('GET', KEYS[1]) or '0')
      if current + tonumber(ARGV[1]) > tonumber(ARGV[2]) then return 0 end
      redis.call('INCRBY', KEYS[1], ARGV[1])
      if current == 0 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
      return 1
    `, 1, key, amount, limit, ttl);
    return result === 1;
  }

  async reserveQuotaOnce(key: string, requestId: string, limit: number, ttl: number): Promise<boolean> {
    const result = await this.client.eval(`
      if redis.call('EXISTS', KEYS[2]) == 1 then return 1 end
      local current = tonumber(redis.call('GET', KEYS[1]) or '0')
      if current >= tonumber(ARGV[1]) then return 0 end
      redis.call('INCR', KEYS[1])
      if current == 0 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
      redis.call('SET', KEYS[2], '1', 'EX', ARGV[2])
      return 1
    `, 2, key, `${key}:request:${requestId}`, limit, ttl);
    return result === 1;
  }

  async consumeUploadPermit(key: string, operation: string, resourceId: string): Promise<string | null> {
    return this.client.eval(`
      local value = redis.call('GET', KEYS[1])
      if not value then return nil end
      local permit = cjson.decode(value)
      if permit.operation ~= ARGV[1] or permit.resourceId ~= ARGV[2] then return nil end
      redis.call('DEL', KEYS[1])
      return value
    `, 1, key, operation, resourceId) as Promise<string | null>;
  }
}
