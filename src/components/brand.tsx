import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  href?: string;
  compact?: boolean;
};

export function Brand({ href = "/dashboard", compact = false }: BrandProps) {
  const content = (
    <>
      <Image
        src="/lop-nep-logo.png"
        alt=""
        width={compact ? 34 : 44}
        height={compact ? 34 : 44}
        className="shrink-0 object-contain"
        priority
      />
      <span className={compact ? "text-lg font-black" : "text-xl font-black"}>Lớp Nếp</span>
    </>
  );

  return href ? (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="Lớp Nếp">
      {content}
    </Link>
  ) : (
    <div className="inline-flex items-center gap-2">{content}</div>
  );
}
