"use client";

import { forwardRef } from "react";
import type { LabelHTMLAttributes } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  isRequired?: boolean;
  isDisabled?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className = "", isDisabled, children, ...props },
  ref
) {
  return (
    <label
      ref={ref}
      data-disabled={isDisabled || undefined}
      className={`block text-sm font-medium text-slate-700 ${
        isDisabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </label>
  );
});

export default Label;