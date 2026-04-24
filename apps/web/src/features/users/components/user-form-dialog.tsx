import type { Path } from "react-hook-form";
import type { z } from "zod";

import { CreateUserInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modalObserver } from "@/features/modals/lib/modal-observer";
import { ModalId, type ModalPayloads } from "@/features/modals/lib/modal-registry";
import { useCreateUser } from "@/features/users/hooks/use-user-mutations";
import { ApiError } from "@/lib/http-client";

type Props = {
  isOpen: boolean;
  props: ModalPayloads[typeof ModalId.UserForm];
};

type UserFormValues = z.infer<typeof CreateUserInputSchema>;

export function UserFormDialog({ isOpen }: Props) {
  const { t } = useTranslation();
  const createUser = useCreateUser();

  const form = useForm<UserFormValues>({
    defaultValues: { email: "", login: "", password: "" },
    resolver: zodResolver(CreateUserInputSchema),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ email: "", login: "", password: "" });
    }
  }, [isOpen, form]);

  const isPending = createUser.isPending;

  function handleClose() {
    modalObserver.removeModal(ModalId.UserForm);
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  async function onSubmit(values: UserFormValues) {
    try {
      await createUser.mutateAsync(values);
      toast.success(t("users.toasts.created"));
      handleClose();
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        err.fieldErrors.forEach(({ field, message }) => {
          form.setError(field as Path<UserFormValues>, { message });
        });
        toast.error(t("common.fixFormErrors"));
      } else {
        toast.error(err instanceof Error ? err.message : t("common.somethingWentWrong"));
      }
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent aria-describedby={undefined} className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-7 pt-7 pb-6">
          <DialogTitle
            className="font-display text-xl font-normal"
            style={{ letterSpacing: "-0.025em" }}
          >
            {t("users.form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="h-px w-full bg-border/60" />

        <form
          className="flex flex-col gap-5 px-7 py-6"
          id="user-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-login">{t("users.form.loginLabel")}</Label>
            <Input
              id="user-login"
              placeholder={t("users.form.loginPlaceholder")}
              {...form.register("login")}
              aria-describedby={form.formState.errors.login ? "user-login-error" : undefined}
              aria-invalid={!!form.formState.errors.login}
            />
            <FieldError error={form.formState.errors.login} id="user-login-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-email">{t("users.form.emailLabel")}</Label>
            <Input
              id="user-email"
              placeholder={t("users.form.emailPlaceholder")}
              type="email"
              {...form.register("email")}
              aria-describedby={form.formState.errors.email ? "user-email-error" : undefined}
              aria-invalid={!!form.formState.errors.email}
            />
            <FieldError error={form.formState.errors.email} id="user-email-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-password">{t("users.form.passwordLabel")}</Label>
            <Input
              id="user-password"
              placeholder={t("users.form.passwordPlaceholder")}
              type="password"
              {...form.register("password")}
              aria-describedby={form.formState.errors.password ? "user-password-error" : undefined}
              aria-invalid={!!form.formState.errors.password}
            />
            <FieldError error={form.formState.errors.password} id="user-password-error" />
          </div>
        </form>

        <div className="h-px w-full bg-border/60" />

        <div className="flex justify-end px-7 py-4">
          <Button form="user-form" loading={isPending} type="submit">
            {t("common.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
