"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { faqs } from "@/lib/site-data";

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return <div className="faq-list">{faqs.map((faq, index) => <div className="faq-item" key={faq.question}>
    <button className="faq-question" type="button" aria-expanded={openIndex === index} onClick={() => setOpenIndex(openIndex === index ? null : index)}>
      {faq.question}<ChevronDown size={17} style={{ transform: openIndex === index ? "rotate(180deg)" : undefined, transition: "transform .2s", flex: "none" }} />
    </button>
    {openIndex === index && <div className="faq-answer">{faq.answer}</div>}
  </div>)}</div>;
}
