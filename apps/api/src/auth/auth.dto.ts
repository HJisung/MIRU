import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function normalizedLowercase(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class RegisterDto {
  @ApiProperty({ example: 'creator@example.com' })
  @Transform(({ value }: { value: unknown }) => normalizedLowercase(value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'creator.one' })
  @Transform(({ value }: { value: unknown }) => normalizedLowercase(value))
  @Length(3, 30)
  @Matches(/^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/, {
    message:
      'handle may contain lowercase letters, numbers, dots, and underscores',
  })
  handle!: string;

  @ApiProperty({ example: 'Creator One' })
  @IsString()
  @Length(1, 50)
  displayName!: string;

  @ApiProperty({ minLength: 10, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @Transform(({ value }: { value: unknown }) => normalizedLowercase(value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(128)
  password!: string;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() handle!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() bio!: string;
  @ApiProperty({ nullable: true, type: String }) avatarUrl!: string | null;
  @ApiProperty({ enum: ['MEMBER', 'MODERATOR', 'ADMIN'] }) role!: string;
}
