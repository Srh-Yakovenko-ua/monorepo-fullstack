import { Module } from "@nestjs/common";

import { BlogsModule } from "../blogs/blogs.module.js";
import { CommentsModule } from "../comments/comments.module.js";
import { PairQuizGameModule } from "../pair-quiz-game/pair-quiz-game.module.js";
import { PostsModule } from "../posts/posts.module.js";
import { QuizQuestionsModule } from "../quiz-questions/quiz-questions.module.js";
import { SecurityModule } from "../user-accounts/security/security.module.js";
import { UsersModule } from "../user-accounts/users/users.module.js";
import { VideosModule } from "../videos/videos.module.js";
import { TestingController } from "./testing.controller.js";

@Module({
  controllers: [TestingController],
  imports: [
    BlogsModule,
    CommentsModule,
    PairQuizGameModule,
    PostsModule,
    QuizQuestionsModule,
    SecurityModule,
    UsersModule,
    VideosModule,
  ],
})
export class TestingModule {}
