import type { Metadata } from "next";
import "./globals.css";
import "./story-system.css";
import "./precision-story.css";
import "./current-lab.css";

export const metadata: Metadata = {
  title: "PAW — 协作完成任务，用评测推动改进",
  description: "从一个用户目标出发，看 PAW 如何组织多 Agent 协作、验证交付、比较改进，并在下一次工作中继续。包含交互演示、系统架构与公开实验依据。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className="story-public">{children}</body></html>;
}
