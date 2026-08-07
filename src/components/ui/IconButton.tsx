import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, children, className = "", ...props }, ref) {
    return (
      <button
        className={`icon-button ${className}`}
        aria-label={label}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  },
);
