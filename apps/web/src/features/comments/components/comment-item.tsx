import type { CommentViewModel } from "@app/shared";
import type { Transition, Variants } from "motion/react";

import { MoreHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentLikes } from "@/features/comments/components/comment-likes";
import { EditCommentForm } from "@/features/comments/components/edit-comment-form";
import { useDeleteComment } from "@/features/comments/hooks/use-comment-mutations";
import { ModalId, modalObserver } from "@/features/modals";

type Props = {
  comment: CommentViewModel;
  currentUserId: null | string;
  isNew?: boolean;
  postId: string;
};

const commentDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const itemVariants: Variants = {
  exit: {
    height: 0,
    marginTop: 0,
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
    y: 0,
  },
};

const editSwitchTransition: Transition = { duration: 0.18, ease: "easeOut" };

const highlightTransition: Transition = { duration: 2.2, ease: "easeOut" };

export function CommentItem({ comment, currentUserId, isNew = false, postId }: Props) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const deleteComment = useDeleteComment(postId);

  const isOwner = currentUserId === comment.commentatorInfo.userId;

  function handleEditDone() {
    setIsEditing(false);
  }

  function handleEditSelect() {
    setIsEditing(true);
  }

  function handleDeleteSelect() {
    modalObserver.addModal(ModalId.Confirm, {
      cancelLabel: t("comments.deleteModal.cancelLabel"),
      confirmLabel: t("comments.deleteModal.confirmLabel"),
      description: t("comments.deleteModal.description"),
      onConfirm: async () => {
        try {
          await deleteComment.mutateAsync(comment.id);
          toast.success(t("comments.toasts.deleted"));
        } catch {
          toast.error(t("comments.toasts.deleteFailed"));
        }
      },
      title: t("comments.deleteModal.title"),
      tone: "destructive",
    });
  }

  return (
    <motion.li
      className="overflow-hidden rounded-xl border border-border/50 bg-card/60 will-change-transform"
      layout="position"
      variants={itemVariants}
    >
      <motion.div
        animate={{
          backgroundColor: isNew
            ? "color-mix(in oklch, var(--primary) 8%, transparent)"
            : "rgba(0,0,0,0)",
        }}
        className="flex flex-col gap-2 px-4 py-3"
        transition={highlightTransition}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              {comment.commentatorInfo.userLogin}
            </span>
            <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {commentDateFormatter.format(new Date(comment.createdAt))}
            </span>
          </div>
          {isOwner && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  aria-label={t("actions.menu")}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                  type="button"
                  whileTap={{ scale: 0.9 }}
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[9rem]">
                <DropdownMenuItem className="cursor-pointer" onSelect={handleEditSelect}>
                  <span aria-hidden className="mr-2 size-3.5 text-muted-foreground">
                    ✎
                  </span>
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive"
                  onSelect={handleDeleteSelect}
                >
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <AnimatePresence initial={false} mode="wait">
          {isEditing ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              initial={{ opacity: 0, y: 4 }}
              key="edit"
              transition={editSwitchTransition}
            >
              <EditCommentForm comment={comment} onDone={handleEditDone} postId={postId} />
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2"
              exit={{ opacity: 0, y: 4 }}
              initial={{ opacity: 0, y: -4 }}
              key="view"
              transition={editSwitchTransition}
            >
              <p className="text-sm leading-relaxed text-foreground">{comment.content}</p>
              <CommentLikes commentId={comment.id} likesInfo={comment.likesInfo} postId={postId} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.li>
  );
}
