/* Bottom sheet — small hand-rolled implementation used consistently across
   the app (result sheet, settings, number pad, catalogues). It is rendered
   through a portal so a transformed card can never become its containing
   block (which would leave a "fixed" sheet stuck inside the card). */
import { type ReactNode } from "react";
import { createPortal } from "react-dom";

export function SheetWrap({
  opened,
  onClosed,
  children,
  label,
  className = "",
}: {
  opened: boolean;
  onClosed: () => void;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const node = (
    <div
      className="k-sheet"
      data-open={opened}
      style={{
        position: "fixed",
        inset: 0,
        userSelect: opened ? "auto" : "none",
        zIndex: opened ? 60 : -1,
        pointerEvents: opened ? "auto" : "none",
        background: opened ? "rgba(0,0,0,.4)" : "transparent",
        transition: "background .25s ease",
      }}
      onClick={onClosed}
      role="presentation"
      aria-hidden={!opened}
      inert={!opened}
    >
      <div
        role="dialog"
        aria-modal={opened}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-2xl mx-auto p-4 k-sheet-panel ${className}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          background: "var(--surface)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          border: "1px solid var(--rule)",
          transform: opened ? "none" : "translateY(110%)",
          transition: "transform .3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
  return createPortal(node, document.body);
}
