import Image from "next/image";

import { cx } from "./ui";
import { APP_NAME } from "@/lib/constants";

/**
 * Logo aplikasi. Sumbernya satu berkas, `public/icon.png`, sehingga mengganti
 * logo cukup dengan menimpa berkas tersebut.
 */
export function BrandLogo({ size = 40, className, rounded = "rounded-xl" }) {
  return (
    <span
      className={cx(
        "relative grid shrink-0 place-items-center overflow-hidden bg-surface ring-1 ring-black/5",
        rounded,
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/icon.png"
        alt={`Logo ${process.env.NEXT_PUBLIC_ORG_NAME || APP_NAME}`}
        width={size * 2}
        height={size * 2}
        className="h-full w-full object-contain p-0.5"
        priority
      />
    </span>
  );
}
