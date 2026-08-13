"use client";

import * as React from "react";
import { useToast as useShadcnToast } from "./use-toast";
import { ToastProvider, Toast, ToastTitle, ToastDescription, ToastClose, ToastViewport } from "./toast";

export function Toaster() {
  const { toasts } = useShadcnToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
