import { SignIn } from "@clerk/nextjs";
import { ClerkConfigWarning } from "@/components/clerk-config-warning";
import { isClerkConfigured } from "@/lib/clerk-config";

export const dynamic = "force-dynamic";

export default function Page() {
  if (!isClerkConfigured()) {
    return <ClerkConfigWarning />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignIn />
    </main>
  );
}
