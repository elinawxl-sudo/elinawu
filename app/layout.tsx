import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "家味健康｜家庭饮食管理",
  description: "拍照识别每日菜品，分析营养摄入，管理健康抗炎食材。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
