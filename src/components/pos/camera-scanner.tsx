"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, SwitchCamera } from "lucide-react";

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

/**
 * Camera-based barcode scanner overlay.
 * Uses html5-qrcode to read barcodes via the device camera.
 * Supports EAN-13, EAN-8, UPC-A, UPC-E, Code128, Code39, QR, etc.
 */
export function CameraScanner({ open, onClose, onScan }: CameraScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    hasScannedRef.current = false;
    setError(null);

    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

        // Enable all common barcode + QR formats
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        html5QrCode = new Html5Qrcode("camera-scanner-viewport", {
          formatsToSupport,
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode },
          {
            fps: 15,
            qrbox: { width: 300, height: 150 },
          },
          (decodedText: string) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            // Vibrate for haptic feedback on mobile
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }

            onScan(decodedText);
            
            // Small delay before closing to let user see the result
            setTimeout(() => {
              onClose();
            }, 300);
          },
          () => {
            // Scan failure (no barcode found in frame) — ignore
          }
        );
      } catch (err: any) {
        console.error("Camera scanner error:", err);
        if (err?.message?.includes("NotAllowedError") || err?.name === "NotAllowedError") {
          setError("Permiso de cámara denegado. Habilita el acceso a la cámara en la configuración del navegador.");
        } else if (err?.message?.includes("NotFoundError") || err?.name === "NotFoundError") {
          setError("No se encontró ninguna cámara en este dispositivo.");
        } else {
          setError(`Error al iniciar la cámara: ${err?.message || "desconocido"}`);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        const cleanup = async () => {
          try {
            const state = scanner.getState?.();
            // State 2 = SCANNING, 3 = PAUSED
            if (state === 2 || state === 3) {
              await scanner.stop();
            }
          } catch {}
          try {
            scanner.clear();
          } catch {}
        };
        cleanup();
      }
    };
  }, [open, facingMode, onScan, onClose]);

  const toggleCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  if (!open) return null;

  return (
    <div className="camera-scanner-overlay">
      <div className="camera-scanner-modal">
        {/* Header */}
        <div className="camera-scanner-header">
          <div className="camera-scanner-title">
            <Camera size={18} />
            <span>Escanear código</span>
          </div>
          <div className="camera-scanner-actions">
            <button
              type="button"
              onClick={toggleCamera}
              className="camera-scanner-btn"
              title="Cambiar cámara"
            >
              <SwitchCamera size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="camera-scanner-btn close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="camera-scanner-viewport-wrap">
          <div id="camera-scanner-viewport" ref={containerRef} />
          {!error && (
            <div className="camera-scanner-guide">
              <div className="camera-scanner-corners" />
              <p>Apunta al código de barras</p>
            </div>
          )}
          {error && (
            <div className="camera-scanner-error">
              <Camera size={32} />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
