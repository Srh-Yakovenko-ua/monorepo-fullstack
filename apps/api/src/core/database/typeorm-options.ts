import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { type PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions.js";

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

const SERVERLESS_POOL_SIZE = 1;
const MIGRATION_PATH_GLOB = "src/core/database/migrations/*.ts";
const MIGRATIONS_TABLE = "typeorm_migrations";

export function buildMigrationOptions(): PostgresConnectionOptions {
  return {
    ...basePostgresOptions(),
    logging: ["error", "migration", "schema"],
    url: env.directUrl ?? env.databaseUrl,
  };
}

export function buildRuntimeOptions(): PostgresConnectionOptions {
  return {
    ...basePostgresOptions(),
    extra: { max: SERVERLESS_POOL_SIZE },
    logging: false,
    url: env.databaseUrl,
  };
}

function basePostgresOptions(): Pick<
  PostgresConnectionOptions,
  "entities" | "migrations" | "migrationsTableName" | "namingStrategy" | "synchronize" | "type"
> {
  return {
    entities: databaseEntities,
    migrations: [MIGRATION_PATH_GLOB],
    migrationsTableName: MIGRATIONS_TABLE,
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: false,
    type: "postgres",
  };
}
