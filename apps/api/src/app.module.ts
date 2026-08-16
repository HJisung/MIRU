import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { FeedModule } from './feed/feed.module.js';
import { HealthModule } from './health/health.module.js';
import { PostsModule } from './posts/posts.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { StorageModule } from './storage/storage.module.js';
import { MediaModule } from './media/media.module.js';
import { SocialModule } from './social/social.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { ModerationModule } from './moderation/moderation.module.js';
import { HomeModule } from './home/home.module.js';
import { SeriesModule } from './series/series.module.js';
import { ShortformsModule } from './shortforms/shortforms.module.js';
import { CommunityModule } from './community/community.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    ProfilesModule,
    StorageModule,
    MediaModule,
    SocialModule,
    CommentsModule,
    ModerationModule,
    HealthModule,
    FeedModule,
    PostsModule,
    HomeModule,
    SeriesModule,
    ShortformsModule,
    CommunityModule,
  ],
})
export class AppModule {}
