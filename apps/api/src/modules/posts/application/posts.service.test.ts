import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BlogDoc } from "../../blogs/domain/blog.entity.js";
import type { PostDoc } from "../domain/post.entity.js";

import { BadRequestError, NotFoundError } from "../../../core/exceptions/errors.js";
import { BlogsRepository } from "../../blogs/infrastructure/blogs.repository.js";
import { PostLikesRepository } from "../infrastructure/post-likes.repository.js";
import { PostsRepository } from "../infrastructure/posts.repository.js";
import { PostsService } from "./posts.service.js";

type MockedBlogsRepository = {
  findById: ReturnType<typeof vi.fn>;
};

type MockedPostLikesRepository = {
  applyLikeChange: ReturnType<typeof vi.fn>;
  clearAll: ReturnType<typeof vi.fn>;
  findByPostIdsForUser: ReturnType<typeof vi.fn>;
  findNewestLikesByPostIds: ReturnType<typeof vi.fn>;
};

type MockedPostsRepository = {
  clearAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findPage: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function buildBlogDoc(overrides: Partial<BlogDoc> = {}): BlogDoc {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    description: "Blog description",
    id: 10,
    isMembership: false,
    name: "Sample Blog",
    websiteUrl: "https://example.com",
    ...overrides,
  };
}

function buildBlogsRepository(): MockedBlogsRepository {
  return { findById: vi.fn() };
}

function buildPostDoc(overrides: Partial<PostDoc> = {}): PostDoc {
  return {
    blogId: 10,
    blogName: "Sample Blog",
    content: "Body text",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    dislikesCount: 0,
    id: 100,
    likesCount: 0,
    shortDescription: "Short",
    title: "Title",
    ...overrides,
  };
}

function buildPostLikesRepository(): MockedPostLikesRepository {
  return {
    applyLikeChange: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
    findByPostIdsForUser: vi.fn().mockResolvedValue(new Map()),
    findNewestLikesByPostIds: vi.fn().mockResolvedValue(new Map()),
  };
}

function buildPostsRepository(): MockedPostsRepository {
  return {
    clearAll: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    findById: vi.fn(),
    findPage: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
  };
}

function buildService({
  blogsRepository = buildBlogsRepository(),
  postLikesRepository = buildPostLikesRepository(),
  postsRepository = buildPostsRepository(),
}: {
  blogsRepository?: MockedBlogsRepository;
  postLikesRepository?: MockedPostLikesRepository;
  postsRepository?: MockedPostsRepository;
} = {}): {
  blogsRepository: MockedBlogsRepository;
  postLikesRepository: MockedPostLikesRepository;
  postsRepository: MockedPostsRepository;
  service: PostsService;
} {
  const service = new PostsService(
    blogsRepository as unknown as BlogsRepository,
    postsRepository as unknown as PostsRepository,
    postLikesRepository as unknown as PostLikesRepository,
  );
  return { blogsRepository, postLikesRepository, postsRepository, service };
}

const validInput = {
  blogId: 10,
  content: "Body text",
  shortDescription: "Short",
  title: "Title",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PostsService.createPost", () => {
  it("resolves the blog name from the blogs repository and persists the post", async () => {
    const blog = buildBlogDoc();
    const persisted = buildPostDoc();
    const { blogsRepository, postsRepository, service } = buildService();
    blogsRepository.findById.mockResolvedValue(blog);
    postsRepository.create.mockResolvedValue(persisted);

    const view = await service.createPost(validInput);

    expect(blogsRepository.findById).toHaveBeenCalledWith(validInput.blogId);
    expect(postsRepository.create).toHaveBeenCalledWith({
      blogId: blog.id,
      blogName: blog.name,
      content: validInput.content,
      shortDescription: validInput.shortDescription,
      title: validInput.title,
    });
    expect(view).toMatchObject({
      blogId: persisted.blogId,
      blogName: persisted.blogName,
      content: persisted.content,
      extendedLikesInfo: {
        dislikesCount: 0,
        likesCount: 0,
        myStatus: "None",
        newestLikes: [],
      },
      id: persisted.id,
    });
  });

  it("throws BadRequestError with field 'blogId' when the referenced blog does not exist", async () => {
    const { blogsRepository, postsRepository, service } = buildService();
    blogsRepository.findById.mockResolvedValue(null);

    await expect(service.createPost(validInput)).rejects.toBeInstanceOf(BadRequestError);
    await expect(service.createPost(validInput)).rejects.toMatchObject({
      fields: [{ field: "blogId", message: "blog not found" }],
    });
    expect(postsRepository.create).not.toHaveBeenCalled();
  });
});

describe("PostsService.updatePost", () => {
  it("updates the post when it exists and the blog exists", async () => {
    const existing = buildPostDoc();
    const blog = buildBlogDoc();
    const { blogsRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(existing);
    blogsRepository.findById.mockResolvedValue(blog);
    postsRepository.update.mockResolvedValue(existing);

    await service.updatePost(existing.id, validInput);

    expect(postsRepository.update).toHaveBeenCalledWith(existing.id, {
      blogId: blog.id,
      blogName: blog.name,
      content: validInput.content,
      shortDescription: validInput.shortDescription,
      title: validInput.title,
    });
  });

  it("throws NotFoundError when the post does not exist", async () => {
    const { postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(null);

    await expect(service.updatePost(999, validInput)).rejects.toBeInstanceOf(NotFoundError);
    expect(postsRepository.update).not.toHaveBeenCalled();
  });

  it("throws BadRequestError with field 'blogId' when the new blogId does not exist", async () => {
    const existing = buildPostDoc();
    const { blogsRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(existing);
    blogsRepository.findById.mockResolvedValue(null);

    await expect(service.updatePost(existing.id, validInput)).rejects.toMatchObject({
      fields: [{ field: "blogId", message: "blog not found" }],
    });
    expect(postsRepository.update).not.toHaveBeenCalled();
  });
});

describe("PostsService.deletePost", () => {
  it("resolves when the post was removed", async () => {
    const { postsRepository, service } = buildService();
    postsRepository.remove.mockResolvedValue(true);

    await expect(service.deletePost(100)).resolves.toBeUndefined();
    expect(postsRepository.remove).toHaveBeenCalledWith(100);
  });

  it("throws NotFoundError when nothing was removed", async () => {
    const { postsRepository, service } = buildService();
    postsRepository.remove.mockResolvedValue(false);

    await expect(service.deletePost(100)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("PostsService.getPostById", () => {
  it("returns a PostViewModel with myStatus 'None' and empty newestLikes when no viewer", async () => {
    const doc = buildPostDoc();
    const { postLikesRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(doc);

    const view = await service.getPostById({ postId: doc.id });

    expect(view.extendedLikesInfo.myStatus).toBe("None");
    expect(view.extendedLikesInfo.newestLikes).toEqual([]);
    expect(postLikesRepository.findByPostIdsForUser).not.toHaveBeenCalled();
  });

  it("returns myStatus from likes repository when a viewer is provided", async () => {
    const doc = buildPostDoc();
    const { postLikesRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(doc);
    postLikesRepository.findByPostIdsForUser.mockResolvedValue(new Map([[doc.id, "Like"]]));
    postLikesRepository.findNewestLikesByPostIds.mockResolvedValue(
      new Map([
        [
          doc.id,
          [{ addedAt: new Date("2026-03-01T00:00:00.000Z"), userId: 5, userLogin: "lover" }],
        ],
      ]),
    );

    const view = await service.getPostById({ currentUserId: 5, postId: doc.id });

    expect(view.extendedLikesInfo.myStatus).toBe("Like");
    expect(view.extendedLikesInfo.newestLikes).toEqual([
      { addedAt: "2026-03-01T00:00:00.000Z", login: "lover", userId: 5 },
    ]);
  });

  it("throws NotFoundError when the post is missing", async () => {
    const { postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(null);

    await expect(service.getPostById({ postId: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("PostsService.setLikeStatus", () => {
  it("throws NotFoundError when the post does not exist", async () => {
    const { postLikesRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(null);

    await expect(
      service.setLikeStatus({
        currentUserId: 1,
        currentUserLogin: "alice",
        newStatus: "Like",
        postId: 999,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(postLikesRepository.applyLikeChange).not.toHaveBeenCalled();
  });

  it("delegates Like to applyLikeChange with the resolved user identity", async () => {
    const doc = buildPostDoc();
    const { postLikesRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(doc);

    await service.setLikeStatus({
      currentUserId: 1,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId: doc.id,
    });

    expect(postLikesRepository.applyLikeChange).toHaveBeenCalledWith({
      newStatus: "Like",
      postId: doc.id,
      userId: 1,
      userLogin: "alice",
    });
  });

  it("delegates Dislike to applyLikeChange", async () => {
    const doc = buildPostDoc();
    const { postLikesRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(doc);

    await service.setLikeStatus({
      currentUserId: 1,
      currentUserLogin: "alice",
      newStatus: "Dislike",
      postId: doc.id,
    });

    expect(postLikesRepository.applyLikeChange).toHaveBeenCalledWith({
      newStatus: "Dislike",
      postId: doc.id,
      userId: 1,
      userLogin: "alice",
    });
  });

  it("delegates None to applyLikeChange", async () => {
    const doc = buildPostDoc();
    const { postLikesRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(doc);

    await service.setLikeStatus({
      currentUserId: 1,
      currentUserLogin: "alice",
      newStatus: "None",
      postId: doc.id,
    });

    expect(postLikesRepository.applyLikeChange).toHaveBeenCalledWith({
      newStatus: "None",
      postId: doc.id,
      userId: 1,
      userLogin: "alice",
    });
  });

  it("calls applyLikeChange exactly once per setLikeStatus invocation", async () => {
    const doc = buildPostDoc();
    const { postLikesRepository, postsRepository, service } = buildService();
    postsRepository.findById.mockResolvedValue(doc);

    await service.setLikeStatus({
      currentUserId: 1,
      currentUserLogin: "alice",
      newStatus: "Like",
      postId: doc.id,
    });

    expect(postLikesRepository.applyLikeChange).toHaveBeenCalledTimes(1);
  });
});

describe("PostsService.clearAllPosts", () => {
  it("clears post likes and posts in order", async () => {
    const { postLikesRepository, postsRepository, service } = buildService();

    await service.clearAllPosts();

    expect(postLikesRepository.clearAll).toHaveBeenCalledTimes(1);
    expect(postsRepository.clearAll).toHaveBeenCalledTimes(1);
  });
});

describe("PostsService.getAllPosts", () => {
  const query = {
    pageNumber: 1,
    pageSize: 10,
    sortBy: "createdAt" as const,
    sortDirection: "desc" as const,
  };

  it("returns an empty paginator when no posts exist", async () => {
    const { postsRepository, service } = buildService();
    postsRepository.findPage.mockResolvedValue({ items: [], totalCount: 0 });

    const result = await service.getAllPosts({ query });

    expect(result).toEqual({
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });

  it("maps every doc to a view and reuses viewer status from the likes repository", async () => {
    const first = buildPostDoc({ id: 1 });
    const second = buildPostDoc({ id: 2, title: "Second" });
    const { postLikesRepository, postsRepository, service } = buildService();
    postsRepository.findPage.mockResolvedValue({ items: [first, second], totalCount: 2 });
    postLikesRepository.findByPostIdsForUser.mockResolvedValue(new Map([[first.id, "Dislike"]]));

    const result = await service.getAllPosts({ currentUserId: 42, query });

    expect(result.totalCount).toBe(2);
    expect(result.items[0]?.extendedLikesInfo.myStatus).toBe("Dislike");
    expect(result.items[1]?.extendedLikesInfo.myStatus).toBe("None");
    expect(postLikesRepository.findByPostIdsForUser).toHaveBeenCalledWith({
      postIds: [first.id, second.id],
      userId: 42,
    });
  });
});
