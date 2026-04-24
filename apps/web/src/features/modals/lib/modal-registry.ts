import type { BlogViewModel, PostViewModel, VideoViewModel } from "@app/shared";
import type { ComponentType, LazyExoticComponent } from "react";

import { lazy } from "react";

export const ModalId = {
  AlreadyRegistered: "already-registered",
  BlogForm: "blog-form",
  Confirm: "confirm",
  PostForm: "post-form",
  RegistrationSuccess: "registration-success",
  ResendConfirmation: "resend-confirmation",
  UserForm: "user-form",
  VideoForm: "video-form",
} as const;

export type ModalId = (typeof ModalId)[keyof typeof ModalId];

export type ModalPayloads = {
  [ModalId.AlreadyRegistered]: { field: "email" | "login" };
  [ModalId.BlogForm]: { blog: BlogViewModel; mode: "edit" } | { mode: "create" };
  [ModalId.Confirm]: {
    cancelLabel?: string;
    confirmLabel?: string;
    description?: string;
    onCancel?: () => void;
    onConfirm: () => Promise<void> | void;
    title: string;
    tone?: "default" | "destructive";
  };
  [ModalId.PostForm]: { mode: "create" } | { mode: "edit"; post: PostViewModel };
  [ModalId.RegistrationSuccess]: { email: string };
  [ModalId.ResendConfirmation]: { initialEmail?: string };
  [ModalId.UserForm]: Record<string, never>;
  [ModalId.VideoForm]: { mode: "create" } | { mode: "edit"; video: VideoViewModel };
};

type ModalComponent<K extends ModalId> = ComponentType<{
  isOpen: boolean;
  props: ModalPayloads[K];
}>;

const ConfirmModal = lazy(() =>
  import("../components/confirm-modal").then((m) => ({ default: m.ConfirmModal })),
);

const RegistrationSuccessDialog = lazy(() =>
  import("@/features/registration/components/registration-success-dialog").then((m) => ({
    default: m.RegistrationSuccessDialog,
  })),
);

const AlreadyRegisteredDialog = lazy(() =>
  import("@/features/registration/components/already-registered-dialog").then((m) => ({
    default: m.AlreadyRegisteredDialog,
  })),
);

const ResendConfirmationDialog = lazy(() =>
  import("@/features/registration/components/resend-confirmation-dialog").then((m) => ({
    default: m.ResendConfirmationDialog,
  })),
);

const PostFormDialog = lazy(() =>
  import("@/features/posts/components/post-form-dialog").then((m) => ({
    default: m.PostFormDialog,
  })),
);

const BlogFormDialog = lazy(() =>
  import("@/features/blogs/components/blog-form-dialog").then((m) => ({
    default: m.BlogFormDialog,
  })),
);

const VideoFormDialog = lazy(() =>
  import("@/features/videos/components/video-form-dialog").then((m) => ({
    default: m.VideoFormDialog,
  })),
);

const UserFormDialog = lazy(() =>
  import("@/features/users/components/user-form-dialog").then((m) => ({
    default: m.UserFormDialog,
  })),
);

export const modalComponents: {
  [K in ModalId]: LazyExoticComponent<ModalComponent<K>>;
} = {
  [ModalId.AlreadyRegistered]: AlreadyRegisteredDialog,
  [ModalId.BlogForm]: BlogFormDialog,
  [ModalId.Confirm]: ConfirmModal,
  [ModalId.PostForm]: PostFormDialog,
  [ModalId.RegistrationSuccess]: RegistrationSuccessDialog,
  [ModalId.ResendConfirmation]: ResendConfirmationDialog,
  [ModalId.UserForm]: UserFormDialog,
  [ModalId.VideoForm]: VideoFormDialog,
};
