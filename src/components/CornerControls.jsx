import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/i18n";
import { LogIn, UserPlus, LogOut } from "lucide-react";

const LANGS = [
  { code: "ar", label: "ع" },
  { code: "sv", label: "SV" },
  { code: "en", label: "EN" },
];

/**
 * Persistent corner widget: UI language selector + account entry.
 * Always visible. The login/register flow is triggered here proactively,
 * and the print/download gate enforces authentication separately.
 */
export default function CornerControls() {
  const { lang, setLang, t } = useLanguage();
  const { isAuthenticated, user, logout, navigateToLogin } = useAuth();

  return (
    <div className="no-print fixed bottom-4 left-4 z-40">
      <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg p-1.5 flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`text-[12px] font-medium px-2 py-1 rounded-md transition-colors ${lang === l.code ? "bg-white text-[#1B4FD8] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200" />

        {isAuthenticated ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-slate-600 max-w-[120px] truncate px-1" title={user?.email}>
              {user?.full_name || user?.email || ""}
            </span>
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1 text-[12px] px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("corner.logout")}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={navigateToLogin}
              className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("corner.login")}</span>
            </button>
            <button
              onClick={navigateToLogin}
              className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg bg-[#1B4FD8] text-white hover:bg-[#1640b0]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("corner.register")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}