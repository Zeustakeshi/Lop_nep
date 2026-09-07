import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createClass } from "@/lib/actions";

export default function NewClassPage() {
  return (
    <>
      <PageHeader
        title="Tạo lớp học"
        description="Nhập thông tin tối thiểu trước. Học sinh, lịch học và học phí sẽ được hoàn tất ở trang tiếp theo."
        action={
          <Link href="/classes" className="btn btn-secondary">
            <ArrowLeft size={18} />
            Quản lý lớp
          </Link>
        }
      />
      <section className="card p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--muted)]">
              Bước 1 trong 4
            </p>
            <h2 className="text-lg font-black">Thông tin lớp</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-bold text-[var(--muted)]">
            <Plus size={16} />
            Chỉ cần 2 trường
          </div>
        </div>
        <form action={createClass} className="grid gap-4">
          <div className="grid-2">
            <div className="field">
              <label>Tên lớp</label>
              <input
                name="name"
                required
                placeholder="Ví dụ: Toán 9 - Hồng Thắm"
              />
            </div>
            <div className="field">
              <label>Môn học</label>
              <input name="subject" required placeholder="Ví dụ: Toán" />
            </div>
          </div>
          <details className="optional-panel">
            <summary>Thêm thông tin phụ nếu đã có</summary>
            <div className="mt-3 grid gap-4">
              <div className="grid-2">
                <div className="field">
                  <label>Ngày bắt đầu</label>
                  <input name="startDate" type="date" />
                </div>
                <div className="field">
                  <label>Mô tả</label>
                  <input
                    name="description"
                    placeholder="Mục tiêu, trình độ, ghi chú ngắn"
                  />
                </div>
              </div>
              <div className="field">
                <label>Ghi chú nội bộ</label>
                <textarea name="internalNote" />
              </div>
            </div>
          </details>
          <SubmitButton className="w-fit" pendingText="Đang tạo lớp...">
            Tạo lớp và thêm học sinh
            <ArrowRight size={18} />
          </SubmitButton>
        </form>
      </section>
    </>
  );
}
