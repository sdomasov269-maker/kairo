import Link from "next/link";

interface SectionHeadingProps {
  title: string;
  eyebrow?: string;
  action?: string;
  actionHref?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  action,
  actionHref,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action && actionHref && (
        <Link className="text-action" href={actionHref}>
          {action}
          <span aria-hidden="true">↗</span>
        </Link>
      )}
      {action && !actionHref && (
        <button className="text-action">
          {action}
          <span aria-hidden="true">↗</span>
        </button>
      )}
    </div>
  );
}
