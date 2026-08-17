import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  VIDEO_PIPELINE_VERSION,
  VIDEO_PROCESSING_QUEUE,
  VIDEO_PROCESS_JOB,
  type ProcessVideoJob,
} from '@stream/media';

@Injectable()
export class VideoQueueService implements OnModuleDestroy {
  private readonly queue: Queue<ProcessVideoJob>;
  private used = false;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const redis = new URL(config.getOrThrow<string>('REDIS_URL'));
    this.queue = new Queue(VIDEO_PROCESSING_QUEUE, {
      connection: {
        host: redis.hostname,
        port: Number(redis.port || 6379),
        username: redis.username || undefined,
        password: redis.password || undefined,
        lazyConnect: true,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }

  async enqueue(assetId: string) {
    this.used = true;
    const jobId = `${assetId}-v${VIDEO_PIPELINE_VERSION}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'failed') {
        await existing.retry();
      }
      return existing;
    }
    return this.queue.add(
      VIDEO_PROCESS_JOB,
      { assetId, pipelineVersion: VIDEO_PIPELINE_VERSION },
      { jobId },
    );
  }

  async onModuleDestroy() {
    if (this.used) await this.queue.close();
    else await this.queue.disconnect();
  }
}
