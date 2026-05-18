import type { BlogInput, BlogsQuery } from "@app/shared";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BlogDoc } from "../domain/blog.entity.js";
import type { BlogLookupDoc, BlogsRepository } from "../infrastructure/blogs.repository.js";

import { NotFoundError } from "../../../core/exceptions/errors.js";
import { BlogsService, toBlogLookupItem, toBlogView } from "./blogs.service.js";

type RepoMock = {
  clearAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findLookupPage: ReturnType<typeof vi.fn>;
  findPage: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function makeDoc(overrides: Partial<BlogDoc> = {}): BlogDoc {
  return {
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    description: "Default description",
    id: 1,
    isMembership: false,
    name: "Default Blog",
    websiteUrl: "https://example.com",
    ...overrides,
  };
}

function makeRepo(): RepoMock {
  return {
    clearAll: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findLookupPage: vi.fn(),
    findPage: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
  };
}

const validInput: BlogInput = {
  description: "Some description",
  name: "Tech Blog",
  websiteUrl: "https://example.com",
};

const validQuery: BlogsQuery = {
  pageNumber: 1,
  pageSize: 10,
  sortBy: "createdAt",
  sortDirection: "desc",
};

let repo: RepoMock;
let service: BlogsService;

beforeEach(() => {
  repo = makeRepo();
  service = new BlogsService(repo as unknown as BlogsRepository);
});

describe("BlogsService.createBlog", () => {
  it("calls repository.create with normalized input and returns the view model", async () => {
    const created = makeDoc({ description: validInput.description, name: validInput.name });
    repo.create.mockResolvedValue(created);

    const result = await service.createBlog(validInput);

    expect(repo.create).toHaveBeenCalledWith({
      description: validInput.description,
      name: validInput.name,
      websiteUrl: validInput.websiteUrl,
    });
    expect(result).toEqual(toBlogView(created));
  });
});

describe("BlogsService.updateBlog", () => {
  it("looks up the blog and calls repository.update on the happy path", async () => {
    const existing = makeDoc();
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(makeDoc({ ...existing, name: "Updated" }));

    await service.updateBlog(existing.id, { ...validInput, name: "Updated" });

    expect(repo.findById).toHaveBeenCalledWith(existing.id);
    expect(repo.update).toHaveBeenCalledWith(existing.id, {
      description: validInput.description,
      name: "Updated",
      websiteUrl: validInput.websiteUrl,
    });
  });

  it("throws NotFoundError without calling update when the blog does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.updateBlog(999, validInput)).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("BlogsService.deleteBlog", () => {
  it("calls repository.remove on the happy path", async () => {
    repo.remove.mockResolvedValue(true);

    await service.deleteBlog(7);

    expect(repo.remove).toHaveBeenCalledWith(7);
  });

  it("throws NotFoundError when the blog does not exist", async () => {
    repo.remove.mockResolvedValue(false);

    await expect(service.deleteBlog(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("BlogsService.getBlogById", () => {
  it("returns the view model on the happy path", async () => {
    const doc = makeDoc();
    repo.findById.mockResolvedValue(doc);

    const result = await service.getBlogById(doc.id);

    expect(repo.findById).toHaveBeenCalledWith(doc.id);
    expect(result).toEqual(toBlogView(doc));
  });

  it("throws NotFoundError when the blog does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getBlogById(404)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("BlogsService.getAllBlogs", () => {
  it("passes the query to the repository and returns a paginated result with view models", async () => {
    const docOne = makeDoc({ id: 1, name: "First" });
    const docTwo = makeDoc({ id: 2, name: "Second" });
    repo.findPage.mockResolvedValue({ items: [docOne, docTwo], totalCount: 2 });

    const result = await service.getAllBlogs(validQuery);

    expect(repo.findPage).toHaveBeenCalledWith(validQuery);
    expect(result).toEqual({
      items: [toBlogView(docOne), toBlogView(docTwo)],
      page: 1,
      pagesCount: 1,
      pageSize: 10,
      totalCount: 2,
    });
  });

  it("returns pagesCount 0 when the repository reports zero items", async () => {
    repo.findPage.mockResolvedValue({ items: [], totalCount: 0 });

    const result = await service.getAllBlogs(validQuery);

    expect(result).toEqual({
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });
});

describe("BlogsService.getBlogLookup", () => {
  it("returns paginated lookup items mapped from the repository", async () => {
    const lookupOne: BlogLookupDoc = { id: 1, name: "First" };
    const lookupTwo: BlogLookupDoc = { id: 2, name: "Second" };
    repo.findLookupPage.mockResolvedValue({ items: [lookupOne, lookupTwo], totalCount: 5 });

    const result = await service.getBlogLookup({ ...validQuery, pageSize: 2 });

    expect(repo.findLookupPage).toHaveBeenCalledWith({ ...validQuery, pageSize: 2 });
    expect(result).toEqual({
      items: [toBlogLookupItem(lookupOne), toBlogLookupItem(lookupTwo)],
      page: 1,
      pagesCount: 3,
      pageSize: 2,
      totalCount: 5,
    });
  });
});

describe("BlogsService.clearAllBlogs", () => {
  it("delegates to repository.clearAll", async () => {
    repo.clearAll.mockResolvedValue(undefined);

    await service.clearAllBlogs();

    expect(repo.clearAll).toHaveBeenCalledTimes(1);
  });
});

describe("toBlogView", () => {
  it("maps BlogDoc to the BlogViewModel shape with ISO createdAt", () => {
    const doc = makeDoc();

    expect(toBlogView(doc)).toEqual({
      createdAt: doc.createdAt.toISOString(),
      description: doc.description,
      id: doc.id,
      isMembership: doc.isMembership,
      name: doc.name,
      websiteUrl: doc.websiteUrl,
    });
  });
});
