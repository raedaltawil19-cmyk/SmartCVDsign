import LanguageMenu from "@/components/corner/LanguageMenu";
import ProfileMenu from "@/components/corner/ProfileMenu";

/**
 * Persistent corner widget: [ language icon ] [ profile circle ].
 * Compact by design so it never covers page header buttons.
 */
export default function CornerControls() {
  return (
    <div dir="ltr" className="no-print fixed top-3 right-3 z-50">
      <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-md p-1 flex items-center gap-1">
        <LanguageMenu />
        <ProfileMenu />
      </div>
    </div>
  );
}