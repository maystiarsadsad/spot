"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseBarcodeOptions {
  /** Callback when a barcode is detected */
  onScan: (barcode: string) => void;
  /** Max time between keystrokes in ms (scanners type fast, ~50ms between chars) */
  maxInterval?: number;
  /** Min length of barcode to be considered valid */
  minLength?: number;
  /** Whether the listener is active */
  enabled?: boolean;
}

/**
 * Hook to detect USB barcode scanner input.
 * 
 * USB barcode scanners emulate keyboard input:
 * they type characters very fast (<50ms between keystrokes)
 * and end with Enter. We differentiate from human typing
 * by checking the speed of input.
 */
export function useBarcodeScanner({
  onScan,
  maxInterval = 80,
  minLength = 3,
  enabled = true,
}: UseBarcodeOptions) {
  const bufferRef = useRef("");
  const lastKeystrokeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isInput = tagName === "input" || tagName === "textarea" || target.isContentEditable;

      // Allow search input — scanner input is much faster
      const now = Date.now();
      const timeSinceLastKey = now - lastKeystrokeRef.current;

      if (e.key === "Enter") {
        e.preventDefault(); // Prevent form submission from scanner
        const barcode = bufferRef.current.trim();

        if (barcode.length >= minLength) {
          onScan(barcode);
        }

        // Reset
        bufferRef.current = "";
        lastKeystrokeRef.current = 0;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      // Only capture printable single characters
      if (e.key.length !== 1) return;

      // If too much time passed, reset the buffer (human typing)
      if (timeSinceLastKey > maxInterval && bufferRef.current.length > 0) {
        // Only reset if user is in an input field (normal typing)
        if (isInput) {
          bufferRef.current = "";
        }
      }

      // If typing in an input and it's slow, don't capture
      if (isInput && timeSinceLastKey > maxInterval && bufferRef.current.length === 0) {
        // This is normal human typing in a field, don't start capturing
        lastKeystrokeRef.current = now;
        return;
      }

      bufferRef.current += e.key;
      lastKeystrokeRef.current = now;

      // Auto-clear buffer after a pause (in case Enter was missed)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = "";
      }, 300);
    },
    [onScan, maxInterval, minLength]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, handleKeyDown]);
}
