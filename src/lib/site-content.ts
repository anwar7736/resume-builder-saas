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
  home: {
    eyebrow: string;
    title: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
    heroNote: string;
    processTitle: string;
    processDescription: string;
    processEyebrow: string;
    plansEyebrow: string;
    plansTitle: string;
    plansDescription: string;
    plansDisclaimer: string;
    faqTitle: string;
    ctaEyebrow: string;
    ctaTitle: string;
    ctaDescription: string;
    steps: { title: string; description: string }[];
  };
  features: {
    eyebrow: string;
    title: string;
    description: string;
    items: { icon: string; title: string; description: string }[];
  };
  plans: PlanContent[];
  about: { eyebrow: string; title: string; description: string; quote: string; storyEyebrow: string; storyTitle: string; story: string };
  contact: {
    eyebrow: string; title: string; description: string; inquiriesTitle: string; inquiriesText: string;
    responseTitle: string; responseText: string; locationTitle: string; locationText: string;
    formTitle: string; formDescription: string; formSubmit: string; formSuccess: string;
    phone: string; whatsapp: string; facebook: string; messenger: string; email: string;
    supportAvatar: string;
  };
  footer: { description: string; copyright: string; productTitle: string; companyTitle: string; resourcesTitle: string };
  faqs: { question: string; answer: string }[];
  navigation: { about: string; plans: string; account: string; build: string; contact: string; privacy: string; terms: string };
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
    { id: "Free", name: "Free", price: "BDT 0", period: " forever", description: "A simple place to begin.", resumeLimit: 1, features: ["1 resume request", "Career information form", "Account dashboard"] },
    { id: "Premium", name: "Premium", price: "BDT 500", period: " / month", description: "More room to shape your story.", resumeLimit: 5, features: ["Up to 5 resume requests", "Manage multiple applications", "Everything in Free"] },
    { id: "Platinum", name: "Platinum", price: "BDT 1,000", period: " / month", description: "More flexibility for every next step.", resumeLimit: null, features: ["Unlimited resume requests", "Everything in Premium", "Priority request handling"] },
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
  navigation: { about: "About", plans: "Plans", account: "Sign in", build: "Build Resume", contact: "Contact", privacy: "Privacy", terms: "Terms" },
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

export function isSiteContent(value: unknown): value is SiteContent {
  if (typeof value !== "object" || value === null) return false;
  const content = value as Record<string, unknown>;
  const isText = (object: unknown, keys: string[]) =>
    typeof object === "object" && object !== null && keys.every((key) =>
      key in object && typeof (object as Record<string, unknown>)[key] === "string");
  const isPlan = (plan: unknown): plan is PlanContent =>
    isText(plan, ["name", "price", "period", "description"]) &&
    typeof plan === "object" && plan !== null &&
    "id" in plan && (plan.id === "Free" || plan.id === "Premium" || plan.id === "Platinum") &&
    "resumeLimit" in plan && (plan.resumeLimit === null ||
      (typeof plan.resumeLimit === "number" && Number.isSafeInteger(plan.resumeLimit) && plan.resumeLimit >= 0)) &&
    "features" in plan && Array.isArray(plan.features) &&
    plan.features.every((item: unknown) => typeof item === "string");
  const home = content.home as Record<string, unknown> | undefined;
  const features = content.features as Record<string, unknown> | undefined;
  const plans = content.plans;
  const about = content.about;
  const contact = content.contact;
  const footer = content.footer;
  const faqs = content.faqs;
  return     isText(home, ["eyebrow", "title", "description", "primaryButton", "secondaryButton", "heroNote", "processTitle", "processDescription", "processEyebrow", "plansEyebrow", "plansTitle", "plansDescription", "plansDisclaimer", "faqTitle", "ctaEyebrow", "ctaTitle", "ctaDescription"]) &&
    Array.isArray(home?.steps) && home.steps.every((item: unknown) => isText(item, ["title", "description"])) &&
    isText(features, ["eyebrow", "title", "description"]) &&
    Array.isArray(features?.items) && features.items.every((item: unknown) => isText(item, ["icon", "title", "description"])) &&
    Array.isArray(plans) && plans.length === 3 && plans.every(isPlan) &&
    new Set(plans.map((plan: PlanContent) => plan.id)).size === 3 &&
    isText(about, ["eyebrow", "title", "description", "quote", "storyEyebrow", "storyTitle", "story"]) &&
    isText(contact, ["eyebrow", "title", "description", "inquiriesTitle", "inquiriesText", "responseTitle", "responseText", "locationTitle", "locationText", "formTitle", "formDescription", "formSubmit", "formSuccess", "phone", "whatsapp", "facebook", "messenger", "email"]) &&
    (!("supportAvatar" in (contact as Record<string, unknown>)) ||
      (typeof (contact as Record<string, unknown>).supportAvatar === "string" &&
        ((contact as Record<string, unknown>).supportAvatar as string).length <= 1_398_127 &&
        (/^\/[a-zA-Z0-9_./?=&%-]*$/.test((contact as Record<string, unknown>).supportAvatar as string) ||
          /^https:\/\/[^ ]+$/i.test((contact as Record<string, unknown>).supportAvatar as string) ||
          /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/i.test((contact as Record<string, unknown>).supportAvatar as string)))) &&
    isText(footer, ["description", "copyright", "productTitle", "companyTitle", "resourcesTitle"]) &&
    Array.isArray(faqs) && faqs.every((item: unknown) => isText(item, ["question", "answer"])) &&
    isText(content.navigation, ["about", "plans", "account", "build", "contact", "privacy", "terms"]) &&
    isText(content.legal, ["privacyTitle", "privacyDescription", "termsTitle", "termsDescription"]) &&
    Array.isArray((content.legal as Record<string, unknown>).privacySections) &&
    ((content.legal as Record<string, unknown>).privacySections as unknown[]).every((item: unknown) => isText(item, ["title", "text"])) &&
    Array.isArray((content.legal as Record<string, unknown>).termsSections) &&
    ((content.legal as Record<string, unknown>).termsSections as unknown[]).every((item: unknown) => isText(item, ["title", "text"]));
}
