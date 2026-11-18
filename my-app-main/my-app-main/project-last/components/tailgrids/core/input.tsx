"use client";

import { forwardRef, useContext } from "react";
import type { InputHTMLAttributes } from "react";
import { TextFieldContext } from "./text-field";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg" | number;
  isDisabled?: boolean;
  isInvalid?: boolean;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className = "",
    size = "md",
    isDisabled,
    isInvalid,
    disabled,
    type,
    name,
    required,
    value,
    defaultValue,
    onChange,
    ...props
  },
  ref
) {
  const ctx = useContext(TextFieldContext);
  const resolvedValue = value !== undefined ? value : ctx?.value;
  const resolvedDefault =
    defaultValue !== undefined ? defaultValue : ctx?.defaultValue;
  const invalid = isInvalid ?? ctx?.isInvalid;
  const sizeClass =
    typeof size === "string" && SIZE_CLASSES[size]
      ? SIZE_CLASSES[size]
      : SIZE_CLASSES.md;

  return (
    <input
      ref={ref}
      type={type ?? ctx?.type ?? "text"}
      name={name ?? ctx?.name}
      disabled={disabled ?? isDisabled ?? ctx?.isDisabled}
      required={required ?? ctx?.isRequired}
      size={typeof size === "number" ? size : undefined}      {...(resolvedValue !== undefined
        ? { value: resolvedValue }
        : resolvedDefault !== undefined
          ? { defaultValue: resolvedDefault }
          : {})}
      onChange={(e) => {
        onChange?.(e);
        ctx?.onChange?.(e.target.value);
      }}
      className={`w-full rounded-lg border bg-white text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
        invalid
          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
          : "border-slate-300 focus:border-[#00786F] focus:ring-[#00786F]/20"
      } ${sizeClass} ${className}`}
      {...props}
    />
  );
});