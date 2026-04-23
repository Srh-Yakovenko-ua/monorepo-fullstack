import { CommentUpdateInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComment } from "@/features/comments/hooks/use-comment-mutations";
import { useUserAuth } from "@/features/user-auth";

type FormValues = { content: string };

type Props = {
  postId: string;
};

export function NewCommentForm({ postId }: Props) {
  const { t } = useTranslation();
  const { isAuthed } = useUserAuth();
  const [isFocused, setIsFocused] = useState(false);
  const createComment = useCreateComment(postId);

  const form = useForm<FormValues>({
    defaultValues: { content: "" },
    resolver: zodResolver(CommentUpdateInputSchema),
  });

  const contentValue = useWatch({ control: form.control, name: "content" }) ?? "";
  const isSendDisabled = contentValue.trim().length < 20 || createComment.isPending;

  function handleFocus() {
    setIsFocused(true);
  }

  function handleCancel() {
    form.reset();
    setIsFocused(false);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  async function handleSubmit(values: FormValues) {
    try {
      await createComment.mutateAsync({ content: values.content });
      form.reset();
      setIsFocused(false);
      (document.activeElement as HTMLElement | null)?.blur();
      toast.success(t("comments.toasts.created"));
    } catch {
      toast.error(t("comments.toasts.createFailed"));
    }
  }

  if (!isAuthed) return null;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Textarea
        {...form.register("content")}
        onFocus={handleFocus}
        placeholder={t("comments.newComment.placeholder")}
      />
      {isFocused && (
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted-foreground">
            {t("comments.newComment.counter", { count: contentValue.length })}
          </span>
          <div className="flex gap-2">
            <Button onClick={handleCancel} size="sm" type="button" variant="ghost">
              {t("comments.newComment.cancel")}
            </Button>
            <Button disabled={isSendDisabled} size="sm" type="submit">
              {t("comments.newComment.send")}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
