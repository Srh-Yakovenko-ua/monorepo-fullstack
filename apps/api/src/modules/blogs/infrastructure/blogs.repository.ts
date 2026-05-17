import type { BlogSortField, BlogsQuery } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { type BlogDoc, BlogEntity } from "../domain/blog.entity.js";

export type BlogCreateInput = Pick<BlogDoc, "description" | "name" | "websiteUrl">;
export type BlogLookupDoc = Pick<BlogDoc, "id" | "name">;
export type BlogUpdateInput = Pick<BlogDoc, "description" | "name" | "websiteUrl">;

const BLOG_SORT_COLUMN_BY_FIELD: Record<BlogSortField, string> = {
  createdAt: "blog.createdAt",
  name: "blog.name",
};

function mapEntity(entity: BlogEntity): BlogDoc {
  return {
    createdAt: entity.createdAt,
    description: entity.description,
    id: entity.id,
    isMembership: entity.isMembership,
    name: entity.name,
    websiteUrl: entity.websiteUrl,
  };
}

function mapEntityToLookup(entity: BlogEntity): BlogLookupDoc {
  return { id: entity.id, name: entity.name };
}

@Injectable()
export class BlogsRepository {
  constructor(
    @InjectRepository(BlogEntity)
    private readonly repository: Repository<BlogEntity>,
  ) {}

  async clearAll(): Promise<void> {
    await this.repository.createQueryBuilder().delete().execute();
  }

  async create(input: BlogCreateInput): Promise<BlogDoc> {
    const created = this.repository.create({
      description: input.description,
      name: input.name,
      websiteUrl: input.websiteUrl,
    });
    const saved = await this.repository.save(created);
    return mapEntity(saved);
  }

  async findById(id: number): Promise<BlogDoc | null> {
    const found = await this.repository.findOneBy({ id });
    return found ? mapEntity(found) : null;
  }

  async findLookupPage(query: BlogsQuery): Promise<{ items: BlogLookupDoc[]; totalCount: number }> {
    const builder = this.buildListQuery(query);
    const [entities, totalCount] = await builder.getManyAndCount();
    return { items: entities.map(mapEntityToLookup), totalCount };
  }

  async findPage(query: BlogsQuery): Promise<{ items: BlogDoc[]; totalCount: number }> {
    const builder = this.buildListQuery(query);
    const [entities, totalCount] = await builder.getManyAndCount();
    return { items: entities.map(mapEntity), totalCount };
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async update(id: number, patch: BlogUpdateInput): Promise<BlogDoc | null> {
    await this.repository.update(
      { id },
      { description: patch.description, name: patch.name, websiteUrl: patch.websiteUrl },
    );
    const found = await this.repository.findOneBy({ id });
    return found ? mapEntity(found) : null;
  }

  private buildListQuery(query: BlogsQuery) {
    const sortColumn = BLOG_SORT_COLUMN_BY_FIELD[query.sortBy];
    const sortDirection = query.sortDirection === "asc" ? "ASC" : "DESC";
    const offset = (query.pageNumber - 1) * query.pageSize;
    const search = query.searchNameTerm?.length ? query.searchNameTerm : null;

    const builder = this.repository
      .createQueryBuilder("blog")
      .orderBy(sortColumn, sortDirection)
      .limit(query.pageSize)
      .offset(offset);

    if (search) {
      builder.where("blog.name ILIKE :term", { term: `%${search}%` });
    }
    return builder;
  }
}
