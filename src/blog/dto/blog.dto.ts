import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum BlogPostStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum BlogReactionTypeDto {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
}

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  excerpt?: string;

  @IsString()
  @IsNotEmpty()
  contentHtml: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(BlogPostStatusDto)
  status?: BlogPostStatusDto;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  readTimeMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  slug?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  ogImageUrl?: string;
}

export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(220)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  excerpt?: string;

  @IsOptional()
  @IsString()
  contentHtml?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(BlogPostStatusDto)
  status?: BlogPostStatusDto;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  readTimeMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  slug?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  ogImageUrl?: string;
}

export class CreateBlogCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateBlogCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  content: string;
}

export class SetBlogReactionDto {
  @IsEnum(BlogReactionTypeDto)
  type: BlogReactionTypeDto;
}
