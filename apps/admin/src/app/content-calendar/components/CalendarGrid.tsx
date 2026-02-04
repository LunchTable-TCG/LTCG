"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Doc } from "@convex/_generated/dataModel";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo } from "react";

type ScheduledContent = Doc<"scheduledContent">;

// Content type colors
const TYPE_COLORS: Record<string, string> = {
  blog: "bg-blue-500",
  x_post: "bg-sky-400",
  reddit: "bg-orange-500",
  email: "bg-green-500",
  announcement: "bg-amber-500",
  news: "bg-purple-500",
  image: "bg-pink-500",
};

interface CalendarGridProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  content: ScheduledContent[];
  onDayClick: (date: Date) => void;
  selectedDate: Date | null;
}

export function CalendarGrid({
  currentDate,
  onDateChange,
  content,
  onDayClick,
  selectedDate,
}: CalendarGridProps) {
  // Get calendar data
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Day of week for first day (0 = Sunday)
    const startDayOfWeek = firstDay.getDay();

    // Total days in month
    const daysInMonth = lastDay.getDate();

    // Create array of days
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Group content by day
  const contentByDay = useMemo(() => {
    const map = new Map<string, ScheduledContent[]>();
    for (const item of content) {
      const date = new Date(item.scheduledFor);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    return map;
  }, [content]);

  const goToPreviousMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getContentForDay = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return contentByDay.get(key) ?? [];
  };

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-card rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{monthYear}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dayContent = getContentForDay(day.date);
          const hasContent = dayContent.length > 0;

          return (
            <button
              type="button"
              key={index}
              onClick={() => onDayClick(day.date)}
              className={cn(
                "min-h-[100px] p-2 border-b border-r text-left transition-colors hover:bg-accent/50",
                !day.isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isToday(day.date) && "bg-primary/10",
                isSelected(day.date) && "ring-2 ring-primary ring-inset"
              )}
            >
              <div
                className={cn(
                  "text-sm font-medium mb-1",
                  isToday(day.date) &&
                    "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                )}
              >
                {day.date.getDate()}
              </div>

              {/* Content indicators */}
              {hasContent && (
                <div className="space-y-1">
                  {dayContent.slice(0, 3).map((item) => (
                    <div
                      key={item._id}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded truncate text-white",
                        TYPE_COLORS[item.type] ?? "bg-gray-500"
                      )}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  ))}
                  {dayContent.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayContent.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-3 border-t flex flex-wrap gap-3">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs">
            <div className={cn("w-3 h-3 rounded", color)} />
            <span className="capitalize">{type.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
