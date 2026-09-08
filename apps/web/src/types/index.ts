export type Row = Record<string, any>;
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  dailyProspectTarget: number;
  dailyFollowUpTarget: number;
  dailyMeetingTarget: number;
};
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
];
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'HOT'];
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
];
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
];
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
];
export const label = (s: string) =>
  s
    ?.replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const money = (n: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
export const dateLabel = (s: string) =>
  s
    ? new Date(s).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '—';
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
