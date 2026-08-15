import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS = [
  { code: "sv", label: "Svenska" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

/** أيقونة لغة واحدة + قائمة اختيار. لا تغيير في نظام الترجمة — فقط طريقة العرض. */
export default function LanguageMenu() {
  const { lang, setLang } = useLanguage();
  const current = LANGS.find((l) => l.code === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={current?.label || "Language"}
          aria-label={current?.label || "Language"}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Globe className="w-[18px] h-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className="cursor-pointer">
            <span className="flex-1">{l.label}</span>
            {lang === l.code && <Check className="w-3.5 h-3.5 text-[#000066]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}