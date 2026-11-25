"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn-primary print-hide" onClick={() => window.print()}>
      Print this confirmation
    </button>
  );
}
