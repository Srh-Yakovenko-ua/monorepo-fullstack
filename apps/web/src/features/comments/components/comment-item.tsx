import type { CommentViewModel } from "@app/shared";

import { MoreHorizontal } from "lucide-react";
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
import { EditCommentForm } from "@/features/comments/components/edit-comment-form";
import { useDeleteComment } from "@/features/comments/hooks/use-comment-mutations";
import { ModalId, modalObserver } from "@/features/modals";
import { useUserAuth } from "@/features/user-auth";

type Props = {
  comment: CommentViewModel;
  postId: string;
};

export function CommentItem({ comment, postId }: Props) {
  const { t } = useTranslation();
  const { user } = useUserAuth();
  const [isEditing, setIsEditing] = useState(false);
  const deleteComment = useDeleteComment(postId);

  const isOwner = user?.userId === comment.commentatorInfo.userId;

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
    <li className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {comment.commentatorInfo.userLogin}
          </span>
          <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            {formatCommentDate(comment.createdAt)}
          </span>
        </div>
        {isOwner && !isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Comment actions"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                type="button"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[9rem]">
              <DropdownMenuItem className="cursor-pointer" onSelect={handleEditSelect}>
                <span className="mr-2 size-3.5 text-muted-foreground">✎</span>
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

      {isEditing ? (
        <EditCommentForm comment={comment} onDone={handleEditDone} postId={postId} />
      ) : (
        <p className="text-sm leading-relaxed text-foreground">{comment.content}</p>
      )}
    </li>
  );
}

function formatCommentDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
