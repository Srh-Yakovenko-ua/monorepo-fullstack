import type { PaginationQuery, PostSortField } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { type PostDoc, PostEntity } from "../domain/post.entity.js";

export type PostCreateInput = Pick<
  PostDoc,
  "blogId" | "blogName" | "content" | "shortDescription" | "title"
>;
export type PostFindPageQuery = PaginationQuery & { blogId?: number };
export type PostUpdateInput = PostCreateInput;

const POST_SORT_COLUMN_BY_FIELD: Record<PostSortField, string> = {
  blogName: "post.blogName",
  createdAt: "post.createdAt",
  title: "post.title",
};

function mapEntity(entity: PostEntity): PostDoc {
  return {
    blogId: entity.blogId,
    blogName: entity.blogName,
    content: entity.content,
    createdAt: entity.createdAt,
    dislikesCount: entity.dislikesCount,
    id: entity.id,
    likesCount: entity.likesCount,
    shortDescription: entity.shortDescription,
    title: entity.title,
  };
}

@Injectable()
export class PostsRepository {
  constructor(
    @InjectRepository(PostEntity)
    private readonly repository: Repository<PostEntity>,
  ) {}

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
  }

  async create(input: PostCreateInput): Promise<PostDoc> {
    const created = this.repository.create({
      blogId: input.blogId,
      blogName: input.blogName,
      content: input.content,
      shortDescription: input.shortDescription,
      title: input.title,
    });
    const saved = await this.repository.save(created);
    return mapEntity(saved);
  }

  async findById(id: number): Promise<null | PostDoc> {
    const found = await this.repository.findOneBy({ id });
    return found ? mapEntity(found) : null;
  }

  async findPage(query: PostFindPageQuery): Promise<{ items: PostDoc[]; totalCount: number }> {
    const sortColumn = POST_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;

    const builder = this.repository
      .createQueryBuilder("post")
      .orderBy(sortColumn, sortDirection)
      .limit(query.pageSize)
      .offset(offset);

    if (typeof query.blogId === "number") {
      builder.where("post.blogId = :blogId", { blogId: query.blogId });
    }

    const [entities, totalCount] = await builder.getManyAndCount();
    return { items: entities.map(mapEntity), totalCount };
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async update(id: number, patch: PostUpdateInput): Promise<null | PostDoc> {
    await this.repository.update(
      { id },
      {
        blogId: patch.blogId,
        blogName: patch.blogName,
        content: patch.content,
        shortDescription: patch.shortDescription,
        title: patch.title,
      },
    );
    const found = await this.repository.findOneBy({ id });
    return found ? mapEntity(found) : null;
  }
}
