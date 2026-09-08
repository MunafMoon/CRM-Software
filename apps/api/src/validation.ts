import { z } from 'zod';
export const statuses = [
  'NEW',
  'RESEARCHED',
  'CONTACTED',
  'FOLLOW_UP',
  'REPLIED',
  'INTERESTED',
  'MEETING_SCHEDULED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export const categories = [
  'Dental Clinic',
  'Gym',
  'Real Estate',
  'Restaurant',
  'Salon',
  'Hospital',
  'Doctor',
  'Coaching Institute',
  'Manufacturer',
  'E-commerce',
  'Retail',
  'Professional Services',
  'Other',
] as const;
export const sources = [
  'Google Maps',
  'LinkedIn',
  'Instagram',
  'Referral',
  'Website',
  'Cold Email',
  'Cold Call',
  'WhatsApp',
  'Other',
] as const;
export const services = [
  'Website Development',
  'Web Application',
  'E-commerce Development',
  'CRM Development',
  'SEO',
  'Google Ads',
  'Meta Ads',
  'Social Media',
  'Lead Generation',
  'Maintenance',
  'Automation',
  'Custom',
] as const;
const text = z.string().trim().max(5000);
const short = z.string().trim().max(250);
const money = z.coerce.number().finite().min(0).max(999999999999);
const url = z.union([
  z.literal(''),
  z
    .string()
    .url()
    .refine((v) => /^https?:\/\//i.test(v), 'Use an http or https URL'),
]);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    'Invalid date',
  )
  .transform((s) => new Date(s));
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const prospectSchema = z.object({
  businessName: short.min(1),
  contactPerson: short.default(''),
  email: z.union([z.literal(''), z.string().trim().email()]).nullish(),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => !v || /^\+?[\d\s()-]{7,25}$/.test(v), 'Invalid phone')
    .nullish(),
  whatsapp: short.default(''),
  website: url.nullish(),
  instagram: url.default(''),
  linkedin: url.default(''),
  businessCategory: z.enum(categories),
  city: short.min(1),
  state: short.default(''),
  country: short.min(1).default('India'),
  source: z.enum(sources),
  estimatedValue: money.default(0),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'HOT']).default('MEDIUM'),
  status: z.enum(statuses).default('NEW'),
  notes: text.default(''),
  assignedTo: z.string().uuid().optional(),
});
export const followupSchema = z.object({
  prospectId: z.string().uuid(),
  date,
  time,
  type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'LINKEDIN', 'MEETING', 'OTHER']),
  notes: text.default(''),
  status: z.enum(['PENDING', 'COMPLETED', 'MISSED']).default('PENDING'),
});
export const meetingSchema = z.object({
  prospectId: z.string().uuid(),
  title: short.min(1),
  meetingDate: date,
  meetingTime: time,
  meetingType: z.enum([
    'PHONE',
    'GOOGLE_MEET',
    'ZOOM',
    'OFFICE',
    'CLIENT_LOCATION',
  ]),
  meetingLink: url.default(''),
  location: short.default(''),
  notes: text.default(''),
  status: z
    .enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .default('SCHEDULED'),
});
export const dealSchema = z.object({
  prospectId: z.string().uuid(),
  title: short.min(1),
  serviceType: z.enum(services),
  value: money,
  status: z
    .enum(['QUALIFIED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'])
    .default('QUALIFIED'),
  expectedCloseDate: z
    .union([date, z.literal('').transform(() => null)])
    .nullish(),
});
export const outreachSchema = z
  .object({
    prospectId: z.string().uuid(),
    channel: z.enum(['EMAIL', 'WHATSAPP', 'LINKEDIN', 'PHONE', 'INSTAGRAM']),
    message: text.min(1),
    sentAt: z
      .string()
      .datetime()
      .transform((s) => new Date(s))
      .optional(),
    response: text.default(''),
    responseAt: z
      .string()
      .datetime()
      .transform((s) => new Date(s))
      .nullish(),
    positiveReply: z.boolean().default(false),
    meetingGenerated: z.boolean().default(false),
  })
  .refine(
    (v) => !v.positiveReply || !!v.response,
    'A positive reply requires response text',
  );
export function normalizeProspect(data: z.infer<typeof prospectSchema>) {
  return {
    ...data,
    email: data.email?.toLowerCase() || null,
    phone: data.phone?.replace(/\D/g, '') || null,
    website: data.website
      ? new URL(data.website).href.replace(/\/$/, '').toLowerCase()
      : null,
    businessKey: [data.businessName, data.city, data.country]
      .map((v) => v.trim().toLowerCase().replace(/\s+/g, ' '))
      .join('|'),
  };
}
