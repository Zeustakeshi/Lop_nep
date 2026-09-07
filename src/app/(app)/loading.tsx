"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const loadingMessages = [
  "Nắn nót từng nét, Lớp Nếp đang lo liệu.",
  "Chầm chậm mà chắc, dữ liệu đang được dọn dẹp.",
  "Tính toán tỉ mỉ, tiền nong sắp sẵn sàng.",
  "Thầy cô dạy chữ, Lớp Nếp lo tiền.",
  "Việc dạy để thầy cô lo, việc sổ sách để Lớp Nếp tính.",
  "Con chữ thầy cô gieo, con số Lớp Nếp gặt.",
  "Nếp cũ gọn gàng, nếp mới sắp bày.",
  "Sổ sách vào nếp, học phí vào khuôn.",
  "Nếp đang được vo, chờ thầy cô một chút cho chín.",
  "Mọi thứ đang vào nếp, thầy cô chờ xíu nhé.",
  "Đang chấm nốt vài dòng, sắp vào lớp mới rồi.",
  "Điểm danh dữ liệu xong, mời thầy cô vào lớp.",
  "Chờ tí là 'tính' xong ngay thôi ạ.",
  "Sắp 'sổ' xong rồi, thầy cô chờ chút."
];

function randomMessageIndex(exceptIndex?: number) {
  if (loadingMessages.length <= 1) return 0;

  let nextIndex = Math.floor(Math.random() * loadingMessages.length);
  while (nextIndex === exceptIndex) {
    nextIndex = Math.floor(Math.random() * loadingMessages.length);
  }
  return nextIndex;
}

export default function AppLoading() {
  const [messageIndex, setMessageIndex] = useState(() => randomMessageIndex());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => randomMessageIndex(current));
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="route-loading" aria-live="polite" aria-busy="true">
      <div className="route-loading-panel">
        <div className="route-loading-illustration" aria-hidden="true">
          <Image
            src="/loading-companion.png"
            alt=""
            width={320}
            height={320}
            priority
          />
        </div>
        <div className="route-loading-copy">
          <p className="route-loading-kicker">Lớp Nếp đang chuẩn bị dữ liệu</p>
          <p className="route-loading-message" key={messageIndex}>
            {loadingMessages[messageIndex]}
          </p>
          <div className="route-loading-status">
            <span>Đang tải trang</span>
            <div className="route-loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
