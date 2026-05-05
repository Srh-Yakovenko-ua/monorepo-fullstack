import type { BlogLookupItem, BlogViewModel, Paginator } from "@app/shared";

import { BlogInputSchema, BlogsQuerySchema } from "@app/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { ZodBodyPipe } from "../../../../core/pipes/zod-body.pipe.js";
import { ZodQueryPipe } from "../../../../core/pipes/zod-query.pipe.js";
import { BlogsService } from "../application/blogs.service.js";
import { BlogInputDto } from "./input-dto/blog-input.dto.js";
import { BlogsQueryDto } from "./input-dto/blogs-query.dto.js";

@ApiTags("Blogs")
@Controller("api/blogs")
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @ApiBody({ type: BlogInputDto })
  @ApiOperation({ summary: "Create a blog" })
  @ApiResponse({ description: "Blog created", status: 201 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  createBlog(@Body(new ZodBodyPipe(BlogInputSchema)) body: BlogInputDto): Promise<BlogViewModel> {
    return this.blogsService.createBlog(body);
  }

  @ApiOperation({ summary: "Delete a blog by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Blog deleted", status: 204 })
  @ApiResponse({ description: "Blog not found", status: 404 })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBlog(@Param("id") id: string): Promise<void> {
    return this.blogsService.deleteBlog(id);
  }

  @ApiOperation({ summary: "List blogs as lightweight lookup items" })
  @ApiQuery({ type: BlogsQueryDto })
  @ApiResponse({ description: "Paginated lookup items", status: 200 })
  @ApiResponse({ description: "Invalid query parameters", status: 400 })
  @Get("lookup")
  listBlogLookup(
    @Query(new ZodQueryPipe(BlogsQuerySchema)) query: BlogsQueryDto,
  ): Promise<Paginator<BlogLookupItem>> {
    return this.blogsService.getBlogLookup(query);
  }

  @ApiOperation({ summary: "List all blogs" })
  @ApiQuery({ type: BlogsQueryDto })
  @ApiResponse({ description: "Paginated list of blogs", status: 200 })
  @ApiResponse({ description: "Invalid query parameters", status: 400 })
  @Get()
  listBlogs(
    @Query(new ZodQueryPipe(BlogsQuerySchema)) query: BlogsQueryDto,
  ): Promise<Paginator<BlogViewModel>> {
    return this.blogsService.getAllBlogs(query);
  }

  @ApiOperation({ summary: "Get a blog by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Blog found", status: 200 })
  @ApiResponse({ description: "Blog not found", status: 404 })
  @Get(":id")
  getBlog(@Param("id") id: string): Promise<BlogViewModel> {
    return this.blogsService.getBlogById(id);
  }

  @ApiBody({ type: BlogInputDto })
  @ApiOperation({ summary: "Update a blog by id" })
  @ApiParam({ name: "id" })
  @ApiResponse({ description: "Blog updated", status: 204 })
  @ApiResponse({ description: "Validation failed", status: 400 })
  @ApiResponse({ description: "Blog not found", status: 404 })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(":id")
  updateBlog(
    @Param("id") id: string,
    @Body(new ZodBodyPipe(BlogInputSchema)) body: BlogInputDto,
  ): Promise<void> {
    return this.blogsService.updateBlog(id, body);
  }
}
