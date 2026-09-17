"use client";

import { useState } from "react";
import { DateTimePicker } from "@/components/datetime-picker";
import { Label } from "@/components/ui/label";

export default function DevPreview() {
  const [value, setValue] = useState("");
  return (
    <div className="mx-auto max-w-sm space-y-2 p-10">
      <Label htmlFor="dt">开始时间</Label>
      <DateTimePicker id="dt" value={value} onChange={setValue} placeholder="选择开考时间" />
      <p className="text-sm text-muted-foreground">value: {value || "(空)"}</p>
    </div>
  );
}
