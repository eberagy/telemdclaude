"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// dayOfWeek: 1=Mon … 7=Sun (matching DB convention)
const DAY_OF_WEEK = [1, 2, 3, 4, 5, 6, 7];

// 8am–6pm in 30-min increments
const TIME_SLOTS: string[] = [];
for (let h = 8; h < 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${suffix}`;
}

// Cell key: "dayIndex-timeSlot" e.g. "0-09:00"
type CellKey = string;

interface AvailabilityBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

function blocksToSelected(blocks: AvailabilityBlock[]): Set<CellKey> {
  const selected = new Set<CellKey>();
  for (const block of blocks) {
    const dayIndex = block.dayOfWeek - 1; // 0-indexed
    for (const slot of TIME_SLOTS) {
      if (slot >= block.startTime && slot < block.endTime) {
        selected.add(`${dayIndex}-${slot}`);
      }
    }
  }
  return selected;
}

function selectedToBlocks(selected: Set<CellKey>): AvailabilityBlock[] {
  // Collapse consecutive selected slots per day into blocks
  const blocks: AvailabilityBlock[] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayCells = TIME_SLOTS.filter((slot) => selected.has(`${dayIndex}-${slot}`));
    if (dayCells.length === 0) continue;

    let blockStart = dayCells[0];
    let prev = dayCells[0];

    for (let i = 1; i <= dayCells.length; i++) {
      const curr = dayCells[i];
      const prevIdx = TIME_SLOTS.indexOf(prev);
      const currIdx = curr !== undefined ? TIME_SLOTS.indexOf(curr) : -1;

      if (currIdx !== prevIdx + 1) {
        // End of a consecutive run — compute end time (30 min after prev)
        const prevSlotIdx = TIME_SLOTS.indexOf(prev);
        const endSlot = TIME_SLOTS[prevSlotIdx + 1];
        const endTime = endSlot ?? "18:00";
        blocks.push({ dayOfWeek: dayIndex + 1, startTime: blockStart, endTime });
        if (curr !== undefined) blockStart = curr;
      }
      if (curr !== undefined) prev = curr;
    }
  }
  return blocks;
}

export default function ClinicianAvailabilityPage() {
  const [selected, setSelected] = useState<Set<CellKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState<boolean | null>(null); // true=select, false=deselect

  useEffect(() => {
    fetch("/api/clinician/availability")
      .then((r) => r.json())
      .then((data) => {
        if (data.blocks) {
          setSelected(blocksToSelected(data.blocks as AvailabilityBlock[]));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleCell = (key: CellKey, forceValue?: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const newVal = forceValue !== undefined ? forceValue : !prev.has(key);
      if (newVal) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleMouseDown = (key: CellKey) => {
    const newVal = !selected.has(key);
    setDragging(newVal);
    toggleCell(key, newVal);
  };

  const handleMouseEnter = (key: CellKey) => {
    if (dragging !== null) {
      toggleCell(key, dragging);
    }
  };

  const handleMouseUp = () => setDragging(null);

  const handleSave = async () => {
    setSaving(true);
    const blocks = selectedToBlocks(selected);
    await fetch("/api/clinician/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      className="container py-8 max-w-5xl space-y-6"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          My Availability
        </h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Availability"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Click or drag to toggle availability. Blue = available.
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="h-64 bg-muted rounded animate-pulse" />
          ) : (
            <table className="w-full border-collapse select-none text-xs" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th className="w-14 text-right pr-2 text-muted-foreground font-normal pb-1" />
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="text-center text-muted-foreground font-semibold pb-2 px-0.5"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td className="text-right pr-2 text-muted-foreground leading-none py-0.5 whitespace-nowrap">
                      {slot.endsWith(":00") ? formatTime(slot) : ""}
                    </td>
                    {DAY_OF_WEEK.map((_, dayIndex) => {
                      const key: CellKey = `${dayIndex}-${slot}`;
                      const isOn = selected.has(key);
                      return (
                        <td key={dayIndex} className="px-0.5 py-0.5">
                          <div
                            role="checkbox"
                            aria-checked={isOn}
                            aria-label={`${DAYS[dayIndex]} ${formatTime(slot)}`}
                            className={`h-5 w-full rounded-sm cursor-pointer transition-colors border ${
                              isOn
                                ? "bg-primary border-primary"
                                : "bg-muted border-transparent hover:bg-primary/20"
                            }`}
                            onMouseDown={() => handleMouseDown(key)}
                            onMouseEnter={() => handleMouseEnter(key)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
