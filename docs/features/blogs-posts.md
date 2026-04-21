# Blogs + Posts

**Status**: active
**Last updated**: 2026-04-20
**Curator**: feature-context-curator

## Purpose

Blogs are content channels with a name, description, and website URL. Posts belong to a blog and carry a title, short description, and full content. Both are browsed as card grids; all mutations (create, edit, delete) happen in modals — there are no dedicated detail routes.

## User-visible behavior

- `/blogs` renders a responsive grid of up to 15 most-recent blogs (`BlogsPage`, `blogs-page.tsx:38`)
- `/posts` renders a grid of up to 15 most-recent posts (`PostsPage`, `posts-page.tsx:38`)
- Clicking a card thumbnail or title opens a read-only view modal
- The ⋯ button on each card expands a dropdown: Open / Edit / Delete
- Edit opens a form modal pre-filled with the current record
- Delete fires `modalObserver.addModal(ModalId.Confirm, …)` which renders a generic confirm dialog
- All mutations fire a `sonner` toast on success (created / updated / deleted)
- The post form contains a `<Select>` that lists all blogs; submit is disabled when no blogs exist

## End-to-end data flow — create a blog

1. User clicks "New blog" button at `apps/web/src/features/blogs/pages/blogs-page.tsx:78`
2. `setCreateOpen(true)` renders `<BlogFormDialog mode="create" …>` at `blogs-page.tsx:139`
3. RHF + `BlogInputSchema` (from `@app/shared`) validates on submit — `blog-form-dialog.tsx:44`
4. `useCreateBlog().mutateAsync(values)` fires — `blog-form-dialog.tsx:63`
5. `blogsApi.create(input)` calls `request<BlogViewModel>` at `apps/web/src/features/blogs/api.ts:13`
6. `request<T>` prepends `env.VITE_API_BASE_URL` and `POST /api/blogs` — `apps/web/src/lib/http-client.ts:27`
7. Vite proxies `/api/*` to `localhost:4000` — `apps/web/vite.config.ts`
8. Express: `request-id` middleware adds `x-request-id`, `request-logger` logs the request
9. Router matches `POST /api/blogs` — `apps/api/src/routes/blogs.routes.ts:17`
10. `createBlog` controller parses body with `BlogInputSchema.safeParse` — `apps/api/src/controllers/blogs.controller.ts:17`
    - On failure: `400 + ApiErrorResult` (`mapZodError` at `controllers/blogs.controller.ts:19`)
11. `blogsService.createBlog(parsed.data)` — `apps/api/src/services/blogs.service.ts:10`
12. `blogsRepository.create(…)` calls `BlogModel.create(input)` — `apps/api/src/db/repositories/blogs.repository.ts:9`
13. `toViewModel` maps `_id.toHexString()` → `id`, `createdAt.toISOString()` — `blogs.repository.ts:42`
14. Response: `201 + BlogViewModel`
15. On 4xx: `ApiError` is thrown from `http-client.ts:41`; form fields are set via `form.setError` — `blog-form-dialog.tsx:73`
16. On success: `queryClient.invalidateQueries({ queryKey: blogsKeys.all })` — `use-blog-mutations.ts:11`
17. `useBlogs()` refetches, `BlogsPage` re-renders with new card, `toast.success` fires

## End-to-end data flow — delete a post (confirm modal path)

1. User selects Delete from the ⋯ menu on a `PostCard` — `posts-page.tsx:235`
2. `handleDelete` calls `modalObserver.addModal(ModalId.Confirm, { onConfirm, … })` — `posts-page.tsx:184`
3. `ModalsRoot` (mounted in `App.tsx`) renders `ConfirmModal` lazily — `apps/web/src/features/modals/lib/modal-registry.ts:29`
4. User confirms → `deletePost.mutateAsync(post.id)` — `posts-page.tsx:188`
5. `postsApi.remove(id)` sends `DELETE /api/posts/:id` — `apps/web/src/features/posts/api.ts:16`
6. `deletePost` controller calls `postsService.deletePost(req.params.id)` — `apps/api/src/controllers/posts.controller.ts:32`
7. `postsRepository.remove(id)` calls `PostModel.findByIdAndDelete(id)` — `apps/api/src/db/repositories/posts.repository.ts:21`
8. Service throws `NotFoundError` if `remove` returns `false` — `posts.service.ts:27`; `errorHandler` maps it to `404`
9. Response: `204`
10. `queryClient.invalidateQueries({ queryKey: postsKeys.all })` — `use-post-mutations.ts:11`
11. Grid re-renders without the deleted card, `toast.success` fires

## HTTP API

### Blogs

| Method | Path             | Success | Errors   | Request body | Response body     |
| ------ | ---------------- | ------- | -------- | ------------ | ----------------- |
| GET    | `/api/blogs`     | 200     | —        | —            | `BlogViewModel[]` |
| POST   | `/api/blogs`     | 201     | 400      | `BlogInput`  | `BlogViewModel`   |
| GET    | `/api/blogs/:id` | 200     | 404      | —            | `BlogViewModel`   |
| PUT    | `/api/blogs/:id` | 204     | 400, 404 | `BlogInput`  | —                 |
| DELETE | `/api/blogs/:id` | 204     | 404      | —            | —                 |

### Posts

| Method | Path             | Success | Errors   | Request body | Response body     |
| ------ | ---------------- | ------- | -------- | ------------ | ----------------- |
| GET    | `/api/posts`     | 200     | —        | —            | `PostViewModel[]` |
| POST   | `/api/posts`     | 201     | 400      | `PostInput`  | `PostViewModel`   |
| GET    | `/api/posts/:id` | 200     | 404      | —            | `PostViewModel`   |
| PUT    | `/api/posts/:id` | 204     | 400, 404 | `PostInput`  | —                 |
| DELETE | `/api/posts/:id` | 204     | 404      | —            | —                 |

`POST /api/posts` and `PUT /api/posts/:id` return `400 + { errorsMessages: [{ field: "blogId", message: "blog not found" }] }` when the supplied `blogId` is not found — this is a service-level check, not a Zod error (`posts.service.ts:14`, `posts.controller.ts:24`).

400 bodies always use the shared `ApiErrorResult` shape: `{ errorsMessages: FieldError[] }`.

## Backend

### Routes

- `apps/api/src/routes/blogs.routes.ts:16–20` — maps five verbs to controller functions; OpenAPI registered via `registerPaths` at lines 31–107
- `apps/api/src/routes/posts.routes.ts:16–20` — same pattern; OpenAPI at lines 32–108

### Controllers

- `apps/api/src/controllers/blogs.controller.ts`
  - `createBlog` (line 16): `BlogInputSchema.safeParse` → `blogsService.createBlog` → 201
  - `updateBlog` (line 40): `BlogInputSchema.safeParse` → `blogsService.updateBlog` → 204
  - `deleteBlog` (line 26): delegates entirely to service; `NotFoundError` surfaces through `errorHandler`
  - `listBlogs` (line 36), `getBlog` (line 31)
- `apps/api/src/controllers/posts.controller.ts`
  - `createPost` (line 16): Zod parse, then checks `{ blogIdNotFound: true }` → 400 with `fieldError("blogId", "blog not found")`
  - `updatePost` (line 46): same blogId check on line 57
  - `deletePost` (line 32), `listPosts` (line 42), `getPost` (line 37)

### Services

- `apps/api/src/services/blogs.service.ts`
  - `createBlog` (line 10): delegates directly to repository; no invariants beyond schema
  - `deleteBlog` (line 18): throws `NotFoundError` if `repository.remove` returns `false`
  - `updateBlog` (line 33): `findById` first for 404, then `update`
- `apps/api/src/services/posts.service.ts`
  - `createPost` (line 11): returns `PostViewModel | { blogIdNotFound: true }` — discriminated union, not an exception
  - `updatePost` (line 41): checks post existence (throws `NotFoundError`), then blog existence (returns `{ blogIdNotFound: true }`)
  - `blogName` is denormalized: copied from the blog at create/update time; no sync on blog rename

### Repositories

- `apps/api/src/db/repositories/blogs.repository.ts` — `BlogModel` CRUD; `toViewModel` at line 42 converts `_id` → hex string, `createdAt` → ISO string
- `apps/api/src/db/repositories/posts.repository.ts` — `PostModel` CRUD; `toViewModel` at line 43; `findByIdAndUpdate` uses `{ returnDocument: "after" }`

### Models

- `apps/api/src/db/models/blog.model.ts:11` — `BlogDoc`: `name`, `description`, `websiteUrl`, `isMembership` (default `false`), `createdAt` (default `Date.now`); `timestamps: false`, `versionKey: false`
- `apps/api/src/db/models/post.model.ts:11` — `PostDoc`: `title`, `shortDescription`, `content`, `blogId` (string, not ObjectId ref), `blogName`, `createdAt`

### Middleware touched

- `request-id` — adds `x-request-id` to every response
- `request-logger` — pino structured log per request
- `errorHandler` — maps `HttpError` subclasses (e.g. `NotFoundError`) to JSON responses with `requestId`

## Shared contracts

Location: `packages/shared/src/index.ts`

- `BlogInputSchema` (line 72) — Zod schema; `websiteUrl` validation messages are i18n keys (`"blogs.form.errors.websiteUrlInvalid"`, `"blogs.form.errors.websiteUrlTooLong"`) — both BE and FE receive the key string unchanged; FE resolves it via `FieldError` + `t()`
- `BlogInput = z.infer<typeof BlogInputSchema>` (line 84)
- `BlogViewModel` (line 86) — `{ id, name, description, websiteUrl, isMembership, createdAt }`
- `PostInputSchema` (line 95) — `blogId`, `title`, `shortDescription`, `content`
- `PostInput = z.infer<typeof PostInputSchema>` (line 102)
- `PostViewModel` (line 104) — `{ id, blogId, blogName, title, shortDescription, content, createdAt }`
- `FieldError` (line 32), `ApiErrorResult` (line 26) — error shapes consumed by both sides

Any change to these is a breaking contract change — FE and BE must move together.

## Frontend

### Routes

- `apps/web/src/App.tsx:31–32` — `{ path: "blogs", element: lazyRoute(BlogsPage) }`, `{ path: "posts", element: lazyRoute(PostsPage) }`
- No `/blogs/:id` or `/posts/:id` routes exist; all detail/edit/delete flows are modal-only

### `api.ts`

- `apps/web/src/features/blogs/api.ts` — `blogsApi.{ list, create, getById, update, remove }`, `blogsKeys.{ all, lists, detail }`
- `apps/web/src/features/posts/api.ts` — `postsApi.{ list, create, getById, update, remove }`, `postsKeys.{ all, lists, detail }`

### Hooks

- `apps/web/src/features/blogs/hooks/use-blogs.ts:5` — `useQuery({ queryKey: blogsKeys.lists(), queryFn: blogsApi.list })`
- `apps/web/src/features/blogs/hooks/use-blog-mutations.ts` — `useCreateBlog`, `useDeleteBlog`, `useUpdateBlog(id)`; all invalidate `blogsKeys.all` on success; `useUpdateBlog` also invalidates `blogsKeys.detail(id)` (line 31)
- `apps/web/src/features/posts/hooks/use-posts.ts:5` — `useQuery({ queryKey: postsKeys.lists(), queryFn: postsApi.list })`
- `apps/web/src/features/posts/hooks/use-post-mutations.ts` — `useCreatePost`, `useDeletePost`, `useUpdatePost(id)`; same invalidation pattern

### Components

- `apps/web/src/features/blogs/pages/blogs-page.tsx` — `BlogsPage` + inline `BlogCard`
  - `BlogCard` (line 167): thumbnail button → view modal; `CardActionButton` as `DropdownMenuTrigger`; title button → view modal
  - Create/edit/view state held in `useState` at page level (lines 34–36)
  - Delete from card: `modalObserver.addModal(ModalId.Confirm, …)` at line 192
  - Delete from view dialog: `openViewDelete` at line 45, closes view first then fires confirm modal
- `apps/web/src/features/blogs/components/blog-form-dialog.tsx` — discriminated union props `{ mode: "create" } | { mode: "edit", blog }` (line 28); RHF + `BlogInputSchema`; server field errors mapped back via `form.setError` (line 73); `useEffect` resets form on open (line 52)
- `apps/web/src/features/blogs/components/blog-view-dialog.tsx` — read-only view; passes `onEdit` and `onDelete` callbacks up to page
- `apps/web/src/features/posts/pages/posts-page.tsx` — `PostsPage` + inline `PostCard`; identical structure to blogs
- `apps/web/src/features/posts/components/post-form-dialog.tsx` — additionally renders a `<Select>` populated by `useBlogs()` (line 51); submit disabled when no blogs exist (line 203)
- `apps/web/src/features/posts/components/post-view-dialog.tsx` — shows `blogName` as plain text (line 49), not a link (no blog detail route)

### State

- Server state: TanStack Query — `queryKey: ["blogs", "list"]` / `["posts", "list"]`
- Client state: `useState` in page components for which modal is open and which entity is selected; no Zustand store

## Reusable primitives introduced

- `apps/web/src/components/ui/card-action-button.tsx` — `forwardRef`'d `<button>` absolutely positioned top-right of card thumbnail; `opacity-0 group-hover:opacity-100` with `max-sm:opacity-100`; meant as `DropdownMenuTrigger asChild`; used in `BlogCard` (line 229) and `PostCard` (line 221); intended for `VideoCard` too
- `apps/web/src/components/ui/field-error.tsx` — takes `RHF FieldError`; calls `t(error.message, { defaultValue: error.message })` to resolve i18n-key-based Zod messages with a raw-string fallback; used in both form dialogs

## Observable states

| State   | Blogs page                                                          | Posts page                                        |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| Loading | 6 skeleton cards (`blogs-page.tsx:88`)                              | 6 skeleton cards (`posts-page.tsx:96`)            |
| Error   | Monospace `text-destructive` banner with `error.message` (line 106) | Same (line 113)                                   |
| Empty   | `BookOpen` icon + uppercase mono label (line 113)                   | `FileText` icon + uppercase mono label (line 121) |
| Loaded  | Grid of `BlogCard`s, staggered animate-in                           | Grid of `PostCard`s, staggered animate-in         |
| Success | `toast.success` after any mutation                                  | `toast.success` after any mutation                |

## Tests

### Backend (integration via supertest + MongoMemoryServer)

- `apps/api/src/routes/blogs.routes.test.ts` — 16 test cases: GET list, POST (happy + 6 validation), GET by id + 404, PUT (happy + validation + 404), DELETE (happy + 404)
- `apps/api/src/routes/posts.routes.test.ts` — 17 test cases: same shape plus `blogId` existence checks for POST and PUT

Test setup: `apps/api/src/test/setup.ts` — `MongoMemoryServer` in `beforeAll`, `afterEach` clears all collections, `maxWorkers: 1` in `vitest.config.ts` to avoid shared in-memory DB conflicts.

### Frontend

No FE tests yet for the modal-based UX (view dialogs, form dialogs, confirm modal flow). See Known gaps.

## Known gaps

- No FE tests for `BlogFormDialog`, `BlogViewDialog`, `PostFormDialog`, `PostViewDialog`, or the confirm-modal delete flow
- `PostCard` displays `blogName` as plain static text (`posts-page.tsx:259`) — was a link to `/blogs/:blogId` before the modal-only redesign; that route no longer exists
- `isMembership` is hardcoded `false` in `blog.model.ts:15` — membership logic not implemented
- No pagination: `GET /api/blogs` and `GET /api/posts` return all documents; FE slices to the last 15 client-side (`blogs-page.tsx:38`, `posts-page.tsx:38`)
- `blogName` is denormalized into `PostDoc`; renaming a blog leaves existing posts with the stale name
- No authentication on any endpoint
- `useUpdateBlog` and `useUpdatePost` invalidate `detail(id)` on success but neither `BlogsPage` nor `PostsPage` uses detail queries — the invalidation is harmless but unused
- Videos feature: BE is complete (`/api/videos`, full CRUD, 17 tests); FE slice does not exist yet — see `docs/features/blogs-posts-videos.md` for the BE-only videos doc

## Related

- `docs/features/blogs-posts-videos.md` — BE documentation for all three resources including videos; preserve until a dedicated `videos.md` is written for the FE feature
- `docs/features/health.md` — service liveness probe
- Architecture overview: `docs/architecture.md`
- Canonical feature workflow: `docs/patterns.md`
- `apps/web/src/features/modals/` — `modalObserver`, `ModalId`, `ModalsRoot` used by delete flows in both features
