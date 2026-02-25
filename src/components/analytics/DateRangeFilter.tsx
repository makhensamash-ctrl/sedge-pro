import { useState } from "react";
import { format, subDays, startOfMonth, startOfYear, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const presets = [
  { label: "Last 7 days", from: subDays(new Date(), 7), to: new Date() },
  { label: "Last 30 days", from: subDays(new Date(), 30), to: new Date() },
  { label: "This month", from: startOfMonth(new Date()), to: new Date() },
  { label: "Last 3 months", from: subMonths(new Date(), 3), to: new Date() },
  { label: "This year", from: startOfYear(new Date()), to: new Date() },
  { label: "All time", from: undefined, to: undefined },
];

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const DateRangeFilter = ({ dateRange, onDateRangeChange }: DateRangeFilterProps) => {
  const [open, setOpen] = useState(false);

  const activePreset = presets.find((p) => {
    if (!p.from && !dateRange.from) return true;
    if (!p.from || !dateRange.from) return false;
    return (
      format(p.from, "yyyy-MM-dd") === format(dateRange.from, "yyyy-MM-dd") &&
      (!p.to || !dateRange.to || format(p.to, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd"))
    );
  });

  const label = !dateRange.from
    ? "All time"
    : dateRange.to
      ? `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          size="sm"
          variant={activePreset?.label === preset.label ? "default" : "outline"}
          className="text-xs h-8"
          onClick={() => onDateRangeChange({ from: preset.from, to: preset.to })}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 text-xs gap-1.5", !activePreset && dateRange.from && "border-primary")}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {!activePreset && dateRange.from ? label : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              onDateRangeChange({ from: range?.from, to: range?.to });
              if (range?.from && range?.to) setOpen(false);
            }}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;
