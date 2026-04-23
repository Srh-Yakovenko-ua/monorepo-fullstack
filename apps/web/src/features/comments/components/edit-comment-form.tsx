import type { CommentViewModel } from "@app/shared";

import { CommentUpdateInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateComment } from "@/features/comments/hooks/use-comment-mutations";

type FormValues = { content: string };

type Props = {
  comment: CommentViewModel;
  onDone: () => void;
  postId: string;
};

export function EditCommentForm({ comment, onDone, postId }: Props) {
  const { t } = useTranslation();
  const updateComment = useUpdateComment(postId);

  const form = useForm<FormValues>({
    defaultValues: { content: comment.content },
    resolver: zodResolver(CommentUpdateInputSchema),
  });

  const contentValue = useWatch({ control: form.control, name: "content" }) ?? "";
  const isSaveDisabled = contentValue.trim().length < 20 || updateComment.isPending;

  async function handleSubmit(values: FormValues) {
    try {
      await updateComment.mutateAsync({ commentId: comment.id, content: values.content });
      toast.success(t("comments.toasts.updated"));
      onDone();
    } catch {
      toast.error(t("comments.toasts.updateFailed"));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Textarea {...form.register("content")} />
      <div className="mt-2 flex justify-end gap-2">
        <Button onClick={onDone} size="sm" type="button" variant="ghost">
          {t("comments.editComment.cancel")}
        </Button>
        <Button disabled={isSaveDisabled} size="sm" type="submit">
          {t("comments.editComment.save")}
        </Button>
      </div>
    </form>
  );
}
