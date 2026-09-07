# Lớp Nếp

Ung dung Next.js giup giao vien day them quan ly lop hoc, hoc sinh, lich day, buoi hoc, hoc phi, bao cao phu huynh va thanh toan.

## Cong nghe

### hello

- Next.js App Router
- Clerk authentication
- Supabase Postgres
- Prisma ORM
- Tailwind CSS

## Chay local

1. Cai dependencies:

```bash
npm install
```

2. Tao file `.env.local` tu `.env.example`, sau do dien Clerk keys va Supabase database URLs:

```bash
cp .env.example .env.local
```

3. Tao schema database tren Supabase:

```bash
npx prisma migrate dev --name init
```

4. Chay app Next.js:

```bash
npm run dev
```

App mac dinh o `http://localhost:3000`.

## Module da scaffold

- Dang nhap/dang ky bang Clerk.
- Dashboard tong quan.
- Quan ly lop hoc, hoc sinh va phu huynh.
- Lich hoc co dinh, sinh buoi hoc theo thang.
- Ghi nhan buoi hoc, noi dung, bai tap, tinh phi.
- Tao bao cao hoc phi theo thang.
- Link bao cao public cho phu huynh bang token rieng.
- In bao cao ra PDF bang chuc nang print cua trinh duyet.
- Ghi nhan thanh toan va theo doi con lai.
- Cai dat thong tin giao vien va chuyen khoan.
