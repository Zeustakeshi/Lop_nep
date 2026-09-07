import { PageHeader } from "@/components/page-header";
import { updateSettings } from "@/lib/actions";
import { requireTeacher } from "@/lib/auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { BankSettingsForm } from "@/components/bank-settings-form";

export default async function SettingsPage() {
  const teacher = await requireTeacher();

  return (
    <>
      <PageHeader title="Cài đặt" description="Thông tin hiển thị trên báo cáo và nội dung thanh toán mặc định." />
      <form action={updateSettings} className="card grid gap-5 p-4">
        <section>
          <h2 className="mb-3 text-lg font-black">Giao diện</h2>
          <div className="field">
            <label>Chế độ màu</label>
            <div className="mt-2">
              <ThemeSwitcher />
            </div>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-black">Thông tin giáo viên</h2>
          <div className="grid-2">
            <div className="field"><label>Tên hiển thị</label><input name="name" defaultValue={teacher.name} required /></div>
            <div className="field"><label>Email</label><input value={teacher.email} disabled /></div>
            <div className="field"><label>Số điện thoại</label><input name="phone" defaultValue={teacher.phone ?? ""} /></div>
          </div>
        </section>
        <BankSettingsForm teacher={teacher} />
        <section>
          <h2 className="mb-3 text-lg font-black">Mẫu báo cáo</h2>
          <div className="grid gap-3">
            <div className="field"><label>Lời nhắn đầu báo cáo</label><textarea name="defaultReportGreeting" defaultValue={teacher.defaultReportGreeting ?? ""} /></div>
            <div className="field"><label>Ghi chú thanh toán mặc định</label><textarea name="defaultPaymentNote" defaultValue={teacher.defaultPaymentNote ?? "Phụ huynh vui lòng chuyển khoản học phí trong vòng 3 ngày sau khi nhận báo cáo. Nội dung chuyển khoản: Tên học sinh + Tháng học."} /></div>
            <div className="field"><label>Ghi chú cuối báo cáo</label><textarea name="defaultReportFooter" defaultValue={teacher.defaultReportFooter ?? ""} /></div>
          </div>
        </section>
        <button className="btn btn-primary w-fit" type="submit">Lưu cài đặt</button>
      </form>
    </>
  );
}
