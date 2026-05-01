import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_SORT, SORT, type UserSortValue } from "@/features/users/lib/sort";

type UsersFiltersProps = {
  emailInput: string;
  loginInput: string;
  onAddClick: () => void;
  onEmailInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoginInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSortChange: (value: string) => void;
  onSortClear: () => void;
  sortValue: UserSortValue;
};

export function UsersFilters({
  emailInput,
  loginInput,
  onAddClick,
  onEmailInputChange,
  onLoginInputChange,
  onSortChange,
  onSortClear,
  sortValue,
}: UsersFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 pt-5">
      <div className="relative min-w-[140px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 pl-8 text-sm"
          onChange={onLoginInputChange}
          placeholder={t("users.list.searchLoginPlaceholder")}
          value={loginInput}
        />
      </div>

      <div className="relative min-w-[140px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 pl-8 text-sm"
          onChange={onEmailInputChange}
          placeholder={t("users.list.searchEmailPlaceholder")}
          value={emailInput}
        />
      </div>

      <div className="md:hidden">
        <Select onValueChange={onSortChange} value={sortValue}>
          <SelectTrigger
            className="h-8 w-[150px] text-sm"
            isClearable={sortValue !== DEFAULT_SORT}
            onClear={onSortClear}
          >
            <SelectValue placeholder={t("users.list.sort.label")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SORT.newest}>{t("users.list.sort.newest")}</SelectItem>
            <SelectItem value={SORT.oldest}>{t("users.list.sort.oldest")}</SelectItem>
            <SelectItem value={SORT.loginAToZ}>{t("users.list.sort.loginAToZ")}</SelectItem>
            <SelectItem value={SORT.loginZToA}>{t("users.list.sort.loginZToA")}</SelectItem>
            <SelectItem value={SORT.emailAToZ}>{t("users.list.sort.emailAToZ")}</SelectItem>
            <SelectItem value={SORT.emailZToA}>{t("users.list.sort.emailZToA")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      <Button className="shrink-0 gap-1.5" onClick={onAddClick} size="sm">
        <Plus className="size-3.5" />
        {t("users.list.addButton")}
      </Button>
    </div>
  );
}
