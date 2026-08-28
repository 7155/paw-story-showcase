import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAW — 让每一次工作成为下一次的上下文",
  description: "PAW 项目叙事原型：智能输入、OS 记忆、多 Agent、知识库与内置沙盒浏览器。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
