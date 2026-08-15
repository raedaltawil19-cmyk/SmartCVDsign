import { LogIn, UserPlus, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initials = (name, email) => {
  const src = (name || email || "").trim();
  if (!src) return "";
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
};

/** دائرة بروفايل + قائمة حساب تحتوي الدخول/الخروج. منطق المصادقة كما هو. */
export default function ProfileMenu() {
  const { isAuthenticated, user, logout, navigateToLogin } = useAuth();
  const { t } = useLanguage();
  const name = user?.full_name || user?.email || "";
  const avatar = user?.avatar_url || user?.picture || null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={name || t("corner.login")}
          aria-label={name || t("corner.login")}
          className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-[#000066] text-white text-[12px] font-semibold ring-1 ring-slate-200 hover:opacity-90 transition-opacity"
        >
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : isAuthenticated && initials(user?.full_name, user?.email) ? (
            <span>{initials(user?.full_name, user?.email)}</span>
          ) : (
            <User className="w-[18px] h-[18px]" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isAuthenticated ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] font-medium text-slate-900 truncate">{user?.full_name || "—"}</p>
              {user?.email && <p className="text-[11px] text-slate-500 truncate">{user.email}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("corner.logout")}</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={navigateToLogin} className="cursor-pointer">
              <LogIn className="w-3.5 h-3.5" />
              <span>{t("corner.login")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={navigateToLogin} className="cursor-pointer">
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t("corner.register")}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}