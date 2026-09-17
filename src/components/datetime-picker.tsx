"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "cn";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// 输出与 <input type="datetime-local"> 相同的本地格式 "YYYY-MM-DDTHH:mm"
function toLocalValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 以周一为一周开头，返回 6×7 共 42 天
function monthGrid(year: number, month: number): Date[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from(
    { length: 42 },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );
}

function formatDisplay(d: Date) {
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface DateTimePickerProps {
  id?: string;
  value: string; // "YYYY-MM-DDTHH:mm" 或空字符串
  onChange: (value: string) => void;
  placeholder?: string;
}

function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = "选择日期和时间",
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? new Date(value) : null;
  const [view, setView] = React.useState(() => selected ?? new Date());
  const today = new Date();

  const viewYear = view.getFullYear();
  const viewMonth = view.getMonth();
  const days = monthGrid(viewYear, viewMonth);

  const minuteOptions =
    selected && !MINUTES.includes(selected.getMinutes())
      ? [...MINUTES, selected.getMinutes()].sort((a, b) => a - b)
      : MINUTES;

  function commit(d: Date) {
    onChange(toLocalValue(d));
  }

  function pickDay(day: Date) {
    // 未选过时间时默认 09:00，已选过则保留原时分
    commit(
      new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        selected?.getHours() ?? 9,
        selected?.getMinutes() ?? 0
      )
    );
  }

  function pickTime(hours: number, minutes: number) {
    const base = selected ?? new Date();
    commit(
      new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        hours,
        minutes
      )
    );
  }

  function shiftMonth(delta: number) {
    setView(new Date(viewYear, viewMonth + delta, 1));
  }

  function applyPreset(d: Date) {
    commit(d);
    setView(d);
    setOpen(false);
  }

  const presets: { label: string; get: () => Date }[] = [
    {
      label: "1 小时后",
      get: () => {
        const d = new Date();
        d.setHours(d.getHours() + 1, 0, 0, 0);
        return d;
      },
    },
    {
      label: "明天 09:00",
      get: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: "下周一 09:00",
      get: () => {
        const d = new Date();
        d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
  ];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
          !selected && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">
          {selected ? formatDisplay(selected) : placeholder}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" sideOffset={4} align="start" className="isolate z-50">
          <Popover.Popup className="z-50 w-64 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="mb-2 flex flex-wrap gap-1">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.get())}
                  className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="上个月"
                className="flex size-7 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <span className="text-sm font-medium">
                {viewYear} 年 {viewMonth + 1} 月
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="下个月"
                className="flex size-7 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((w) => (
                <span
                  key={w}
                  className="py-1 text-xs text-muted-foreground"
                >
                  {w}
                </span>
              ))}
              {days.map((day) => {
                const inMonth = day.getMonth() === viewMonth;
                const isSelected = selected !== null && isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                return (
                  <button
                    key={day.toDateString()}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={cn(
                      "rounded-md py-1 text-sm hover:bg-accent hover:text-accent-foreground",
                      !inMonth && "text-muted-foreground/50",
                      isToday && !isSelected && "ring-1 ring-foreground/20",
                      isSelected &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
              <select
                aria-label="时"
                value={selected?.getHours() ?? 9}
                onChange={(e) =>
                  pickTime(Number(e.target.value), selected?.getMinutes() ?? 0)
                }
                className="h-7 flex-1 rounded-md border border-input bg-transparent px-1 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {pad(h)} 时
                  </option>
                ))}
              </select>
              <select
                aria-label="分"
                value={selected?.getMinutes() ?? 0}
                onChange={(e) =>
                  pickTime(selected?.getHours() ?? 9, Number(e.target.value))
                }
                className="h-7 flex-1 rounded-md border border-input bg-transparent px-1 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {pad(m)} 分
                  </option>
                ))}
              </select>
              {selected && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  清除
                </button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { DateTimePicker };
