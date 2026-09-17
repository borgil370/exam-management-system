"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStoredUser, logout, type StoredUser } from "@/lib/session";

export function StudentHeader() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/student/exams"
          className="flex items-center gap-2 font-semibold"
        >
          <GraduationCap className="size-5" />
          <span className="hidden sm:inline">云考 · 学生端</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/student/exams"
            className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            我的考试
          </Link>
          <Link
            href="/student/history"
            className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            历史成绩
          </Link>
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar>
              <AvatarFallback>{user?.name?.[0] ?? "学"}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm sm:inline">
              {user?.name ?? "…"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name ?? "未登录"}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email ?? ""}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
