import type { BlogsQuery } from "@app/shared";

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model } from "mongoose";

import { escapeRegExp } from "../../lib/regex.js";
import { Blog, type BlogDoc } from "../models/blog.model.js";

export type BlogCreateInput = Pick<BlogDoc, "description" | "name" | "websiteUrl">;
export type BlogLookupDoc = Pick<BlogDoc, "_id" | "name">;
export type BlogUpdateInput = Pick<BlogDoc, "description" | "name" | "websiteUrl">;

@Injectable()
export class BlogsRepository {
  constructor(@InjectModel(Blog.name) private readonly blogModel: Model<Blog>) {}

  async clearAll(): Promise<void> {
    await this.blogModel.deleteMany({});
  }

  async create(input: BlogCreateInput): Promise<BlogDoc> {
    const doc = await this.blogModel.create(input);
    return doc.toObject();
  }

  async findById(id: string): Promise<BlogDoc | null> {
    return this.blogModel.findById(id).lean();
  }

  async findLookupPage(query: BlogsQuery): Promise<{ items: BlogLookupDoc[]; totalCount: number }> {
    const filter =
      query.searchNameTerm && query.searchNameTerm.length > 0
        ? { name: { $options: "i", $regex: escapeRegExp(query.searchNameTerm) } }
        : {};

    const skip = (query.pageNumber - 1) * query.pageSize;
    const sortOrder = query.sortDirection === "asc" ? 1 : -1;

    const [items, totalCount] = await Promise.all([
      this.blogModel
        .find(filter)
        .select({ _id: 1, name: 1 })
        .sort({ [query.sortBy]: sortOrder })
        .skip(skip)
        .limit(query.pageSize)
        .lean(),
      this.blogModel.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async findPage(query: BlogsQuery): Promise<{ items: BlogDoc[]; totalCount: number }> {
    const filter =
      query.searchNameTerm && query.searchNameTerm.length > 0
        ? { name: { $options: "i", $regex: escapeRegExp(query.searchNameTerm) } }
        : {};

    const skip = (query.pageNumber - 1) * query.pageSize;
    const sortOrder = query.sortDirection === "asc" ? 1 : -1;

    const [items, totalCount] = await Promise.all([
      this.blogModel
        .find(filter)
        .sort({ [query.sortBy]: sortOrder })
        .skip(skip)
        .limit(query.pageSize)
        .lean(),
      this.blogModel.countDocuments(filter),
    ]);

    return { items, totalCount };
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.blogModel.findByIdAndDelete(id);
    return result !== null;
  }

  async update(id: string, patch: BlogUpdateInput): Promise<BlogDoc | null> {
    return this.blogModel.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
  }
}
