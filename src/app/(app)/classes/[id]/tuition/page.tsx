import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TuitionConfigForm } from "@/components/tuition-config-form";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";

export default async function ClassTuitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const klass = await prisma.class.findFirst({
    where: { id, teacherId: teacher.id },
    include: { tuition: true }
  });
  if (!klass) notFound();

  // Get count of completed lessons for this class
  const completedLessonsCount = await prisma.lessonSession.count({
    where: {
      classId: id,
      status: { in: ["COMPLETED", "TRIAL", "MAKEUP"] }
    }
  });

  return (
    <>
      <PageHeader
        title="Cấu hình học phí"
        description={klass.name}
        action={
          <Link href={`/classes/${klass.id}`} className="btn btn-secondary">
            <ArrowLeft size={18} />
            Tổng quan lớp
          </Link>
        }
      />
      <section className="grid-2">
        <div className="card p-4">
          <div className="section-heading">
            <h2>Hiện tại</h2>
            <WalletCards size={18} />
          </div>
          <p className="text-sm text-[var(--muted)]">Kiểu tính phí</p>
          <strong>{klass.tuition?.type ?? "Chưa cấu hình"}</strong>
          <p className="mt-4 text-sm text-[var(--muted)]">Mức phí chính</p>
          <strong className="text-2xl">{formatMoney(klass.tuition?.feePerLesson ?? klass.tuition?.fixedMonthlyFee ?? 0)}</strong>
          {completedLessonsCount > 0 && (
            <>
              <p className="mt-4 text-sm text-[var(--muted)]">Buổi đã hoàn thành</p>
              <strong>{completedLessonsCount} buổi</strong>
            </>
          )}
        </div>
        <TuitionConfigForm classId={klass.id} tuition={klass.tuition} completedLessonsCount={completedLessonsCount} />
      </section>
    </>
  );
}
