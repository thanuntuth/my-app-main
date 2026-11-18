"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useContext,
  useState,
} from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { OverlayContext } from "./overlay";

export interface DialogTriggerProps {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  children: ReactNode;
}

export function DialogTrigger({
  isOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogTriggerProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isOpen !== undefined ? isOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (isOpen === undefined) setInternalOpen(val);
    onOpenChange?.(val);
  };

  const items = Children.toArray(children);
  const enhancedChildren = items.map((child, idx) => {
    if (
      idx === 0 &&
      isValidElement<{
        onClick?: (e: React.MouseEvent) => void;
        onPress?: () => void;
      }>(child)
    ) {
      return cloneElement(child, {
        onClick: (e: React.MouseEvent) => {
          child.props.onClick?.(e);
          setOpen(true);
        },
        onPress: () => {
          child.props.onPress?.();
          setOpen(true);
        },
      });
    }
    return child;
  });

  return (
    <OverlayContext.Provider value={{ isOpen: open, setIsOpen: setOpen }}>
      {enhancedChildren}
    </OverlayContext.Provider>
  );
}

export interface DialogProps {
  className?: string;
  children?: ReactNode | ((props: { close: () => void }) => ReactNode);
}

export function Dialog({ className = "", children }: DialogProps) {
  const ctx = useContext(OverlayContext);
  const close = () => ctx?.setIsOpen(false);

  return (
    <div role="dialog" aria-modal="true" className={`relative outline-none ${className}`}>
      {typeof children === "function" ? children({ close }) : children}
    </div>
  );
}

export function DialogHeader({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-4 space-y-1.5 ${className}`} {...props} />;
}

export function DialogTitle({
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-bold leading-none text-slate-800 ${className}`}
      {...props}
    />
  );
}

export function DialogDescription({
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-slate-500 ${className}`} {...props} />;
}

export function DialogBody({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`py-2 ${className}`} {...props} />;
}

export function DialogFooter({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-5 flex flex-wrap items-center justify-end gap-2 ${className}`}
      {...props}
    />
  );
}

export function DialogClose({
  className = "",
  onClick,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useContext(OverlayContext);

  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        ctx?.setIsOpen(false);
      }}
      className={className}
      {...props}
    >
      {children ?? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="size-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
    </button>
  );
}
