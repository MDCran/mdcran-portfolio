"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export default function ResumeButton() {
  const pathname = usePathname();
  const buttonRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const suppressTimeoutRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [corner, setCorner] = useState<Corner>("bottom-right");
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    dragPositionRef.current = dragPosition;
  }, [dragPosition]);

  useEffect(() => {
    return () => {
      if (suppressTimeoutRef.current !== null) {
        window.clearTimeout(suppressTimeoutRef.current);
      }
    };
  }, []);

  if (pathname === "/resume") return null;

  const snappedClasses =
    corner === "top-left"
      ? "top-6 left-6"
      : corner === "top-right"
      ? "top-6 right-6"
      : corner === "bottom-left"
      ? "bottom-6 left-6"
      : "bottom-6 right-6";

  return (
    <motion.div
      ref={buttonRef}
      initial={{ opacity: 0, scale: 0.8, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed z-50 touch-none ${dragPosition ? "" : snappedClasses}`}
      style={
        dragPosition
          ? {
              left: dragPosition.x,
              top: dragPosition.y,
            }
          : undefined
      }
      onPointerDown={(event) => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          originX: rect.left,
          originY: rect.top,
          moved: false,
        };
        dragPositionRef.current = null;
      }}
      onPointerMove={(event) => {
        if (!dragRef.current || !buttonRef.current) return;
        if (dragRef.current.pointerId !== event.pointerId) return;

        const currentPosition = dragPositionRef.current;
        if (!dragRef.current.moved) {
          const movedX = Math.abs(event.clientX - dragRef.current.startX);
          const movedY = Math.abs(event.clientY - dragRef.current.startY);

          if (movedX <= 4 && movedY <= 4) {
            return;
          }

          dragRef.current.moved = true;
          dragPositionRef.current = { x: dragRef.current.originX, y: dragRef.current.originY };
          setDragPosition({ x: dragRef.current.originX, y: dragRef.current.originY });
          buttonRef.current.setPointerCapture(event.pointerId);
        }

        const activePosition = currentPosition ?? dragPositionRef.current;
        if (!activePosition) return;

        const { offsetX, offsetY } = dragRef.current;
        const width = buttonRef.current.offsetWidth;
        const height = buttonRef.current.offsetHeight;
        const maxX = window.innerWidth - width - 8;
        const maxY = window.innerHeight - height - 8;
        const nextX = Math.min(Math.max(8, event.clientX - offsetX), maxX);
        const nextY = Math.min(Math.max(8, event.clientY - offsetY), maxY);

        dragPositionRef.current = { x: nextX, y: nextY };
        setDragPosition({ x: nextX, y: nextY });
      }}
      onPointerUp={(event) => {
        if (!dragRef.current || !buttonRef.current) return;
        if (dragRef.current.pointerId !== event.pointerId) return;

        const currentPosition = dragPositionRef.current;
        if (!currentPosition) {
          dragRef.current = null;
          setDragPosition(null);
          return;
        }

        const width = buttonRef.current.offsetWidth;
        const height = buttonRef.current.offsetHeight;
        const centerX = currentPosition.x + width / 2;
        const centerY = currentPosition.y + height / 2;
        const snapHorizontal = centerX < window.innerWidth / 2 ? "left" : "right";
        const snapVertical = centerY < window.innerHeight / 2 ? "top" : "bottom";

        setCorner(`${snapVertical}-${snapHorizontal}` as Corner);
        dragPositionRef.current = null;
        setDragPosition(null);

        if (buttonRef.current.hasPointerCapture(event.pointerId)) {
          buttonRef.current.releasePointerCapture(event.pointerId);
        }

        if (dragRef.current.moved) {
          suppressClickRef.current = true;
          if (suppressTimeoutRef.current !== null) {
            window.clearTimeout(suppressTimeoutRef.current);
          }
          suppressTimeoutRef.current = window.setTimeout(() => {
            suppressClickRef.current = false;
            suppressTimeoutRef.current = null;
          }, 220);
        }

        dragRef.current = null;
      }}
      onPointerCancel={(event) => {
        if (!dragRef.current || !buttonRef.current) return;
        if (dragRef.current.pointerId !== event.pointerId) return;

        if (buttonRef.current.hasPointerCapture(event.pointerId)) {
          buttonRef.current.releasePointerCapture(event.pointerId);
        }

        dragRef.current = null;
        dragPositionRef.current = null;
        setDragPosition(null);
      }}
    >
      <Link
        href="/resume"
        onClick={(event) => {
          if (suppressClickRef.current || dragRef.current?.moved) {
            event.preventDefault();
          }
        }}
        className="flex items-center gap-2 h-10 px-4 bg-[#0d0d0d] border border-white/12 hover:border-[#ef4242]/50 text-white/60 hover:text-white text-[11px] tracking-widest uppercase rounded-sm transition-all duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_24px_rgba(239,66,66,0.15)] backdrop-blur-sm cursor-grab active:cursor-grabbing"
      >
        <FileText size={12} className="text-[#ef4242]" />
        Resume
      </Link>
    </motion.div>
  );
}
