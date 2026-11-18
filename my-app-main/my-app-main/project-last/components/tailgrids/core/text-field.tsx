"use client";

import { createContext, useContext } from "react";
import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

type TextFieldContextValue = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  type?: string;
  name?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
};

export const TextFieldContext = createContext<TextFieldContextValue | null>(
  null
);

export interface TextFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  type?: string;
  name?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  children?: ReactNode;
}

export function TextField({
  value,
  defaultValue,
  onChange,
  type,
  name,
  isDisabled,
  isRequired,
  isInvalid,
  className = "",
  children,
  ...props
}: TextFieldProps) {
  return (
    <TextFieldContext.Provider
      value={{
        value,
        defaultValue,
        onChange,
        type,
        name,
        isDisabled,
        isRequired,
        isInvalid,
      }}
    >
      <div className={`flex flex-col gap-1.5 ${className}`} {...props}>
        {children}
      </div>
    </TextFieldContext.Provider>
  );
}

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-sm font-medium text-slate-700 ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  onChange,
  value,
  defaultValue,
  type,
  name,
  disabled,
  required,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const ctx = useContext(TextFieldContext);
  const resolvedValue = value !== undefined ? value : ctx?.value;
  const resolvedDefault =
    defaultValue !== undefined ? defaultValue : ctx?.defaultValue;

  return (
    <input
      type={type ?? ctx?.type ?? "text"}
      name={name ?? ctx?.name}
      disabled={disabled ?? ctx?.isDisabled}
      required={required ?? ctx?.isRequired}
      {...(resolvedValue !== undefined
        ? { value: resolvedValue }
        : resolvedDefault !== undefined
          ? { defaultValue: resolvedDefault }
          : {})}
      onChange={(e) => {
        onChange?.(e);
        ctx?.onChange?.(e.target.value);
      }}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-2 focus:ring-[#00786F]/20 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
      {...props}
    />
  );
}

export function TextArea({
  className = "",
  onChange,
  value,
  defaultValue,
  name,
  disabled,
  required,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ctx = useContext(TextFieldContext);
  const resolvedValue = value !== undefined ? value : ctx?.value;
  const resolvedDefault =
    defaultValue !== undefined ? defaultValue : ctx?.defaultValue;

  return (
    <textarea
      name={name ?? ctx?.name}
      disabled={disabled ?? ctx?.isDisabled}
      required={required ?? ctx?.isRequired}
      {...(resolvedValue !== undefined
        ? { value: resolvedValue }
        : resolvedDefault !== undefined
          ? { defaultValue: resolvedDefault }
          : {})}
      onChange={(e) => {
        onChange?.(e);
        ctx?.onChange?.(e.target.value);
      }}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-2 focus:ring-[#00786F]/20 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
      {...props}
    />
  );
}

export function Description({
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs text-slate-500 ${className}`} {...props} />;
}

export function FieldError({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  const ctx = useContext(TextFieldContext);
  if (ctx?.isInvalid === false || !children) return null;

  return (
    <p className={`text-xs font-medium text-red-600 ${className}`} {...props}>
      {children}
    </p>
  );
}