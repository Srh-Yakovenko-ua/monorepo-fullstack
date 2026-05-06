import type {
  ExtendedLikesInfoViewModel,
  LikeStatus,
  NewestLikeViewModel,
  PaginationQuery,
  Paginator,
  PostInput,
  PostViewModel,
} from "@app/shared";

import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { type Connection, isValidObjectId } from "mongoose";

import type { PostDoc } from "../domain/post.entity.js";
import type { NewestLikeRow } from "../infrastructure/post-likes.repository.js";

import { BadRequestError, NotFoundError } from "../../../core/exceptions/errors.js";
import { createLogger } from "../../../core/logger.js";
import { buildPaginator } from "../../../core/paginator.js";
import { BlogsRepository } from "../../blogs/infrastructure/blogs.repository.js";
import { PostLikesRepository } from "../infrastructure/post-likes.repository.js";
import { PostsRepository } from "../infrastructure/posts.repository.js";

const log = createLogger("posts.service");

@Injectable()
export class PostsService implements OnModuleInit {
  constructor(
    private readonly blogsRepository: BlogsRepository,
    private readonly postsRepository: PostsRepository,
    private readonly postLikesRepository: PostLikesRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async clearAllPosts(): Promise<void> {
    await this.postsRepository.clearAll();
    await this.postLikesRepository.clearAll();
  }

  async createPost(input: PostInput): Promise<PostViewModel> {
    const blog = await this.blogsRepository.findById(input.blogId);
    if (!blog) {
      throw new BadRequestError("Referenced blog does not exist", {
        fields: [{ field: "blogId", message: "blog not found" }],
      });
    }

    const doc = await this.postsRepository.create({
      blogId: blog._id.toHexString(),
      blogName: blog.name,
      content: input.content,
      shortDescription: input.shortDescription,
      title: input.title,
    });
    return toPostView({ doc, myStatus: "None", newestLikes: [] });
  }

  async deletePost(id: string): Promise<void> {
    const removed = await this.postsRepository.remove(id);
    if (!removed) throw new NotFoundError(`Post with id ${id} not found`);
  }

  async getAllPosts({
    currentUserId,
    query,
  }: {
    currentUserId?: string;
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
    currentUserId?: string;
    postId: string;
  }): Promise<PostViewModel> {
    if (!isValidObjectId(postId)) throw new NotFoundError(`Post with id ${postId} not found`);
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
    blogId: string;
    currentUserId?: string;
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

  async onModuleInit(): Promise<void> {
    if (this.connection.readyState !== 1) {
      log.warn("mongo connection not ready, skipping like-counter backfill");
      return;
    }
    try {
      const backfilledLikeCounterCount = await this.postsRepository.backfillMissingLikeCounters();
      if (backfilledLikeCounterCount > 0) {
        log.info(
          { count: backfilledLikeCounterCount },
          "backfilled missing like/dislike counters on posts",
        );
      }
    } catch (err) {
      log.warn({ err }, "like-counter backfill failed, continuing");
    }
  }

  async setLikeStatus({
    currentUserId,
    currentUserLogin,
    newStatus,
    postId,
  }: {
    currentUserId: string;
    currentUserLogin: string;
    newStatus: LikeStatus;
    postId: string;
  }): Promise<void> {
    if (!isValidObjectId(postId)) throw new NotFoundError("Post not found", { bodyless: true });
    const doc = await this.postsRepository.findById(postId);
    if (!doc) throw new NotFoundError("Post not found", { bodyless: true });

    const previousPersistedStatus =
      newStatus === "None"
        ? await this.postLikesRepository.deleteAndReturnPreviousStatus({
            postId,
            userId: currentUserId,
          })
        : await this.postLikesRepository.upsertAndReturnPreviousStatus({
            postId,
            status: newStatus,
            userId: currentUserId,
            userLogin: currentUserLogin,
          });

    const previousStatus: LikeStatus = previousPersistedStatus ?? "None";
    const { dislikesDelta, likesDelta } = computeCounterDelta({
      currentStatus: previousStatus,
      newStatus,
    });

    await this.postsRepository.applyCounterDelta({ dislikesDelta, likesDelta, postId });
  }

  async updatePost(id: string, input: PostInput): Promise<void> {
    const existing = await this.postsRepository.findById(id);
    if (!existing) throw new NotFoundError(`Post with id ${id} not found`);

    const blog = await this.blogsRepository.findById(input.blogId);
    if (!blog) {
      throw new BadRequestError("Referenced blog does not exist", {
        fields: [{ field: "blogId", message: "blog not found" }],
      });
    }

    await this.postsRepository.update(id, {
      blogId: blog._id.toHexString(),
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
    currentUserId?: string;
    docs: PostDoc[];
  }): Promise<PostViewModel[]> {
    if (docs.length === 0) return [];
    const postIds = docs.map((doc) => doc._id.toHexString());

    const [myStatusByPostId, newestLikesByPostId] = await Promise.all([
      currentUserId
        ? this.postLikesRepository.findByPostIdsForUser({ postIds, userId: currentUserId })
        : Promise.resolve(new Map<string, LikeStatus>()),
      this.postLikesRepository.findNewestLikesByPostIds({ postIds }),
    ]);

    return docs.map((doc) => {
      const id = doc._id.toHexString();
      const myStatus = myStatusByPostId.get(id) ?? "None";
      const newestLikes = (newestLikesByPostId.get(id) ?? []).map(toNewestLikeView);
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
    dislikesCount: doc.dislikesCount ?? 0,
    likesCount: doc.likesCount ?? 0,
    myStatus,
    newestLikes,
  };
  return {
    blogId: doc.blogId,
    blogName: doc.blogName,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    extendedLikesInfo,
    id: doc._id.toHexString(),
    shortDescription: doc.shortDescription,
    title: doc.title,
  };
}

function computeCounterDelta({
  currentStatus,
  newStatus,
}: {
  currentStatus: LikeStatus;
  newStatus: LikeStatus;
}): { dislikesDelta: number; likesDelta: number } {
  const likesDelta = (newStatus === "Like" ? 1 : 0) - (currentStatus === "Like" ? 1 : 0);
  const dislikesDelta = (newStatus === "Dislike" ? 1 : 0) - (currentStatus === "Dislike" ? 1 : 0);
  return { dislikesDelta, likesDelta };
}

function toNewestLikeView(row: NewestLikeRow): NewestLikeViewModel {
  return {
    addedAt: row.addedAt.toISOString(),
    login: row.userLogin,
    userId: row.userId.toHexString(),
  };
}
