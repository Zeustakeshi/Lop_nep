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
  "Sắp 'sổ' xong rồi, thầy cô chờ chút.",
  "Nếp đang vo, lo đang tính.",
  "Nồi nếp sôi, thầy cô ngồi chờ tí.",
  "Nếp đang hấp, dữ liệu đang gấp rút.",
  "Nếp chín tới, số liệu cũng vừa tới.",
  "Nếp đang dẻo, dữ liệu đang khéo.",
  "Vo tròn hạt nếp, xếp gọn con số.",
  "Nếp thơm nồi, trang mới sắp hiện rồi.",
  "Đảo đều tay nếp, xếp đều dữ liệu.",
  "Nếp đơm mâm, thầy cô chờ dăm giây.",
  "Ủ men nếp ngọt, chờ một chút chín tới.",
  "Nếp lên hơi, trang lên hình.",
  "Gói ghém nếp dẻo, gói trọn tiền học.",
  "Xới đều nếp trắng, tính đúng học phí.",
  "Nếp đang nở, dữ liệu đang mở.",
  "Nếp mềm tay, số liệu ngay ngắn.",
  "Hấp chín nồi nếp, hiện liền trang mới.",
  "Nếp thơm bếp nhỏ, số rõ từng tờ.",
  "Vần nếp cho nhuyễn, vén sổ cho gọn.",
  "Nếp đầy chõ, thông tin đầy đủ.",
  "Chờ nếp chín đều, chờ trang hiện đủ.",
  "Nếp ngon nhờ ủ, học phí rõ nhờ tính kỹ.",
  "Đơm nếp ra đĩa, đưa số ra bảng.",
  "Nếp dẻo mềm tay, số liệu ngay hàng.",
  "Giã nếp cho nhuyễn, xử lý cho nhanh.",
  "Nếp đang thơm nức, dữ liệu đang chốt.",
  "Một chõ nếp hấp, một trang web mở.",
  "Nếp trắng thơm nồi, học phí rõ mười mươi.",
  "Nếp căng tròn hạt, sổ sách rõ ràng.",
  "Chín đều hạt nếp, đủ đầy con số.",
  "Nếp lành hạt chắc, tính đúng từng đồng.",
  "Ủ nếp cho nồng, chốt sổ cho xong.",
  "Nếp vừa tới lửa, số vừa tới nơi.",
  "Xới nếp cho tơi, mở trang cho kịp.",
  "Nếp ngon nhờ lửa, trang mở nhờ chờ.",
  "Đầy chõ nếp thơm, đầy trang dữ liệu.",
  "Nếp chín từng hơi, trang lên từng phần.",
  "Vo nếp cho sạch, tính sổ cho minh.",
  "Nếp dẻo vừa ăn, số liệu vừa đúng.",
  "Nồi nếp đang nồng, tấm lòng đang gói.",
  "Nếp ngọt vừa lòng, học phí vừa khớp.",
  "Hấp nếp cho mềm, mở thềm cho thầy cô.",
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
