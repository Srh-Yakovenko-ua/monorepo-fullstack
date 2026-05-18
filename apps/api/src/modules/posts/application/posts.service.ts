import type {
  ExtendedLikesInfoViewModel,
  LikeStatus,
  NewestLikeViewModel,
  PaginationQuery,
  Paginator,
  PostInput,
  PostViewModel,
} from "@app/shared";

import { Injectable } from "@nestjs/common";

import type { PostDoc } from "../domain/post.entity.js";
import type { NewestLikeRow } from "../infrastructure/post-likes.repository.js";

import { BadRequestError, NotFoundError } from "../../../core/exceptions/errors.js";
import { buildPaginator } from "../../../core/paginator.js";
import { BlogsRepository } from "../../blogs/infrastructure/blogs.repository.js";
import { PostLikesRepository } from "../infrastructure/post-likes.repository.js";
import { PostsRepository } from "../infrastructure/posts.repository.js";

@Injectable()
export class PostsService {
  constructor(
    private readonly blogsRepository: BlogsRepository,
    private readonly postsRepository: PostsRepository,
    private readonly postLikesRepository: PostLikesRepository,
  ) {}

  async clearAllPosts(): Promise<void> {
    await this.postLikesRepository.clearAll();
    await this.postsRepository.clearAll();
  }

  async createPost(input: PostInput): Promise<PostViewModel> {
    const blog = await this.blogsRepository.findById(input.blogId);
    if (!blog) {
      throw new BadRequestError("Referenced blog does not exist", {
        fields: [{ field: "blogId", message: "blog not found" }],
      });
    }

    const doc = await this.postsRepository.create({
      blogId: blog.id,
      blogName: blog.name,
      content: input.content,
      shortDescription: input.shortDescription,
      title: input.title,
    });
    return toPostView({ doc, myStatus: "None", newestLikes: [] });
  }

  async deletePost(id: number): Promise<void> {
    const removed = await this.postsRepository.remove(id);
    if (!removed) throw new NotFoundError(`Post with id ${id} not found`);
  }

  async getAllPosts({
    currentUserId,
    query,
  }: {
    currentUserId?: number;
    query: PaginationQuery;
  }): Promise<Paginator<PostViewModel>> {
    const { items, totalCount } = await this.postsRepository.findPage(query);
    const itemsView = await this.mapPostsToView({ currentUserId, docs: items });
    return buildPaginator({
      items: itemsView,
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async getPostById({
    currentUserId,
    postId,
  }: {
    currentUserId?: number;
    postId: number;
  }): Promise<PostViewModel> {
    const post = await this.postsRepository.findById(postId);
    if (!post) throw new NotFoundError(`Post with id ${postId} not found`);
    const [views] = await this.mapPostsToView({ currentUserId, docs: [post] });
    if (!views) throw new NotFoundError(`Post with id ${postId} not found`);
    return views;
  }

  async listPostsForBlog({
    blogId,
    currentUserId,
    query,
  }: {
    blogId: number;
    currentUserId?: number;
    query: PaginationQuery;
  }): Promise<Paginator<PostViewModel>> {
    const { items, totalCount } = await this.postsRepository.findPage({ ...query, blogId });
    const itemsView = await this.mapPostsToView({ currentUserId, docs: items });
    return buildPaginator({
      items: itemsView,
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
      totalCount,
    });
  }

  async setLikeStatus({
    currentUserId,
    currentUserLogin,
    newStatus,
    postId,
  }: {
    currentUserId: number;
    currentUserLogin: string;
    newStatus: LikeStatus;
    postId: number;
  }): Promise<void> {
    const doc = await this.postsRepository.findById(postId);
    if (!doc) throw new NotFoundError("Post not found", { bodyless: true });

    await this.postLikesRepository.applyLikeChange({
      newStatus,
      postId,
      userId: currentUserId,
      userLogin: currentUserLogin,
    });
  }

  async updatePost(id: number, input: PostInput): Promise<void> {
    const existing = await this.postsRepository.findById(id);
    if (!existing) throw new NotFoundError(`Post with id ${id} not found`);

    const blog = await this.blogsRepository.findById(input.blogId);
    if (!blog) {
      throw new BadRequestError("Referenced blog does not exist", {
        fields: [{ field: "blogId", message: "blog not found" }],
      });
    }

    await this.postsRepository.update(id, {
      blogId: blog.id,
      blogName: blog.name,
      content: input.content,
      shortDescription: input.shortDescription,
      title: input.title,
    });
  }

  private async mapPostsToView({
    currentUserId,
    docs,
  }: {
    currentUserId?: number;
    docs: PostDoc[];
  }): Promise<PostViewModel[]> {
    if (docs.length === 0) return [];
    const postIds = docs.map((doc) => doc.id);

    const [myStatusByPostId, newestLikesByPostId] = await Promise.all([
      currentUserId === undefined
        ? Promise.resolve(new Map<number, LikeStatus>())
        : this.postLikesRepository.findByPostIdsForUser({ postIds, userId: currentUserId }),
      this.postLikesRepository.findNewestLikesByPostIds({ postIds }),
    ]);

    return docs.map((doc) => {
      const myStatus = myStatusByPostId.get(doc.id) ?? "None";
      const newestLikes = (newestLikesByPostId.get(doc.id) ?? []).map(toNewestLikeView);
      return toPostView({ doc, myStatus, newestLikes });
    });
  }
}

export function toPostView({
  doc,
  myStatus,
  newestLikes,
}: {
  doc: PostDoc;
  myStatus: LikeStatus;
  newestLikes: NewestLikeViewModel[];
}): PostViewModel {
  const extendedLikesInfo: ExtendedLikesInfoViewModel = {
    dislikesCount: doc.dislikesCount,
    likesCount: doc.likesCount,
    myStatus,
    newestLikes,
  };
  return {
    blogId: doc.blogId,
    blogName: doc.blogName,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    extendedLikesInfo,
    id: doc.id,
    shortDescription: doc.shortDescription,
    title: doc.title,
  };
}

function toNewestLikeView(row: NewestLikeRow): NewestLikeViewModel {
  return {
    addedAt: row.addedAt.toISOString(),
    login: row.userLogin,
    userId: row.userId,
  };
}
