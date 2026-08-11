import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://jiawei-healthy-table.cargdentecalti.chatgpt.site"),
  title: "家味健康｜家庭饮食管理",
  description: "拍照识别每日菜品，分析营养摄入，管理健康抗炎食材。",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "家味健康｜家庭菜谱数据库", description: "从历史餐食中拆分菜品，记录好吃、还行与祛除。", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "家味健康｜家庭菜谱数据库", description: "让每一顿饭越来越合胃口，也更健康。", images: ["/og.png"] },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
