export function DetailSectionHeading({
  number,
  title,
  titleId,
}: {
  number: number;
  title: string;
  titleId?: string;
}) {
  return (
    <>
      <p className="eyebrow detail-section-number" aria-hidden="true">
        {String(number).padStart(2, "0")}
      </p>
      <h2 className="detail-section-title" id={titleId}>
        {title}
      </h2>
    </>
  );
}
