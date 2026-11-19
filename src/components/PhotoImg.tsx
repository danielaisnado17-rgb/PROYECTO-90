"use client";
import { useEffect, useState } from "react";
import { photoURL } from "@/lib/photos";
import { cx } from "./ui";

export function PhotoImg({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    photoURL(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className={cx("animate-pulse bg-sand", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={cx("object-cover", className)} />;
}

