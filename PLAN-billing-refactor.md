# Kế hoạch Refactor Hệ thống Billing - Mentor Money

## Context

Người dùng muốn thay đổi toàn bộ cơ chế tính tiền của ứng dụng Mentor Money. Hệ thống hiện tại có nhiều loại `TuitionType` phức tạp (PER_SESSION, FIXED_MONTHLY, ACTUAL_SESSIONS, GROUP_BY_STUDENT, PREPAID_PACKAGE, MANUAL). Cần đơn giản hóa thành 3 chế độ rõ ràng.

**Mô hình tính tiền mới:**

| Chế độ | Mô tả | Trạng thái |
|--------|--------|-------------|
| **THEO_BUOI** | Tính tiền từng buổi, giáo viên tùy chỉnh được giá từng buổi | Mới |
| **THEO_THANG** | Tiền cố định theo tháng, thêm buổi không đổi tiền | Mới |
| **THEO_GOI** | Tính tiền theo gói buổi | Coming Soon |

---

## Phạm vi thay đổi

### 1. Database Schema (Prisma)

**File:** `prisma/schema.prisma`

#### Thay đổi Enum `TuitionType`:
```prisma
enum TuitionType {
  THEO_BUOI      // Tính tiền theo buổi - giáo viên tùy chỉnh từng buổi
  THEO_THANG     // Tiền cố định tháng - thêm buổi không đổi tiền
  THEO_GOI       // Coming soon - theo gói buổi
}
```

#### Thay đổi Model `TuitionConfig`:
```prisma
model TuitionConfig {
  // ... existing fields
  type              TuitionType   @default(THEO_BUOI)
  feePerLesson      Decimal?      // Áp dụng cho THEO_BUOI: giá mặc định mỗi buổi
  fixedMonthlyFee   Decimal?      // Áp dụng cho THEO_THANG: tiền cố định tháng
  packageLessons    Int?          // Áp dụng cho THEO_GOI: số buổi trong gói
  packagePrice      Decimal?     // Áp dụng cho THEO_GOI: giá gói
  // ... existing fields
}
```

#### Thay đổi Model `LessonSession`:
```prisma
model LessonSession {
  // ... existing fields
  customFee         Decimal?      // Override giá buổi (THEO_BUOI only)
  // ... existing fields
}
```

---

### 2. Core Logic (tuition.ts)

**File:** `src/lib/tuition.ts`

#### 2.1. Cập nhật `defaultBillableAmount()`:
```typescript
function defaultBillableAmount(status, tuition, lesson): Decimal {
  switch (tuition.type) {
    case 'THEO_BUOI':
      // Giá mặc định từ config, có thể override từng buổi
      return tuition.feePerLesson || 0

    case 'THEO_THANG':
      // Không tính tự động theo buổi - tiền cố định theo tháng
      return 0

    case 'THEO_GOI':
      // Chưa implement
      return 0

    default:
      return 0
  }
}
```

#### 2.2. Cập nhật `calculateReportTotals()`:
```typescript
function calculateReportTotals(lessons, tuition, discountAmount, surchargeAmount) {
  switch (tuition.type) {
    case 'THEO_BUOI':
      // Tổng = sum(customFee hoặc feePerLesson cho các buổi đã học)
      return lessons
        .filter(l => isLearnedLessonStatus(l.status))
        .reduce((sum, l) => sum + (l.customFee || tuition.feePerLesson), 0)

    case 'THEO_THANG':
      // Tiền cố định theo tháng - không tính theo buổi
      return tuition.fixedMonthlyFee || 0

    case 'THEO_GOI':
      // Coming soon
      return 0

    default:
      return 0
  }
}
```

#### 2.3. Thêm helper functions mới:
```typescript
// Kiểm tra chế độ có cho phép tùy chỉnh giá từng buổi
canCustomizePerLesson(tuitionType): boolean {
  return tuitionType === 'THEO_BUOI'
}

// Lấy giá buổi học (có override hay không)
getLessonFee(tuition, lesson): Decimal {
  if (lesson.customFee !== null) return lesson.customFee
  return tuition.feePerLesson
}
```

---

### 3. Server Actions (actions.ts)

**File:** `src/lib/actions.ts`

#### 3.1. Cập nhật `updateTuitionConfig()`:
- Validate input theo từng loại TuitionType
- THEO_BUOI: yêu cầu feePerLesson
- THEO_THANG: yêu cầu fixedMonthlyFee
- THEO_GOI: yêu cầu packageLessons và packagePrice

#### 3.2. Cập nhật `createReport()`:
- Tính toán totalAmount theo logic mới
- Validation khác nhau cho từng loại

#### 3.3. Thêm `updateLessonCustomFee()`:
- Update customFee cho buổi học cụ thể
- Chỉ áp dụng cho THEO_BUOI

---

### 4. UI Components

#### 4.1. TuitionConfigForm (`src/components/tuition-config-form.tsx`)
- Thay đổi dropdown chọn loại tính tiền
- Hiển thị form fields phù hợp theo từng loại:
  - THEO_BUOI: Input giá mặc định mỗi buổi
  - THEO_THANG: Input tiền cố định tháng
  - THEO_GOI: Input số buổi + giá gói (disabled - coming soon)

#### 4.2. LessonForm (`src/components/lesson-form.tsx`)
- Chỉ hiển thị trường `customFee` khi TuitionType = THEO_BUOI
- Hidden/disabled trường này với các loại khác

#### 4.3. ReportDetail (`src/app/(app)/reports/[id]/page.tsx`)
- Hiển thị tổng tiền theo logic mới
- Với THEO_THANG: hiển thị số tiền cố định thay vì list buổi

---

### 5. Database Migration

```bash
# Tạo migration mới
npx prisma migrate dev --name refactor_billing_to_three_modes
```

Migration script:
1. Update enum `TuitionType` values
2. Rename columns (nếu cần)
3. Add new columns (customFee, fixedMonthlyFee)
4. Migrate existing data sang format mới

---

## Files cần tạo mới

1. `prisma/migrations/xxx_refactor_billing_to_three_modes/` - Migration files

## Files cần sửa

| File | Thay đổi |
|------|-----------|
| `prisma/schema.prisma` | Enum TuitionType, TuitionConfig, LessonSession |
| `src/lib/tuition.ts` | Core billing logic |
| `src/lib/actions.ts` | Server actions |
| `src/components/tuition-config-form.tsx` | UI form |
| `src/components/lesson-form.tsx` | Custom fee input |
| `src/app/(app)/reports/[id]/page.tsx` | Display logic |
| `src/app/report/[token]/page.tsx` | Public report |

---

## Verification

1. **Unit tests**: Test các hàm tính tiền với từng TuitionType
2. **Manual testing**:
   - Tạo lớp với từng loại TuitionType
   - Thêm buổi học, kiểm tra tính tiền
   - Tạo report, verify tổng tiền
   - Test override giá buổi (THEO_BUOI)
3. **Data integrity**: Đảm bảo existing data được migrate đúng

---

## Quyết định đã xác nhận

1. **Migration data**: **Reset data billing** - xóa hết data cũ, bắt đầu lại
2. **THEO_GOI**: **Chỉ UI placeholder** - hiển thị "Coming soon", không có logic
3. **Tháng hiện tại**: **Tính lại tất cả từ đầu** - khi đổi config sẽ recalculate

---

## Migration Strategy

```sql
-- Migration steps:
1. Backup existing data (optional - vì sẽ reset)
2. Drop billing-related columns
3. Recreate with new schema
4. Add UI placeholder for THEO_GOI
```

---

## Thứ tự thực hiện

1. **Database Migration** - Recreate schema với enum mới (reset data)
2. **Core Logic** - Cập nhật tuition.ts
3. **Server Actions** - Cập nhật actions.ts  
4. **UI Components** - Cập nhật TuitionConfigForm, LessonForm
5. **UI Placeholder** - Thêm "Coming soon" cho THEO_GOI
6. **Pages** - Cập nhật reports pages
7. **Testing** - Manual verification

---

## Branch name (theo sp-gitteam)

```
feature/billing-refactor-three-modes
```
