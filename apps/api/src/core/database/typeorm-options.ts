import { type DataSourceOptions } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { env } from "../../config/env.js";
import { BlogEntity } from "../../modules/blogs/domain/blog.entity.js";
import { CommentLikeEntity } from "../../modules/comments/domain/comment-like.entity.js";
import { CommentEntity } from "../../modules/comments/domain/comment.entity.js";
import { PostLikeEntity } from "../../modules/posts/domain/post-like.entity.js";
import { PostEntity } from "../../modules/posts/domain/post.entity.js";
import { SessionEntity } from "../../modules/user-accounts/security/domain/session.entity.js";
import { UserEntity } from "../../modules/user-accounts/users/domain/user.entity.js";
import { VideoEntity } from "../../modules/videos/domain/video.entity.js";

export const databaseEntities = [
  BlogEntity,
  CommentEntity,
  CommentLikeEntity,
  PostEntity,
  PostLikeEntity,
  SessionEntity,
  UserEntity,
  VideoEntity,
];

export function buildTypeOrmOptions(): DataSourceOptions {
  return {
    entities: databaseEntities,
    logging: false,
    migrations: ["src/core/database/migrations/*.ts"],
    migrationsTableName: "typeorm_migrations",
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    type: "postgres",
    url: env.databaseUrl,
  };
}
