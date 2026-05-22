"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./header.module.css";
import type { HeaderProps } from "./types";

export default function Header({ className }: HeaderProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const displayName = "Admin";
  const initials = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <header className={clsx(styles.header, className)}>
      <div className={styles.left}>
        {/* Can add search or breadcrumbs here in the future */}
      </div>
      <div className={styles.right}>
        <div className={styles.userMenuWrapper} ref={menuRef}>
          <button
            type="button"
            className={clsx(styles.userProfile, isOpen && styles.userProfileActive)}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label="Open profile menu"
          >
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{displayName}</span>
            <ChevronDown
              className={clsx(styles.chevron, isOpen && styles.chevronOpen)}
              size={16}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
