import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowRight, CheckCircle2, Clock3, Plus } from "lucide-react";
import Link from "next/link";

const weekdays = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

export default async function ClassesPage() {
  const teacher = await requireTeacher();
  const classes = await prisma.class.findMany({
    where: { teacherId: teacher.id },
    include: { students: true, schedules: true, tuition: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Quản lý lớp học"
        description="Theo dõi lớp đang học, lớp chưa setup xong và mở từng lớp để vận hành."
        action={
          <Link href="/classes/new" className="btn btn-primary">
            <Plus size={18} />
            Tạo lớp
          </Link>
        }
      />
      <section className="card p-4">
        <div className="section-heading">
          <h2>Danh sách lớp</h2>
          <span className="text-sm font-bold text-[var(--muted)]">
            {classes.length} lớp
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Lớp</th>
              <th>Môn</th>
              <th>Học sinh</th>
              <th>Lịch</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link
                    className="font-black text-[var(--accent-strong)]"
                    href={`/classes/${item.id}`}
                  >
                    {item.name}
                  </Link>
                </td>
                <td>{item.subject}</td>
                <td>{item.students.length}</td>
                <td>
                  {item.schedules
                    .map((s) => `${weekdays[s.dayOfWeek]} ${s.startTime}`)
                    .join(", ") || "Chưa có"}
                </td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={item.status} />
                    {item.setupStatus === "COMPLETE" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent-strong)]">
                        <CheckCircle2 size={14} />
                        Đủ setup
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--warn)]">
                        <Clock3 size={14} />
                        Cần hoàn tất
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
