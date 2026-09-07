import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="container flex min-h-screen items-center py-10">
      <section className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="self-center">
          <div className="mb-5">
            <Brand href="" />
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-tight md:text-6xl">
            Quản lý học phí dạy thêm rõ ràng hơn Excel.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
            Theo dõi lớp học, lịch dạy, buổi học, báo cáo phụ huynh và thanh
            toán trong một nơi.
          </p>
          <div className="mt-7 flex gap-3">
            <Link className="btn btn-primary" href="/sign-in">
              Đăng nhập
            </Link>
            <Link className="btn btn-secondary" href="/sign-up">
              Tạo tài khoản
            </Link>
          </div>
        </div>
        <div className="card p-5">
          <div className="grid gap-3">
            {[
              "Lịch dạy hôm nay",
              "Buổi học cần ghi nhận",
              "Báo cáo học phí tháng",
              "Trạng thái đã thu/chưa thu",
            ].map((item) => (
              <div
                key={item}
                className="rounded-md border border-[var(--line)] p-4"
              >
                <div className="text-sm font-black">{item}</div>
                <div className="mt-2 h-2 rounded bg-[var(--line)]" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
