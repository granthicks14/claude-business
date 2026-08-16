import type { Capability } from "../types";

/**
 * Skill → capability mapping.
 *
 * Founders write skills in their own words ("I'm decent with a camera"). These
 * aliases turn that free text into the capability ids that business models
 * declare as requirements, so matching is based on what someone can actually do
 * rather than on exact wording.
 */
export const CAPABILITIES: Capability[] = [
  { id: "writing", label: "Writing", aliases: ["writing", "write", "copywriting", "blogging", "editing text", "journalism", "storytelling", "essays", "content writing"] },
  { id: "video", label: "Video", aliases: ["video", "filming", "videography", "video editing", "premiere", "final cut", "capcut", "youtube", "reels", "tiktok", "shorts"] },
  { id: "photo", label: "Photography", aliases: ["photo", "photography", "camera", "lightroom", "photoshop", "portraits", "product photography"] },
  { id: "design", label: "Design", aliases: ["design", "graphic design", "figma", "canva", "illustration", "branding", "logos", "ui", "ux", "art"] },
  { id: "code", label: "Coding", aliases: ["coding", "code", "programming", "developer", "software", "python", "javascript", "web development", "app development", "automation", "scripts", "sql", "no-code", "nocode"] },
  { id: "data", label: "Data & spreadsheets", aliases: ["spreadsheets", "excel", "data", "analytics", "bookkeeping", "accounting", "numbers", "reporting", "google sheets", "finance"] },
  { id: "social", label: "Social media", aliases: ["social media", "instagram", "tiktok", "twitter", "facebook", "community management", "posting", "content"] },
  { id: "sales", label: "Sales", aliases: ["sales", "selling", "negotiation", "closing", "business development", "retail", "cold calling", "customer service", "support"] },
  { id: "teaching", label: "Teaching", aliases: ["teaching", "tutoring", "coaching", "training", "instructing", "mentoring", "explaining", "lecturer", "education"] },
  { id: "organising", label: "Organising", aliases: ["organising", "organizing", "planning", "project management", "admin", "scheduling", "logistics", "operations", "coordination", "events"] },
  { id: "hands-on", label: "Hands-on work", aliases: ["repair", "fixing", "building", "carpentry", "diy", "handyman", "mechanic", "plumbing", "electrical", "maintenance", "installation", "cleaning", "detailing", "landscaping", "painting"] },
  { id: "driving", label: "Driving", aliases: ["driving", "delivery", "transport", "hauling", "moving", "truck", "van"] },
  { id: "cooking", label: "Cooking", aliases: ["cooking", "baking", "chef", "food prep", "catering", "recipes", "nutrition"] },
  { id: "crafting", label: "Making things", aliases: ["crafting", "sewing", "knitting", "woodworking", "3d printing", "jewellery", "jewelry", "pottery", "making", "prints"] },
  { id: "fitness", label: "Fitness & coaching", aliases: ["fitness", "personal training", "gym", "sports coaching", "yoga", "athletics", "strength"] },
  { id: "care", label: "Care & people work", aliases: ["childcare", "babysitting", "pet care", "dog walking", "elderly care", "nursing", "caregiving", "hospitality"] },
  { id: "audio", label: "Audio", aliases: ["audio", "music", "podcast", "recording", "mixing", "producing", "sound", "voice"] },
  { id: "research", label: "Research", aliases: ["research", "analysis", "investigating", "due diligence", "market research", "reading"] },
  { id: "language", label: "Languages", aliases: ["translation", "bilingual", "spanish", "french", "mandarin", "german", "language", "interpreting"] },
  { id: "ai-tools", label: "AI tools", aliases: ["ai", "chatgpt", "claude", "prompting", "midjourney", "llm", "automation tools", "zapier", "make.com"] },
];

const ALIAS_INDEX: { needle: string; id: string }[] = CAPABILITIES.flatMap((c) =>
  c.aliases.map((a) => ({ needle: a, id: c.id })),
).sort((a, b) => b.needle.length - a.needle.length);

/** Extracts capability ids from free-text skills, experience and hobbies. */
export function detectCapabilities(...texts: (string | string[] | undefined)[]): Set<string> {
  const hay = texts
    .flatMap((t) => (Array.isArray(t) ? t : [t ?? ""]))
    .join(" ")
    .toLowerCase();

  const found = new Set<string>();
  for (const { needle, id } of ALIAS_INDEX) {
    if (hay.includes(needle)) found.add(id);
  }
  return found;
}

export function capabilityLabel(id: string): string {
  return CAPABILITIES.find((c) => c.id === id)?.label ?? id;
}

/** Equipment strings the founder listed, normalised to capability-ish tokens. */
export const EQUIPMENT_ALIASES: Record<string, string[]> = {
  computer: ["laptop", "computer", "pc", "macbook", "desktop"],
  phone: ["phone", "smartphone", "iphone", "android"],
  camera: ["camera", "dslr", "mirrorless", "gopro", "drone"],
  mic: ["microphone", "mic", "audio interface", "podcast"],
  vehicle: ["car", "truck", "van", "vehicle", "bike", "motorcycle", "trailer"],
  tools: ["tools", "toolkit", "power tools", "ladder", "pressure washer", "mower", "sewing machine", "3d printer", "printer"],
  kitchen: ["kitchen", "oven", "grill", "smoker", "kitchen equipment"],
  gym: ["gym", "weights", "equipment", "bike", "treadmill"],
};

export function detectEquipment(items: string[]): Set<string> {
  const hay = items.join(" ").toLowerCase();
  const found = new Set<string>();
  for (const [key, aliases] of Object.entries(EQUIPMENT_ALIASES)) {
    if (aliases.some((a) => hay.includes(a))) found.add(key);
  }
  return found;
}
