export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
}

// 登录时写入 localStorage 的用户信息（仅供界面显示，鉴权以 httpOnly Cookie 为准）
export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem("user");
  }
}
