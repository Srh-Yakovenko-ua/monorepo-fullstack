import { CommentUpdateInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateComment } from "@/features/comments/hooks/use-comment-mutations";
import { useUserAuth } from "@/features/user-auth";
import { applyFieldErrors, toastApiError } from "@/lib/api-errors";

type FormValues = { content: string };

type Props = {
  onCommentCreated?: (commentId: string) => void;
  postId: string;
};

const MAX_LENGTH = 300;
const MIN_LENGTH = 20;

export function NewCommentForm({ onCommentCreated, postId }: Props) {
  const { t } = useTranslation();
  const { isAuthed } = useUserAuth();
  const [isFocused, setIsFocused] = useState(false);
  const createComment = useCreateComment(postId);

  const form = useForm<FormValues>({
    defaultValues: { content: "" },
    resolver: zodResolver(CommentUpdateInputSchema),
  });

  const contentValue = useWatch({ control: form.control, name: "content" }) ?? "";
  const isSendDisabled = contentValue.trim().length < MIN_LENGTH || createComment.isPending;

  function handleFocus() {
    setIsFocused(true);
  }

  function blurActive() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function handleCancel() {
    form.reset();
    setIsFocused(false);
    blurActive();
  }

  async function handleSubmit(values: FormValues) {
    try {
      const created = await createComment.mutateAsync({ content: values.content });
      form.reset();
      setIsFocused(false);
      blurActive();
      toast.success(t("comments.toasts.created"));
      onCommentCreated?.(created.id);
    } catch (err) {
      if (applyFieldErrors(form, err)) return;
      toastApiError(err, t("comments.toasts.createFailed"));
    }
  }

  if (!isAuthed) return null;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Textarea
        aria-label={t("comments.newComment.placeholder")}
        maxLength={MAX_LENGTH}
        {...form.register("content")}
        onFocus={handleFocus}
        placeholder={t("comments.newComment.placeholder")}
      />
      <AnimatePresence>
        {isFocused && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ bounce: 0.18, duration: 0.28, type: "spring" }}
          >
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">
                {t("comments.newComment.counter", { count: contentValue.length })}
              </span>
              <div className="flex gap-2">
                <Button onClick={handleCancel} size="sm" type="button" variant="ghost">
                  {t("comments.newComment.cancel")}
                </Button>
                <Button
                  disabled={isSendDisabled}
                  loading={createComment.isPending}
                  size="sm"
                  type="submit"
                >
                  {t("comments.newComment.send")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
