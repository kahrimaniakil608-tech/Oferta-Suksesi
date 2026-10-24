export const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "Publikuar", PENDING_REVIEW: "Në shqyrtim", REJECTED: "Refuzuar",
  EXPIRED: "Skaduar", DRAFT: "Draft", ARCHIVED: "Arkivuar", DELETED: "Fshirë",
  OPEN: "Hapur", IN_REVIEW: "Në shqyrtim", RESOLVED: "Zgjidhur", DISMISSED: "Mbyllur pa veprim",
  ADMIN: "Administrator", MODERATOR: "Moderator", USER: "Përdorues", COMPANY: "Kompani",
};
export function statusLabel(value: string) { return STATUS_LABEL[value] ?? value; }
