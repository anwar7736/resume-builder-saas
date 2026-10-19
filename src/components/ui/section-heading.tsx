type SectionHeadingProps = { eyebrow?: string; title: string; description?: string; centered?: boolean };

export function SectionHeading({ eyebrow, title, description, centered = false }: SectionHeadingProps) {
  return <div className={`section-heading${centered ? " text-center mx-auto" : ""}`}>
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <h2 className="heading">{title}</h2>
    {description && <p className="subheading">{description}</p>}
  </div>;
}
