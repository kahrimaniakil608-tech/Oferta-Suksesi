import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
@Injectable()
export class AppService {
  constructor(private readonly db: PrismaService, private readonly redis: RedisService, private readonly config: ConfigService) {}
  getHealth() { return { status: 'alive', timestamp: new Date().toISOString() }; }
  async ready() {
    const bounded = async (operation: Promise<unknown>) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 2000); })]); return 'ok'; }
      catch { return 'unavailable'; } finally { clearTimeout(timer); }
    };
    const [database, redis, search] = await Promise.all([
      bounded(this.db.$queryRaw`SELECT 1`), bounded(this.redis.ping()),
      bounded(fetch(`${this.config.get('MEILISEARCH_HOST', 'http://localhost:7700')}/health`, { signal: AbortSignal.timeout(2000) }).then(r => { if (!r.ok) throw new Error('search'); })),
    ]);
    const result = { status: database !== 'ok' || redis !== 'ok' ? 'unavailable' : search !== 'ok' ? 'degraded' : 'ready', dependencies: { database, redis, search } };
    if (result.status === 'unavailable') throw new ServiceUnavailableException(result);
    return result;
  }
}
