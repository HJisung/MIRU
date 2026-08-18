import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { UpdateProfileDto } from './profiles.dto.js';

const profileSelect = {
  id: true,
  handle: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  _count: {
    select: {
      homeVideos: true,
      series: true,
      shortForms: true,
      communityPosts: true,
    },
  },
  series: { select: { _count: { select: { episodes: true } } } },
} as const;

function mapProfile(
  profile: Awaited<ReturnType<ProfilesService['findRecord']>>,
) {
  if (!profile) throw new NotFoundException('Profile not found');
  const { _count, series, ...rest } = profile;
  const episodeCount = series.reduce(
    (total, record) => total + record._count.episodes,
    0,
  );
  return {
    ...rest,
    postCount:
      _count.homeVideos +
      _count.series +
      _count.shortForms +
      _count.communityPosts +
      episodeCount,
  };
}

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async findByHandle(handle: string) {
    return mapProfile(await this.findRecord({ handle: handle.toLowerCase() }));
  }

  async update(userId: string, input: UpdateProfileDto) {
    const profile = await this.database.client.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName !== undefined && {
          displayName: input.displayName.trim(),
        }),
        ...(input.bio !== undefined && { bio: input.bio.trim() }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      },
      select: profileSelect,
    });
    return mapProfile(profile);
  }

  findRecord(where: { id?: string; handle?: string }) {
    return this.database.client.user.findFirst({
      where,
      select: profileSelect,
    });
  }
}
