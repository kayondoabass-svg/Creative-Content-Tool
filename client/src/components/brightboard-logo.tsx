export function BrightBoardLogo({ show, size = "sm", absolute = true }: { show?: boolean; size?: "sm" | "md"; absolute?: boolean }) {
  if (!show) return null;
  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const textSize = size === "md" ? "text-[11px]" : "text-[10px]";
  const positionClass = absolute ? "absolute bottom-2 right-2" : "";
  return (
    <div className={`${positionClass} flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5 pointer-events-none`} data-testid="logo-badge">
      <img src="/favicon.png" alt="BrightBoard" className={`${iconSize} rounded`} />
      <span className={`text-white/80 ${textSize} font-medium`}>brightboardapp.com</span>
    </div>
  );
}
