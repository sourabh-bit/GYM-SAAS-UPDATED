import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t max-h-[88dvh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  showClose?: boolean;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, style, showClose = true, ...props }, ref) => {
    const contentRef = React.useRef<React.ElementRef<typeof SheetPrimitive.Content>>(null);
    const [keyboardInset, setKeyboardInset] = React.useState(0);
    const [visibleViewportHeight, setVisibleViewportHeight] = React.useState(
      typeof window !== "undefined" ? window.innerHeight : 0,
    );

    React.useImperativeHandle(ref, () => contentRef.current as React.ElementRef<typeof SheetPrimitive.Content>);

    React.useEffect(() => {
      if (side !== "bottom") return;
      if (typeof window === "undefined" || !window.visualViewport) return;

      const vv = window.visualViewport;
      const updateInset = () => {
        const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        setKeyboardInset(inset);
        setVisibleViewportHeight(Math.round(vv.height));
      };

      updateInset();
      vv.addEventListener("resize", updateInset);
      vv.addEventListener("scroll", updateInset);
      window.addEventListener("orientationchange", updateInset);

      return () => {
        vv.removeEventListener("resize", updateInset);
        vv.removeEventListener("scroll", updateInset);
        window.removeEventListener("orientationchange", updateInset);
      };
    }, [side]);

    React.useEffect(() => {
      if (side !== "bottom") return;
      const container = contentRef.current;
      if (!container) return;

      const onFocusIn = (event: FocusEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const field = target.closest("input, textarea, select, [contenteditable='true']") as HTMLElement | null;
        if (!field) return;

        // Keep focused field visible above keyboard; this also works with keyboard "Next".
        window.setTimeout(() => {
          const containerRect = container.getBoundingClientRect();
          const fieldRect = field.getBoundingClientRect();
          const topPadding = 16;
          const bottomPadding = 140;
          const isAbove = fieldRect.top < containerRect.top + topPadding;
          const isBelow = fieldRect.bottom > containerRect.bottom - bottomPadding;

          if (isAbove || isBelow) {
            field.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
          }
        }, 120);
      };

      container.addEventListener("focusin", onFocusIn);
      return () => container.removeEventListener("focusin", onFocusIn);
    }, [side]);

    const bottomStyle: React.CSSProperties =
      side === "bottom"
        ? {
            ...style,
            bottom: `${keyboardInset}px`,
            maxHeight: `${Math.max(260, visibleViewportHeight - 12)}px`,
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }
        : (style as React.CSSProperties);

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={contentRef}
          className={cn(sheetVariants({ side }), className)}
          style={bottomStyle}
          {...props}
        >
          {children}
          {showClose ? (
            <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          ) : null}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
