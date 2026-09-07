"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import { momentLocalizer, type CalendarProps, type EventPropGetter, type SlotInfo, type View, Views } from "react-big-calendar";
import type { EventInteractionArgs, withDragAndDropProps } from "react-big-calendar/lib/addons/dragAndDrop";
import { createLesson, deleteLesson, quickUpdateLessonStatus, updateLesson, updateLessonTime } from "@/lib/actions";
import { ShadcnDragAndDropCalendar } from "@/components/shadcn-big-calendar/shadcn-big-calendar";
import { ConfirmModal } from "@/components/confirm-modal";

type LessonCalendarItem = {
  id: string;
  classId: string;
  className: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  status: string;
  taughtContent?: string | null;
  homework?: string | null;
  internalNote?: string | null;
  parentNote?: string | null;
  isBillable: boolean;
  billableAmount: number;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  classId: string;
  lessonDate: string;
  taughtContent?: string | null;
  homework?: string | null;
  internalNote?: string | null;
  parentNote?: string | null;
  isBillable: boolean;
  billableAmount: number;
};

moment.locale("vi");
const localizer = momentLocalizer(moment);
const TeachingCalendar = ShadcnDragAndDropCalendar as React.ComponentType<
  CalendarProps<CalendarEvent> & withDragAndDropProps<CalendarEvent>
>;
const statusClassNames: Record<string, string> = {
  PLANNED: "calendar-event-muted",
  COMPLETED: "calendar-event-current",
  STUDENT_ABSENT: "calendar-event-warning",
  TEACHER_ABSENT: "calendar-event-warning",
  CANCELLED: "calendar-event-danger",
  MAKEUP: "calendar-event-info",
  TRIAL: "calendar-event-info"
};

function dateTime(date: string, time: string) {
  return new Date(`${date}T${time}`);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeKey(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function buildEvents(lessons: LessonCalendarItem[]) {
  return lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.className,
    start: dateTime(lesson.lessonDate, lesson.startTime),
    end: dateTime(lesson.lessonDate, lesson.endTime),
    status: lesson.status,
    classId: lesson.classId,
    lessonDate: lesson.lessonDate,
    taughtContent: lesson.taughtContent,
    homework: lesson.homework,
    internalNote: lesson.internalNote,
    parentNote: lesson.parentNote,
    isBillable: lesson.isBillable,
    billableAmount: lesson.billableAmount
  }));
}

function CalendarEventView({ event }: { event: CalendarEvent }) {
  return (
    <div className="calendar-event-inner">
      <strong>{event.title}</strong>
      <span>{timeKey(event.start)} - {timeKey(event.end)}</span>
    </div>
  );
}

export function ScheduleOverviewCalendar({
  lessons,
  classes
}: {
  lessons: LessonCalendarItem[];
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const sourceEvents = useMemo(() => buildEvents(lessons), [lessons]);
  const [events, setEvents] = useState<CalendarEvent[]>(sourceEvents);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [calendarView, setCalendarView] = useState<View>(Views.WEEK);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [creatingSlot, setCreatingSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [message, setMessage] = useState("Kéo buổi học để đổi ngày/giờ, kéo mép dưới để đổi thời lượng.");
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Modal state for billable warning
  const [showBillableWarning, setShowBillableWarning] = useState(false);
  const [pendingBillableChange, setPendingBillableChange] = useState<{
    value: string;
    lessonTitle: string;
    billableAmount: number;
  } | null>(null);

  function handleBillableChange(value: string, lessonTitle: string, billableAmount: number) {
    if (value === "") {
      // User selected "Không" (no billable)
      setPendingBillableChange({ value, lessonTitle, billableAmount });
      setShowBillableWarning(true);
    }
  }

  useEffect(() => {
    setEvents(sourceEvents);
    setEditingEvent((current) => {
      if (!current) return null;
      return sourceEvents.find((event) => event.id === current.id) ?? null;
    });
  }, [sourceEvents]);

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => ({
    className: statusClassNames[event.status] ?? "calendar-event-muted"
  });

  function persistEventTime({ event, start, end }: EventInteractionArgs<CalendarEvent>) {
    if (isPending) return;

    const nextStart = start instanceof Date ? start : new Date(start);
    const nextEnd = end instanceof Date ? end : new Date(end);
    const previousEvents = events;

    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextStart >= nextEnd) {
      setMessage("Khung giờ vừa chọn không hợp lệ.");
      return;
    }

    const hasDuplicate = events.some(
      (item) =>
        item.id !== event.id &&
        item.classId === event.classId &&
        dateKey(item.start) === dateKey(nextStart) &&
        timeKey(item.start) === timeKey(nextStart) &&
        timeKey(item.end) === timeKey(nextEnd)
    );
    if (hasDuplicate) {
      setMessage("Lớp này đã có buổi học trong đúng khung giờ đó.");
      return;
    }

    setEvents((current) =>
      current.map((item) => (item.id === event.id ? { ...item, start: nextStart, end: nextEnd } : item))
    );
    setMessage("Đang lưu thay đổi lịch...");
    setPendingAction("move");

    startTransition(async () => {
      try {
        await updateLessonTime({
          lessonId: event.id,
          lessonDate: dateKey(nextStart),
          startTime: timeKey(nextStart),
          endTime: timeKey(nextEnd)
        });
        setMessage("Đã lưu thay đổi lịch.");
        router.refresh();
      } catch (error) {
        setEvents(previousEvents);
        setMessage(error instanceof Error ? error.message : "Không lưu được thay đổi lịch.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleSubmitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const formData = new FormData(event.currentTarget);

    // Check if billable is being set to "Không"
    const billableValue = formData.get("isBillable");
    if (billableValue === "" && editingEvent?.isBillable) {
      // Show warning before proceeding
      handleBillableChange("", editingEvent.title, editingEvent.billableAmount);
      return;
    }

    setMessage("Đang lưu chỉnh sửa buổi học...");
    setPendingAction("save");

    startTransition(async () => {
      try {
        await updateLesson(formData);
        setEditingEvent(null);
        setShowBillableWarning(false);
        setPendingBillableChange(null);
        setMessage("Đã lưu chỉnh sửa buổi học.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không lưu được chỉnh sửa buổi học.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleConfirmBillableChange() {
    if (!editingEvent || !pendingBillableChange || isPending) return;

    setShowBillableWarning(false);

    const formData = new FormData();
    formData.set("lessonId", editingEvent.id);
    formData.set("status", editingEvent.status);
    formData.set("lessonDate", editingEvent.lessonDate);
    formData.set("startTime", timeKey(editingEvent.start));
    formData.set("endTime", timeKey(editingEvent.end));
    formData.set("isBillable", "");
    formData.set("billableAmount", "0");

    setMessage("Đang lưu chỉnh sửa buổi học...");
    setPendingAction("confirm-billable");

    startTransition(async () => {
      try {
        await updateLesson(formData);
        setEditingEvent(null);
        setPendingBillableChange(null);
        setMessage("Đã lưu: buổi học không được tính phí.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không lưu được chỉnh sửa buổi học.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    setMessage("Đang tạo buổi học...");
    setPendingAction("create");
    startTransition(async () => {
      try {
        await createLesson(formData);
        setCreatingSlot(null);
        setMessage("Đã tạo buổi học.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không tạo được buổi học.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleQuickStatus(status: string) {
    if (!editingEvent || isPending) return;
    setMessage("Đang cập nhật buổi học...");
    setPendingAction(`status:${status}`);
    startTransition(async () => {
      try {
        await quickUpdateLessonStatus({ lessonId: editingEvent.id, status });
        setEditingEvent(null);
        setMessage("Đã cập nhật trạng thái.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không cập nhật được buổi học.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleDelete() {
    if (!editingEvent || isPending) return;
    if (!window.confirm(`Xóa vĩnh viễn buổi học ${editingEvent.title}? Thao tác này không thể hoàn tác.`)) return;
    setMessage("Đang xóa buổi học...");
    setPendingAction("delete");
    startTransition(async () => {
      try {
        await deleteLesson(editingEvent.id);
        setEditingEvent(null);
        setMessage("Đã xóa buổi học.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không xóa được buổi học.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <div className="schedule-calendar-panel">
      <div className="calendar-helper-row">
        <span>{message}</span>
        {isPending ? <strong>Đang lưu</strong> : null}
      </div>
      <div className="calendar-shell calendar-shell-tall">
      <TeachingCalendar
        localizer={localizer}
        events={events}
        date={calendarDate}
        view={calendarView}
        views={[Views.DAY, Views.WEEK, Views.MONTH]}
        onNavigate={(nextDate) => setCalendarDate(nextDate)}
        onView={(nextView) => setCalendarView(nextView)}
        onDrillDown={(nextDate) => {
          setCalendarDate(nextDate);
          setCalendarView(Views.DAY);
        }}
        step={30}
        timeslots={1}
        min={dateTime("2026-01-01", "06:00")}
        max={dateTime("2026-01-01", "23:00")}
        startAccessor="start"
        endAccessor="end"
        resizable
        selectable
        draggableAccessor={(event) => event.status !== "CANCELLED"}
        resizableAccessor={(event) => event.status !== "CANCELLED"}
        components={{ event: CalendarEventView }}
        eventPropGetter={eventPropGetter}
        onEventDrop={persistEventTime}
        onEventResize={persistEventTime}
        onSelectEvent={(event) => {
          setEditingEvent(event);
        }}
        onSelectSlot={(slot: SlotInfo) => {
          if (slot.start >= slot.end) return;

          if (calendarView === Views.MONTH || slot.action === "click") {
            const start = new Date(slot.start);
            if (calendarView === Views.MONTH) start.setHours(7, 0, 0, 0);
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + (calendarView === Views.MONTH ? 60 : 30));
            setCreatingSlot({ start, end });
            return;
          }

          setCreatingSlot({ start: slot.start, end: slot.end });
        }}
        messages={{
          today: "Hôm nay",
          previous: "Trước",
          next: "Sau",
          day: "Ngày",
          month: "Tháng",
          week: "Tuần",
          noEventsInRange: "Không có buổi học trong khoảng này"
        }}
      />
      </div>
      {creatingSlot ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !isPending && setCreatingSlot(null)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="lesson-create-title" onMouseDown={(event) => event.stopPropagation()}>
            <form onSubmit={handleCreate} className="grid gap-4">
              <div className="modal-heading">
                <div><p>Buổi phát sinh</p><h2 id="lesson-create-title">Tạo nhanh trên lịch</h2></div>
                <button className="icon-button" type="button" disabled={isPending} onClick={() => setCreatingSlot(null)} aria-label="Đóng">x</button>
              </div>
              <div className="field"><label>Lớp</label><select name="classId" required>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div className="grid-3">
                <div className="field"><label>Ngày</label><input name="lessonDate" type="date" defaultValue={dateKey(creatingSlot.start)} required /></div>
                <div className="field"><label>Bắt đầu</label><input name="startTime" type="time" defaultValue={timeKey(creatingSlot.start)} required /></div>
                <div className="field"><label>Kết thúc</label><input name="endTime" type="time" defaultValue={timeKey(creatingSlot.end)} required /></div>
              </div>
              <input name="status" type="hidden" value="PLANNED" />
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" disabled={isPending} onClick={() => setCreatingSlot(null)}>Hủy</button>
                <button className="btn btn-primary" type="submit" disabled={isPending}>{pendingAction === "create" ? "Đang tạo..." : "Tạo buổi học"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {editingEvent ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !isPending && setEditingEvent(null)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="lesson-edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <form onSubmit={handleSubmitEdit} className="grid gap-4">
              <div className="modal-heading">
                <div>
                  <p>Chỉnh sửa buổi học</p>
                  <h2 id="lesson-edit-title">{editingEvent.title}</h2>
                </div>
                <button className="icon-button" type="button" disabled={isPending} onClick={() => setEditingEvent(null)} aria-label="Đóng">x</button>
              </div>
              <input name="lessonId" type="hidden" value={editingEvent.id} />
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" type="button" disabled={isPending} onClick={() => handleQuickStatus("COMPLETED")}>{pendingAction === "status:COMPLETED" ? "Đang lưu..." : "Đã dạy"}</button>
                <button className="btn btn-secondary" type="button" disabled={isPending} onClick={() => handleQuickStatus("STUDENT_ABSENT")}>{pendingAction === "status:STUDENT_ABSENT" ? "Đang lưu..." : "Học sinh nghỉ"}</button>
                <button className="btn btn-secondary" type="button" disabled={isPending} onClick={() => handleQuickStatus("CANCELLED")}>{pendingAction === "status:CANCELLED" ? "Đang lưu..." : "Hủy buổi"}</button>
              </div>
              <div className="grid-3">
                <div className="field"><label>Ngày</label><input name="lessonDate" type="date" defaultValue={dateKey(editingEvent.start)} required /></div>
                <div className="field"><label>Bắt đầu</label><input name="startTime" type="time" defaultValue={timeKey(editingEvent.start)} required /></div>
                <div className="field"><label>Kết thúc</label><input name="endTime" type="time" defaultValue={timeKey(editingEvent.end)} required /></div>
              </div>
              <div className="grid-3">
                <div className="field">
                  <label>Trạng thái</label>
                  <select name="status" defaultValue={editingEvent.status}>
                    <option value="PLANNED">Chưa ghi nhận</option>
                    <option value="COMPLETED">Đã dạy</option>
                    <option value="STUDENT_ABSENT">Học sinh nghỉ</option>
                    <option value="TEACHER_ABSENT">Giáo viên nghỉ</option>
                    <option value="CANCELLED">Hủy buổi</option>
                    <option value="MAKEUP">Dạy bù</option>
                    <option value="TRIAL">Học thử</option>
                  </select>
                </div>
                <div className="field">
                  <label>Tính phí</label>
                  <select
                    name="isBillable"
                    defaultValue={editingEvent.isBillable ? "on" : ""}
                    onChange={(e) => handleBillableChange(e.target.value, editingEvent.title, editingEvent.billableAmount)}
                  >
                    <option value="">Không</option>
                    <option value="on">Có</option>
                  </select>
                </div>
                <div className="field"><label>Số tiền</label><input name="billableAmount" inputMode="numeric" defaultValue={editingEvent.billableAmount || ""} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Nội dung đã dạy</label><textarea name="taughtContent" defaultValue={editingEvent.taughtContent ?? ""} /></div>
                <div className="field"><label>Bài tập về nhà</label><textarea name="homework" defaultValue={editingEvent.homework ?? ""} /></div>
                <div className="field"><label>Ghi chú nội bộ</label><textarea name="internalNote" defaultValue={editingEvent.internalNote ?? ""} /></div>
                <div className="field"><label>Ghi chú cho phụ huynh</label><textarea name="parentNote" defaultValue={editingEvent.parentNote ?? ""} /></div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" disabled={isPending} onClick={handleDelete}>{pendingAction === "delete" ? "Đang xóa..." : "Xóa buổi"}</button>
                <button className="btn btn-secondary" type="button" disabled={isPending} onClick={() => setEditingEvent(null)}>Đóng</button>
                <button className="btn btn-primary" type="submit" disabled={isPending}>{pendingAction === "save" ? "Đang lưu..." : "Lưu thay đổi"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <ConfirmModal
        isOpen={showBillableWarning}
        onClose={() => {
          setShowBillableWarning(false);
          setPendingBillableChange(null);
        }}
        onConfirm={handleConfirmBillableChange}
        title="Xác nhận không tính phí"
        description={
          <div>
            <p>Bạn đang chuyển buổi học <strong>{editingEvent?.title}</strong> sang <strong>không tính phí</strong>.</p>
            <p>Thông tin:</p>
            <ul>
              <li>Buổi học sẽ <strong>không xuất hiện</strong> trong báo cáo học phí</li>
              <li>Số tiền <strong>{editingEvent?.billableAmount.toLocaleString("vi-VN")}đ</strong> sẽ không được tính</li>
              <li>Phụ huynh sẽ không thấy buổi học này trong phiếu báo phí</li>
            </ul>
            <p>Bạn có chắc chắn muốn tiếp tục?</p>
          </div>
        }
        confirmText="Đồng ý, không tính phí"
        cancelText="Hủy, giữ nguyên"
        confirmVariant="danger"
        isPending={isPending}
      />
    </div>
  );
}
