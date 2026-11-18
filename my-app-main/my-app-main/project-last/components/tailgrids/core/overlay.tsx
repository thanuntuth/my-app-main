"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type OverlayRenderProps = {
  isEntering: boolean;
  isExiting: boolean;
};

type OverlayContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

export const OverlayContext = createContext<OverlayContextValue | null>(null);

const resolveClassName = (
  className?: string | ((state: OverlayRenderProps) => string)
) => {
  if (typeof className === "function") {
    return className({ isEntering: false, isExiting: false });
  }
  return className ?? "";
};

export interface ModalOverlayProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  isDismissable?: boolean;
  className?: string | ((state: OverlayRenderProps) => string);
  children?: ReactNode | ((state: OverlayRenderProps) => ReactNode);
}

export function ModalOverlay({
  isOpen,
  onOpenChange,
  isDismissable = true,
  className,
  children,
}: ModalOverlayProps) {
  const ctx = useContext(OverlayContext);
  const open = isOpen !== undefined ? isOpen : (ctx?.isOpen ?? false);

  if (!open) return null;

  const handleClose = () => {
    onOpenChange?.(false);
    ctx?.setIsOpen(false);
  };

  return (
    <OverlayContext.Provider value={{ isOpen: open, setIsOpen: handleClose }}>
      <div
        onClick={(e) => {
          if (isDismissable && e.target === e.currentTarget) {
            handleClose();
          }
        }}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs ${resolveClassName(className)}`}
      >
        {typeof children === "function"
          ? children({ isEntering: false, isExiting: false })
          : children}
      </div>
    </OverlayContext.Provider>
  );
}

export type BackdropProps = ModalOverlayProps;

export function Backdrop(props: BackdropProps) {
  return <ModalOverlay {...props} />;
}

export interface ModalProps {
  className?: string | ((state: OverlayRenderProps) => string);
  children?: ReactNode | ((state: OverlayRenderProps) => ReactNode);
}

export function Modal({ className, children }: ModalProps) {
  return (
    <div
      className={`relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ${resolveClassName(className)}`}
    >
      {typeof children === "function"
        ? children({ isEntering: false, isExiting: false })
        : children}
    </div>
  );
}