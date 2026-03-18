"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "@/lib/utils";

// Komponen toggle switch menggunakan Radix UI.
// Dipakai di halaman Availability untuk mengaktifkan/nonaktifkan hari tertentu.
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Track (background): hijau saat aktif, abu-abu saat nonaktif
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-all outline-none",
        "data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-stone-200",
        "focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* Thumb (bulatan putih yang bergeser): geser ke kanan saat aktif */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
