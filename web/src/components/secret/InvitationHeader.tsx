import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "@/app/rizz/rizz.module.css";

export default function InvitationHeader({ name }: { name?: string }) {
  return (
    <header className={styles.topline}>
      <Link href="/" className={styles.homeLink} aria-label="MDCran portfolio home">
        <span className={styles.brand}>MD<span>Cran</span></span>
        <span className={styles.returnLink}><ArrowLeft size={12} /> Portfolio</span>
      </Link>
      <span>{name?.trim() ? `For ${name.trim()}` : "An invitation"}</span>
    </header>
  );
}
