export function ClerkConfigWarning() {
  return (
    <main className="container flex min-h-screen items-center justify-center py-10">
      <section className="card max-w-xl p-6">
        <h1 className="text-2xl font-black">Chưa cấu hình Clerk</h1>
        <p className="mt-3 text-[var(--muted)]">
          App đã có trang đăng nhập, nhưng `.env.local` đang dùng key placeholder nên nút đăng nhập Google sẽ không hoạt động.
        </p>
        <div className="mt-4 rounded-md border border-[var(--line)] bg-[#f7f8f5] p-4 text-sm">
          <p className="font-bold">Cần thay 2 dòng này bằng key thật từ Clerk:</p>
          <pre className="mt-2 overflow-x-auto">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."`}
          </pre>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Sau khi sửa `.env.local`, dừng server và chạy lại `npm run dev`.
        </p>
      </section>
    </main>
  );
}
