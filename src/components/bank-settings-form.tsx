"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/actions";
import { VIETNAMESE_BANKS, generateVietQRUrl } from "@/lib/banks";

interface BankSettingsFormProps {
  teacher: {
    name: string;
    email: string;
    phone: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
  };
}

export function BankSettingsForm({ teacher }: BankSettingsFormProps) {
  const [bankCode, setBankCode] = useState(teacher.bankName || "");
  const [accountName, setAccountName] = useState(teacher.bankAccountName || "");
  const [accountNumber, setAccountNumber] = useState(teacher.bankAccountNumber || "");
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);

  const selectedBank = VIETNAMESE_BANKS.find(b => b.code === bankCode || b.name === bankCode || b.shortName === bankCode);

  const updateQRPreview = () => {
    if (selectedBank && accountNumber && accountName) {
      const url = generateVietQRUrl({
        bankCode: selectedBank.code,
        accountNumber,
        accountName,
      });
      setQrPreviewUrl(url);
    } else {
      setQrPreviewUrl(null);
    }
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setBankCode(value);
    setTimeout(updateQRPreview, 0);
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountNumber(e.target.value);
    setTimeout(updateQRPreview, 0);
  };

  const handleAccountNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountName(e.target.value);
    setTimeout(updateQRPreview, 0);
  };

  return (
    <section>
      <h2 className="mb-3 text-lg font-black">Thông tin chuyển khoản</h2>
      <div className="card p-4 grid gap-4">
        <div className="field">
          <label htmlFor="bankName">Ngân hàng</label>
          <select
            id="bankName"
            name="bankName"
            value={bankCode}
            onChange={handleBankChange}
          >
            <option value="">-- Chọn ngân hàng --</option>
            {VIETNAMESE_BANKS.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="bankAccountName">Chủ tài khoản</label>
          <input
            id="bankAccountName"
            name="bankAccountName"
            value={accountName}
            onChange={handleAccountNameChange}
            placeholder="Họ và tên chủ tài khoản"
          />
        </div>

        <div className="field">
          <label htmlFor="bankAccountNumber">Số tài khoản</label>
          <input
            id="bankAccountNumber"
            name="bankAccountNumber"
            value={accountNumber}
            onChange={handleAccountNumberChange}
            placeholder="Số tài khoản ngân hàng"
          />
        </div>

        {/* QR Preview */}
        {qrPreviewUrl && (
          <div className="mt-2 flex gap-4 items-center p-3 border border-dashed border-[var(--line)] rounded-lg">
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrPreviewUrl}
                alt="QR Code Preview"
                className="w-24 h-24 rounded-lg border border-[var(--line)]"
                onError={() => setQrPreviewUrl(null)}
              />
            </div>
            <div className="text-sm text-[var(--muted)]">
              <p className="font-bold">Xem trước QR</p>
              <p>QR sẽ được sinh tự động dựa trên thông tin ngân hàng.</p>
              {selectedBank && (
                <p className="mt-1">
                  <strong>{selectedBank.shortName}</strong> •••• {accountNumber.slice(-4)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
