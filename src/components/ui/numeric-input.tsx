import * as React from "react";
import { cn } from "@/lib/utils";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, placeholder, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const isZero = !focused && (value === 0 || value === "0");
    const displayValue = focused && (value === 0 || value === "0" || value === "") ? "" : value;

    return (
      <input
        ref={ref}
        type="number"
        value={displayValue}
        onChange={onChange}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        placeholder={placeholder ?? "0"}
        style={isZero ? { color: "hsl(var(--muted-foreground) / 0.4)" } : undefined}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
