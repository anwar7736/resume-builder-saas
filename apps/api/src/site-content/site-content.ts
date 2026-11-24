export type PlanContent = {
  id: "Free" | "Premium" | "Platinum";
  name: string;
  price: string;
  period: string;
  description: string;
  resumeLimit: number | null;
  features: string[];
};

export type SiteContent = {
  home: Record<string, unknown> & { steps: { title: string; description: string }[] };
  features: Record<string, unknown> & { items: { icon: string; title: string; description: string }[] };
  plans: PlanContent[];
  about: Record<string, string>;
  contact: Record<string, string>;
  footer: Record<string, string>;
  faqs: { question: string; answer: string }[];
  navigation: Record<string, string>;
  legal: {
    privacyTitle: string;
    privacyDescription: string;
    privacySections: { title: string; text: string }[];
    termsTitle: string;
    termsDescription: string;
    termsSections: { title: string; text: string }[];
  };
};

export const defaultSiteContent: SiteContent = {
  home: {
    eyebrow: "Your next chapter starts here",
    title: "Your experience deserves a great introduction.",
    description: "Share your career details and build a professional resume around your goals. Start with a free resume and choose the plan that fits your next step.",
    primaryButton: "Build Resume",
    secondaryButton: "Explore Plans",
    heroNote: "Create an account, pick your plan, and take the next step.",
    processTitle: "A clearer path to your next opportunity.",
    processDescription: "Share your experience, shape your resume, and get ready for what comes next.",
    processEyebrow: "How it works",
    plansEyebrow: "Simple plans",
    plansTitle: "A plan for your next step.",
    plansDescription: "Start free, then upgrade with secure monthly checkout when you need more room.",
    plansDisclaimer: "Paid plans last one month per successful payment. They do not renew automatically.",
    faqTitle: "Frequently asked questions.",
    ctaEyebrow: "Your experience deserves a great introduction",
    ctaTitle: "Ready to build your resume?",
    ctaDescription: "Create your free account and get started with your next opportunity.",
    steps: [
      { title: "Create your account", description: "Sign up to save your career profile and resume requests." },
      { title: "Add your experience", description: "Tell us about your work, education, skills, and goals." },
      { title: "Build your resume", description: "Submit your request and manage it from your account." },
    ],
  },
  features: {
    eyebrow: "Built around your next move",
    title: "Everything starts with your story.",
    description: "An easy place to collect the details that make your professional experience yours.",
    items: [
      { icon: "FileText", title: "Your career, organized", description: "Keep your experience, education, and skills together." },
      { icon: "Sparkles", title: "A confident next step", description: "Share the information needed for your resume request." },
      { icon: "ShieldCheck", title: "Your account", description: "Sign in to submit and track your resume requests." },
    ],
  },
  plans: [
    { id: "Free", name: "Free", price: "$0", period: " forever", description: "A simple place to begin.", resumeLimit: 1, features: ["1 resume request", "Career information form", "Account dashboard"] },
    { id: "Premium", name: "Premium", price: "৳500", period: " / month", description: "More room to shape your story.", resumeLimit: 5, features: ["Up to 5 resume requests", "Manage multiple applications", "Everything in Free"] },
    { id: "Platinum", name: "Platinum", price: "৳1,000", period: " / month", description: "More flexibility for every next step.", resumeLimit: null, features: ["Unlimited resume requests", "Everything in Premium", "Priority request handling"] },
  ],
  about: {
    eyebrow: "Our purpose",
    title: "Your experience is worth a clear introduction.",
    description: "We believe that creating a professional resume should feel accessible, thoughtful, and focused on what makes your story yours.",
    quote: "A resume is more than a list of roles. It’s the beginning of your next possibility.",
    storyEyebrow: "The idea behind ResumeCraft AI",
    storyTitle: "Make the process feel a little more human.",
    story: "Job seekers bring a wealth of skills and experience to every opportunity. ResumeCraft AI helps you gather and share your experience in one thoughtful place.",
  },
  contact: {
    eyebrow: "We’d love to hear from you",
    title: "Let’s start a conversation.",
    description: "Have a question or an idea? Send us a note and we’ll be in touch.",
    inquiriesTitle: "General inquiries",
    inquiriesText: "Use the support options or form on this page.",
    responseTitle: "Response times",
    responseText: "Our team will follow up as soon as possible.",
    locationTitle: "Where we are",
    locationText: "We’re here to help with your next step.",
    formTitle: "Send us a note",
    formDescription: "Have a question? Leave a message and we’ll be in touch.",
    formSubmit: "Submit message",
    formSuccess: "Thanks for preparing your message. The team will be in touch.",
    phone: "",
    whatsapp: "",
    facebook: "",
    messenger: "",
    email: "",
    supportAvatar: "/support-avatar.jpg",
  },
  footer: {
    description: "A thoughtful place to shape your professional story.",
    copyright: "© ResumeCraft AI. All rights reserved.",
    productTitle: "Product",
    companyTitle: "Company",
    resourcesTitle: "Resources",
  },
  navigation: {
    about: "About",
    plans: "Plans",
    account: "Sign in",
    build: "Build Resume",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
  },
  legal: {
    privacyTitle: "Privacy policy",
    privacyDescription: "This draft is provided for planning only. It is not legal advice and should be reviewed before publication.",
    privacySections: [
      { title: "Resume requests", text: "Resume request details are stored for the site operator to review and manage." },
      { title: "Storage and security", text: "Information is stored in the service database. Contact the site operator about your information." },
    ],
    termsTitle: "Terms of use",
    termsDescription: "These draft terms should be reviewed and updated before publication.",
    termsSections: [
      { title: "About the service", text: "The service lets registered users submit and track resume requests." },
      { title: "Plans", text: "Paid plans are active for one month per successful payment and do not renew automatically." },
    ],
  },
  faqs: [
    { question: "How do I build a resume?", answer: "Create an account, choose a plan, then submit your career information from the Build Resume page." },
    { question: "What is included in the Free plan?", answer: "The Free plan includes one resume request. You can see your current plan and requests from your account." },
    { question: "Can I upgrade my plan?", answer: "Choose Premium or Platinum on the Plans page and pay securely. Plans do not renew automatically." },
  ],
};

const isStringRecord = (value: unknown, requiredKeys: string[]) =>
  typeof value === "object" && value !== null &&
  requiredKeys.every((key) => key in value && typeof (value as Record<string, unknown>)[key] === "string");

function isPlanContent(value: unknown): value is PlanContent {
  if (typeof value !== "object" || value === null) return false;
  const plan = value as Record<string, unknown>;
  const limit = plan.resumeLimit;
  return isStringRecord(plan, ["name", "price", "period", "description"]) &&
    ["Free", "Premium", "Platinum"].includes(String(plan.id)) &&
    (limit === null || (typeof limit === "number" && Number.isSafeInteger(limit) && limit >= 0)) &&
    Array.isArray(plan.features) && plan.features.every((feature) => typeof feature === "string");
}

export function isSiteContent(value: unknown): value is SiteContent {
  if (typeof value !== "object" || value === null) return false;
  const content = value as Record<string, unknown>;
  const plans = content.plans;
  const contact = content.contact;
  return isStringRecord(content.home, [
    "eyebrow", "title", "description", "primaryButton", "secondaryButton", "heroNote",
    "processTitle", "processDescription", "processEyebrow", "plansEyebrow", "plansTitle",
    "plansDescription", "plansDisclaimer", "faqTitle", "ctaEyebrow", "ctaTitle", "ctaDescription",
  ]) &&
    Array.isArray((content.home as Record<string, unknown>).steps) &&
    isStringRecord(content.features, ["eyebrow", "title", "description"]) &&
    Array.isArray((content.features as Record<string, unknown>).items) &&
    Array.isArray(plans) && plans.length === 3 && plans.every(isPlanContent) &&
    new Set(plans.map((plan) => plan.id)).size === 3 &&
    isStringRecord(content.about, ["eyebrow", "title", "description", "quote", "storyEyebrow", "storyTitle", "story"]) &&
    isStringRecord(contact, [
      "eyebrow", "title", "description", "inquiriesTitle", "inquiriesText", "responseTitle",
      "responseText", "locationTitle", "locationText", "formTitle", "formDescription", "formSubmit",
      "formSuccess", "phone", "whatsapp", "facebook", "messenger", "email",
    ]) &&
    typeof (contact as Record<string, unknown>).supportAvatar === "string" &&
    isStringRecord(content.footer, ["description", "copyright", "productTitle", "companyTitle", "resourcesTitle"]) &&
    Array.isArray(content.faqs) &&
    isStringRecord(content.navigation, ["about", "plans", "account", "build", "contact", "privacy", "terms"]) &&
    isStringRecord(content.legal, ["privacyTitle", "privacyDescription", "termsTitle", "termsDescription"]) &&
    Array.isArray((content.legal as Record<string, unknown>).privacySections) &&
    Array.isArray((content.legal as Record<string, unknown>).termsSections);
}
