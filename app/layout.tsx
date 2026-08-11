import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "朱医生&巫豆豆-家庭饮食健康管理",
  description: "拍照识别每日菜品，分析营养摄入，管理健康抗炎食材与家庭菜谱。",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "朱医生&巫豆豆-家庭饮食健康管理", description: "记录每一餐，兼顾营养、抗炎与家庭口味。" },
  twitter: { card: "summary", title: "朱医生&巫豆豆-家庭饮食健康管理", description: "记录每一餐，兼顾营养、抗炎与家庭口味。" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
