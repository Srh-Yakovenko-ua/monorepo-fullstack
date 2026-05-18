import type { CommentsQuery, LikeStatus } from "@app/shared";

import { describe, expect, it, vi } from "vitest";

import type { PostDoc } from "../../posts/domain/post.entity.js";
import type { CommentDoc } from "../domain/comment.entity.js";

import { ForbiddenError, NotFoundError } from "../../../core/exceptions/errors.js";
import { PostsRepository } from "../../posts/infrastructure/posts.repository.js";
import { CommentLikesRepository } from "../infrastructure/comment-likes.repository.js";
import { CommentsRepository } from "../infrastructure/comments.repository.js";
import { CommentsService } from "./comments.service.js";

type MockedCommentLikesRepository = {
  clearAll: ReturnType<typeof vi.fn>;
  deleteAndReturnPreviousStatus: ReturnType<typeof vi.fn>;
  findByCommentIdsForUser: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  upsertAndReturnPreviousStatus: ReturnType<typeof vi.fn>;
};

type MockedCommentsRepository = {
  clearAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByPostId: ReturnType<typeof vi.fn>;
  recomputeLikeCounters: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  updateContent: ReturnType<typeof vi.fn>;
};

type MockedPostsRepository = {
  findById: ReturnType<typeof vi.fn>;
};

function buildCommentDoc(overrides: Partial<CommentDoc> = {}): CommentDoc {
  return {
    commentatorUserId: 10,
    commentatorUserLogin: "alice",
    content: "Default comment body content meeting min length",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    dislikesCount: 0,
    id: 1,
    likesCount: 0,
    postId: 100,
    ...overrides,
  };
}

function buildCommentLikesRepository(): MockedCommentLikesRepository {
  return {
    clearAll: vi.fn().mockResolvedValue(undefined),
    deleteAndReturnPreviousStatus: vi.fn().mockResolvedValue(null),
    findByCommentIdsForUser: vi.fn().mockResolvedValue(new Map<number, LikeStatus>()),
    findOne: vi.fn().mockResolvedValue(null),
    upsertAndReturnPreviousStatus: vi.fn().mockResolvedValue(null),
  };
}

function buildCommentsRepository(): MockedCommentsRepository {
  return {
    clearAll: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    findById: vi.fn(),
    findByPostId: vi.fn(),
    recomputeLikeCounters: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    updateContent: vi.fn().mockResolvedValue(undefined),
  };
}

function buildPostDoc(overrides: Partial<PostDoc> = {}): PostDoc {
  return {
    blogId: 1,
    blogName: "Test Blog",
    content: "Post content",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    dislikesCount: 0,
    id: 100,
    likesCount: 0,
    shortDescription: "short",
    title: "Post title",
    ...overrides,
  };
}

function buildPostsRepository(): MockedPostsRepository {
  return {
    findById: vi.fn(),
  };
}

function buildService({
  commentLikesRepository = buildCommentLikesRepository(),
  commentsRepository = buildCommentsRepository(),
  postsRepository = buildPostsRepository(),
}: {
  commentLikesRepository?: MockedCommentLikesRepository;
  commentsRepository?: MockedCommentsRepository;
  postsRepository?: MockedPostsRepository;
} = {}): {
  commentLikesRepository: MockedCommentLikesRepository;
  commentsRepository: MockedCommentsRepository;
  postsRepository: MockedPostsRepository;
  service: CommentsService;
} {
  const service = new CommentsService(
    commentsRepository as unknown as CommentsRepository,
    commentLikesRepository as unknown as CommentLikesRepository,
    postsRepository as unknown as PostsRepository,
  );
  return { commentLikesRepository, commentsRepository, postsRepository, service };
}

const defaultQuery: CommentsQuery = {
  pageNumber: 1,
  pageSize: 10,
  sortBy: "createdAt",
  sortDirection: "desc",
};

describe("CommentsService", () => {
  describe("createPostComment", () => {
    it("creates a comment for an existing post and returns the view with myStatus None", async () => {
      const commentsRepository = buildCommentsRepository();
      const postsRepository = buildPostsRepository();
      postsRepository.findById.mockResolvedValue(buildPostDoc({ id: 100 }));
      const created = buildCommentDoc({
        commentatorUserId: 7,
        commentatorUserLogin: "bob",
        content: "A perfectly valid long comment body",
        id: 42,
        postId: 100,
      });
      commentsRepository.create.mockResolvedValue(created);

      const { service } = buildService({ commentsRepository, postsRepository });

      const view = await service.createPostComment({
        currentUser: { login: "bob", userId: 7 },
        input: { content: "A perfectly valid long comment body" },
        postId: 100,
      });

      expect(commentsRepository.create).toHaveBeenCalledWith({
        commentatorUserId: 7,
        commentatorUserLogin: "bob",
        content: "A perfectly valid long comment body",
        postId: 100,
      });
      expect(view).toEqual({
        commentatorInfo: { userId: 7, userLogin: "bob" },
        content: "A perfectly valid long comment body",
        createdAt: created.createdAt.toISOString(),
        id: 42,
        likesInfo: { dislikesCount: 0, likesCount: 0, myStatus: "None" },
      });
    });

    it("throws NotFoundError when the post does not exist", async () => {
      const postsRepository = buildPostsRepository();
      postsRepository.findById.mockResolvedValue(null);

      const { service } = buildService({ postsRepository });

      await expect(
        service.createPostComment({
          currentUser: { login: "bob", userId: 7 },
          input: { content: "Content of valid length here." },
          postId: 999,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateComment", () => {
    it("updates the content when the caller owns the comment", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(
        buildCommentDoc({ commentatorUserId: 5, id: 1 }),
      );

      const { service } = buildService({ commentsRepository });

      await service.updateComment({
        commentId: 1,
        currentUserId: 5,
        input: { content: "Brand new comment content of valid length" },
      });

      expect(commentsRepository.updateContent).toHaveBeenCalledWith(
        1,
        "Brand new comment content of valid length",
      );
    });

    it("throws NotFoundError when the comment does not exist", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(null);

      const { service } = buildService({ commentsRepository });

      await expect(
        service.updateComment({
          commentId: 999,
          currentUserId: 1,
          input: { content: "Content of valid length here." },
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("throws ForbiddenError when the caller is not the owner", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(buildCommentDoc({ commentatorUserId: 5 }));

      const { service } = buildService({ commentsRepository });

      await expect(
        service.updateComment({
          commentId: 1,
          currentUserId: 999,
          input: { content: "Content of valid length here." },
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(commentsRepository.updateContent).not.toHaveBeenCalled();
    });
  });

  describe("deleteComment", () => {
    it("removes the comment when the caller owns it", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(
        buildCommentDoc({ commentatorUserId: 5, id: 3 }),
      );

      const { service } = buildService({ commentsRepository });

      await service.deleteComment({ commentId: 3, currentUserId: 5 });

      expect(commentsRepository.remove).toHaveBeenCalledWith(3);
    });

    it("throws NotFoundError when the comment does not exist", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(null);

      const { service } = buildService({ commentsRepository });

      await expect(
        service.deleteComment({ commentId: 1, currentUserId: 5 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("throws ForbiddenError when the caller is not the owner", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(buildCommentDoc({ commentatorUserId: 5 }));

      const { service } = buildService({ commentsRepository });

      await expect(
        service.deleteComment({ commentId: 1, currentUserId: 999 }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(commentsRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe("getCommentById", () => {
    it("returns the view with myStatus None when no viewer is provided", async () => {
      const commentsRepository = buildCommentsRepository();
      const doc = buildCommentDoc({ dislikesCount: 1, id: 7, likesCount: 3 });
      commentsRepository.findById.mockResolvedValue(doc);
      const commentLikesRepository = buildCommentLikesRepository();

      const { service } = buildService({ commentLikesRepository, commentsRepository });

      const view = await service.getCommentById({ commentId: 7 });

      expect(view).toMatchObject({
        id: 7,
        likesInfo: { dislikesCount: 1, likesCount: 3, myStatus: "None" },
      });
      expect(commentLikesRepository.findOne).not.toHaveBeenCalled();
    });

    it("maps the viewer's persisted like status into the view", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(buildCommentDoc({ id: 7 }));
      const commentLikesRepository = buildCommentLikesRepository();
      commentLikesRepository.findOne.mockResolvedValue("Like");

      const { service } = buildService({ commentLikesRepository, commentsRepository });

      const view = await service.getCommentById({ commentId: 7, currentUserId: 11 });

      expect(view.likesInfo.myStatus).toBe("Like");
      expect(commentLikesRepository.findOne).toHaveBeenCalledWith({ commentId: 7, userId: 11 });
    });

    it("throws NotFoundError when the comment does not exist", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(null);

      const { service } = buildService({ commentsRepository });

      await expect(service.getCommentById({ commentId: 999 })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("listPostComments", () => {
    it("returns a paginated list with per-item myStatus resolved for the viewer", async () => {
      const postsRepository = buildPostsRepository();
      postsRepository.findById.mockResolvedValue(buildPostDoc({ id: 100 }));

      const commentsRepository = buildCommentsRepository();
      const items = [
        buildCommentDoc({ id: 1, postId: 100 }),
        buildCommentDoc({ id: 2, postId: 100 }),
      ];
      commentsRepository.findByPostId.mockResolvedValue({ items, totalCount: 2 });

      const commentLikesRepository = buildCommentLikesRepository();
      const statusMap = new Map<number, LikeStatus>([
        [1, "Like"],
        [2, "Dislike"],
      ]);
      commentLikesRepository.findByCommentIdsForUser.mockResolvedValue(statusMap);

      const { service } = buildService({
        commentLikesRepository,
        commentsRepository,
        postsRepository,
      });

      const result = await service.listPostComments({
        currentUserId: 42,
        postId: 100,
        query: defaultQuery,
      });

      expect(result).toMatchObject({
        page: 1,
        pagesCount: 1,
        pageSize: 10,
        totalCount: 2,
      });
      expect(result.items[0]?.likesInfo.myStatus).toBe("Like");
      expect(result.items[1]?.likesInfo.myStatus).toBe("Dislike");
      expect(commentLikesRepository.findByCommentIdsForUser).toHaveBeenCalledWith({
        commentIds: [1, 2],
        userId: 42,
      });
    });

    it("skips the like-status lookup when no viewer is provided", async () => {
      const postsRepository = buildPostsRepository();
      postsRepository.findById.mockResolvedValue(buildPostDoc({ id: 100 }));

      const commentsRepository = buildCommentsRepository();
      commentsRepository.findByPostId.mockResolvedValue({
        items: [buildCommentDoc({ id: 1, postId: 100 })],
        totalCount: 1,
      });

      const commentLikesRepository = buildCommentLikesRepository();

      const { service } = buildService({
        commentLikesRepository,
        commentsRepository,
        postsRepository,
      });

      const result = await service.listPostComments({ postId: 100, query: defaultQuery });

      expect(result.items[0]?.likesInfo.myStatus).toBe("None");
      expect(commentLikesRepository.findByCommentIdsForUser).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the post does not exist", async () => {
      const postsRepository = buildPostsRepository();
      postsRepository.findById.mockResolvedValue(null);

      const { service } = buildService({ postsRepository });

      await expect(
        service.listPostComments({ postId: 999, query: defaultQuery }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("setLikeStatus", () => {
    it("upserts a Like and recomputes counters", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(buildCommentDoc({ id: 5 }));
      const commentLikesRepository = buildCommentLikesRepository();

      const { service } = buildService({ commentLikesRepository, commentsRepository });

      await service.setLikeStatus({ commentId: 5, currentUserId: 1, newStatus: "Like" });

      expect(commentLikesRepository.upsertAndReturnPreviousStatus).toHaveBeenCalledWith({
        commentId: 5,
        status: "Like",
        userId: 1,
      });
      expect(commentLikesRepository.deleteAndReturnPreviousStatus).not.toHaveBeenCalled();
      expect(commentsRepository.recomputeLikeCounters).toHaveBeenCalledWith(5);
    });

    it("upserts a Dislike and recomputes counters", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(buildCommentDoc({ id: 5 }));
      const commentLikesRepository = buildCommentLikesRepository();

      const { service } = buildService({ commentLikesRepository, commentsRepository });

      await service.setLikeStatus({ commentId: 5, currentUserId: 1, newStatus: "Dislike" });

      expect(commentLikesRepository.upsertAndReturnPreviousStatus).toHaveBeenCalledWith({
        commentId: 5,
        status: "Dislike",
        userId: 1,
      });
    });

    it("deletes the like row when transitioning to None and recomputes counters", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(buildCommentDoc({ id: 5 }));
      const commentLikesRepository = buildCommentLikesRepository();

      const { service } = buildService({ commentLikesRepository, commentsRepository });

      await service.setLikeStatus({ commentId: 5, currentUserId: 1, newStatus: "None" });

      expect(commentLikesRepository.deleteAndReturnPreviousStatus).toHaveBeenCalledWith({
        commentId: 5,
        userId: 1,
      });
      expect(commentLikesRepository.upsertAndReturnPreviousStatus).not.toHaveBeenCalled();
      expect(commentsRepository.recomputeLikeCounters).toHaveBeenCalledWith(5);
    });

    it("throws NotFoundError when the comment does not exist", async () => {
      const commentsRepository = buildCommentsRepository();
      commentsRepository.findById.mockResolvedValue(null);

      const { service } = buildService({ commentsRepository });

      await expect(
        service.setLikeStatus({ commentId: 999, currentUserId: 1, newStatus: "Like" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("clearAllComments", () => {
    it("clears comment likes before clearing comments", async () => {
      const commentsRepository = buildCommentsRepository();
      const commentLikesRepository = buildCommentLikesRepository();
      const callOrder: string[] = [];
      commentLikesRepository.clearAll.mockImplementation(async () => {
        callOrder.push("likes");
      });
      commentsRepository.clearAll.mockImplementation(async () => {
        callOrder.push("comments");
      });

      const { service } = buildService({ commentLikesRepository, commentsRepository });

      await service.clearAllComments();

      expect(callOrder).toEqual(["likes", "comments"]);
    });
  });
});
