"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { momentLocalizer, type CalendarProps, type EventPropGetter, type SlotInfo, Views } from "react-big-calendar";
import type { EventInteractionArgs, withDragAndDropProps } from "react-big-calendar/lib/addons/dragAndDrop";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createSchedule, updateScheduleTime } from "@/lib/actions";
import { ShadcnDragAndDropCalendar } from "@/components/shadcn-big-calendar/shadcn-big-calendar";

type ScheduleItem = {
  id: string;
  classId: string;
  className: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string | null;
  learningMode?: string | null;
  isCurrentClass: boolean;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isCurrentClass: boolean;
  isPreview?: boolean;
};

type SelectedSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const weekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
moment.locale("vi");
const localizer = momentLocalizer(moment);
const ScheduleDndCalendar = ShadcnDragAndDropCalendar as React.ComponentType<
  CalendarProps<CalendarEvent> & withDragAndDropProps<CalendarEvent>
>;
const weekStart = startOfWeek();

function startOfWeek() {
  const date = new Date();
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function dateForWeeklySlot(dayOfWeek: number, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + dayOfWeek);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatTime(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return Math.max(timeToMinutes(aStart), timeToMinutes(bStart)) < Math.min(timeToMinutes(aEnd), timeToMinutes(bEnd));
}

export function ScheduleCalendarPicker({
  classId,
  schedules
}: {
  classId: string;
  schedules: ScheduleItem[];
}) {
  const router = useRouter();
  const [scheduleItems, setScheduleItems] = useState(schedules);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [learningMode, setLearningMode] = useState("");
  const [location, setLocation] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [message, setMessage] = useState("Nhập thông tin phụ nếu cần, rồi kéo nền trống để tự lưu lịch mới.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setScheduleItems(schedules);
  }, [schedules]);

  const events = useMemo<CalendarEvent[]>(
    () => {
      const scheduleEvents = scheduleItems.map((schedule) => ({
        id: schedule.id,
        title: schedule.isCurrentClass ? "Lớp này" : schedule.className,
        start: dateForWeeklySlot(schedule.dayOfWeek, schedule.startTime),
        end: dateForWeeklySlot(schedule.dayOfWeek, schedule.endTime),
        isCurrentClass: schedule.isCurrentClass
      }));

      if (!selectedSlot) return scheduleEvents;
      return [
        ...scheduleEvents,
        {
          id: "selected-slot-preview",
          title: "Lịch mới",
          start: dateForWeeklySlot(selectedSlot.dayOfWeek, selectedSlot.startTime),
          end: dateForWeeklySlot(selectedSlot.dayOfWeek, selectedSlot.endTime),
          isCurrentClass: true,
          isPreview: true
        }
      ];
    },
    [scheduleItems, selectedSlot]
  );

  const conflicts = selectedSlot
    ? scheduleItems.filter(
        (schedule) =>
          !schedule.isCurrentClass &&
          schedule.dayOfWeek === selectedSlot.dayOfWeek &&
          overlaps(selectedSlot.startTime, selectedSlot.endTime, schedule.startTime, schedule.endTime)
      )
    : [];

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => ({
    className: event.isPreview
      ? "calendar-event-preview"
      : event.isCurrentClass
        ? "calendar-event-current"
        : "calendar-event-conflict"
  });

  function handleSelect(slot: SlotInfo) {
    const nextSlot = {
      dayOfWeek: slot.start.getDay(),
      startTime: formatTime(slot.start),
      endTime: formatTime(slot.end)
    };

    setSelectedSlot(nextSlot);
    setMessage("Đang tạo lịch cố định...");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("classId", classId);
      formData.set("dayOfWeek", String(nextSlot.dayOfWeek));
      formData.set("startTime", nextSlot.startTime);
      formData.set("endTime", nextSlot.endTime);
      if (learningMode.trim()) formData.set("learningMode", learningMode.trim());
      if (location.trim()) formData.set("location", location.trim());
      if (effectiveFrom) formData.set("effectiveFrom", effectiveFrom);

      try {
        await createSchedule(formData);
        setMessage("Đã tạo lịch cố định.");
        setSelectedSlot(null);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không tạo được lịch cố định.");
      }
    });
  }

  function handleMoveSchedule({ event, start, end }: EventInteractionArgs<CalendarEvent>) {
    if (!event.isCurrentClass || event.isPreview) return;

    const nextStart = start instanceof Date ? start : new Date(start);
    const nextEnd = end instanceof Date ? end : new Date(end);
    const nextDayOfWeek = nextStart.getDay();
    const nextStartTime = formatTime(nextStart);
    const nextEndTime = formatTime(nextEnd);
    const previousItems = scheduleItems;

    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextStart >= nextEnd) {
      setMessage("Khung giờ lịch học không hợp lệ.");
      return;
    }

    const hasDuplicate = scheduleItems.some(
      (item) =>
        item.id !== event.id &&
        item.classId === classId &&
        item.dayOfWeek === nextDayOfWeek &&
        item.startTime === nextStartTime &&
        item.endTime === nextEndTime
    );
    if (hasDuplicate) {
      setMessage("Lớp này đã có lịch cố định trong đúng khung giờ đó.");
      return;
    }

    setSelectedSlot(null);
    setScheduleItems((current) =>
      current.map((item) =>
        item.id === event.id
          ? { ...item, dayOfWeek: nextDayOfWeek, startTime: nextStartTime, endTime: nextEndTime }
          : item
      )
    );
    setMessage("Đang lưu thay đổi lịch cố định...");

    startTransition(async () => {
      try {
        await updateScheduleTime({
          scheduleId: event.id,
          dayOfWeek: nextDayOfWeek,
          startTime: nextStartTime,
          endTime: nextEndTime
        });
        setMessage("Đã lưu thay đổi lịch cố định.");
        router.refresh();
      } catch (error) {
        setScheduleItems(previousItems);
        setMessage(error instanceof Error ? error.message : "Không lưu được thay đổi lịch cố định.");
      }
    });
  }

  function CalendarEventView({ event }: { event: CalendarEvent }) {
    return (
      <div className="calendar-event-inner">
        <strong>{event.title}</strong>
        <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
      </div>
    );
  }

  return (
    <section className="schedule-picker-layout">
      <div className="card p-4">
        <div className="section-heading">
          <h2>Chọn lịch trên calendar</h2>
          <span className="calendar-inline-help">{isPending ? "Đang lưu..." : message}</span>
        </div>
        <div className="calendar-shell calendar-shell-tall">
          <ScheduleDndCalendar
            localizer={localizer}
            events={events}
            defaultDate={weekStart}
            defaultView={Views.WEEK}
            views={[Views.WEEK]}
            step={30}
            timeslots={1}
            selectable="ignoreEvents"
            resizable
            toolbar={false}
            min={dateForWeeklySlot(0, "06:00")}
            max={dateForWeeklySlot(0, "23:00")}
            startAccessor="start"
            endAccessor="end"
            draggableAccessor={(event) => event.isCurrentClass && !event.isPreview}
            resizableAccessor={(event) => event.isCurrentClass && !event.isPreview}
            components={{ event: CalendarEventView }}
            eventPropGetter={eventPropGetter}
            onEventDrop={handleMoveSchedule}
            onEventResize={handleMoveSchedule}
            onSelectSlot={handleSelect}
          />
        </div>
      </div>
      <aside className="card schedule-side-panel p-4">
        <div>
          <p className="text-sm font-bold text-[var(--muted)]">Tự lưu lịch mới</p>
          <h2 className="text-lg font-black">
            {selectedSlot ? `${weekdays[selectedSlot.dayOfWeek]} ${selectedSlot.startTime} - ${selectedSlot.endTime}` : "Kéo chọn ô giờ"}
          </h2>
        </div>
        {conflicts.length ? (
          <div className="rounded-md border border-[#f1c48b] bg-[#fff7ed] p-3 text-sm text-[var(--warn)]">
            <div className="mb-2 flex items-center gap-2 font-black">
              <AlertTriangle size={18} />
              Trùng lịch với lớp khác
            </div>
            <div className="grid gap-1">
              {conflicts.map((item) => (
                <p key={item.id}>{item.className}: {item.startTime} - {item.endTime}</p>
              ))}
            </div>
          </div>
        ) : selectedSlot ? (
          <div className="rounded-md border border-[#b7d9d3] bg-[#f0fdfa] p-3 text-sm font-bold text-[var(--accent-strong)]">
            <CheckCircle2 size={18} className="mr-2 inline" />
            Chưa thấy trùng lịch với lớp khác.
          </div>
        ) : null}
        <details className="optional-panel">
          <summary>Địa điểm và hình thức</summary>
          <div className="mt-3 grid gap-3">
            <div className="field">
              <label>Hình thức</label>
              <input value={learningMode} onChange={(event) => setLearningMode(event.target.value)} placeholder="online/offline" />
            </div>
            <div className="field">
              <label>Địa điểm</label>
              <input value={location} onChange={(event) => setLocation(event.target.value)} />
            </div>
            <div className="field">
              <label>Áp dụng từ</label>
              <input value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} type="date" />
            </div>
          </div>
        </details>
        <div className="auto-save-note">{isPending ? "Đang lưu thay đổi..." : "Kéo chọn trên calendar là lưu ngay."}</div>
      </aside>
    </section>
  );
}
