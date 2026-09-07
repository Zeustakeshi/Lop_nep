import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function requireTeacher() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email ??
    "Giáo viên";

  return prisma.teacher.upsert({
    where: { clerkUserId: userId },
    update: {
      name,
      email,
      avatarUrl: user?.imageUrl
    },
    create: {
      clerkUserId: userId,
      name,
      email,
      avatarUrl: user?.imageUrl
    }
  });
}

export async function getTeacherId() {
  const teacher = await requireTeacher();
  return teacher.id;
}
