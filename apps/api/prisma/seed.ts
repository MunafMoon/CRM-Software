import '../src/config.js';
import { db } from '../src/db.js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { saveProspect, saveRecord } from '../src/services/crm.js';
import { indiaDay } from '../src/services/reporting.js';
const env = z
  .object({
    SEED_ADMIN_EMAIL: z.string().email(),
    SEED_ADMIN_PASSWORD: z.string().min(12),
  })
  .parse(process.env);
async function main() {
  const user = await db.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
    update: {},
    create: {
      email: env.SEED_ADMIN_EMAIL.toLowerCase(),
      passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12),
      firstName: 'Alex',
      lastName: 'Morgan',
      role: 'ADMIN',
    },
  });
  if (process.argv.includes('--admin-only')) {
    console.log('Administrator is ready. Existing passwords are not changed.');
    return;
  }
  const businesses = [
    [
      'SmileCraft Dental',
      'Dental Clinic',
      'Dr. Riya Shah',
      'INTERESTED',
      'HIGH',
    ],
    ['FitLife Studio', 'Gym', 'Karan Mehta', 'PROPOSAL_SENT', 'HOT'],
    [
      'Oakwood Realty',
      'Real Estate',
      'Nirav Desai',
      'MEETING_SCHEDULED',
      'HIGH',
    ],
    ['The Bloom Salon', 'Salon', 'Pooja Patel', 'CONTACTED', 'MEDIUM'],
    ['BrightPath Academy', 'Coaching Institute', 'Amit Joshi', 'NEW', 'MEDIUM'],
    ['Pearl Dental Care', 'Dental Clinic', 'Dr. Neha Trivedi', 'WON', 'HIGH'],
    ['Iron House Fitness', 'Gym', 'Yash Shah', 'FOLLOW_UP', 'HIGH'],
    [
      'Urban Nest Properties',
      'Real Estate',
      'Mehul Amin',
      'NEGOTIATION',
      'HOT',
    ],
    ['Luxe Hair & Beauty', 'Salon', 'Priya Soni', 'REPLIED', 'MEDIUM'],
    [
      'Achievers Learning',
      'Coaching Institute',
      'Rohan Vyas',
      'RESEARCHED',
      'LOW',
    ],
    ['Green Leaf Kitchen', 'Restaurant', 'Anjali Rao', 'NEW', 'MEDIUM'],
    [
      'Sunrise Multispeciality',
      'Hospital',
      'Dr. Vivek Patel',
      'CONTACTED',
      'HIGH',
    ],
    ['Aarav Family Clinic', 'Doctor', 'Dr. Aarav Bhatt', 'FOLLOW_UP', 'MEDIUM'],
    [
      'Shree Precision Works',
      'Manufacturer',
      'Sanjay Panchal',
      'INTERESTED',
      'HIGH',
    ],
    ['The Artisan Cart', 'E-commerce', 'Dhruvi Shah', 'WON', 'HOT'],
    ['CityWalk Retail', 'Retail', 'Hitesh Parmar', 'LOST', 'LOW'],
    [
      'Vertex Tax Advisors',
      'Professional Services',
      'Chirag Patel',
      'PROPOSAL_SENT',
      'HIGH',
    ],
    ['Core Pilates Studio', 'Gym', 'Mansi Desai', 'NEW', 'MEDIUM'],
    [
      'Radiant Dental Studio',
      'Dental Clinic',
      'Dr. Aditi Shah',
      'CONTACTED',
      'MEDIUM',
    ],
    ['Flourish Coaching', 'Coaching Institute', 'Devang Dave', 'NEW', 'LOW'],
  ];
  for (let i = 0; i < businesses.length; i++) {
    const [businessName, businessCategory, contactPerson, status, priority] =
      businesses[i];
    const existing = await db.prospect.findUnique({
      where: { businessKey: `${businessName.toLowerCase()}|vadodara|india` },
    });
    if (existing) continue;
    const p = await saveProspect(
      {
        businessName,
        businessCategory,
        contactPerson,
        status,
        priority,
        email: `hello@demo-${i + 1}.example`,
        phone: `91900000${String(i + 1).padStart(4, '0')}`,
        website: `https://demo-${i + 1}.example`,
        city: 'Vadodara',
        state: 'Gujarat',
        country: 'India',
        source: ['Google Maps', 'Referral', 'Instagram', 'LinkedIn', 'Website'][
          i % 5
        ],
        estimatedValue: [45000, 85000, 120000, 35000, 65000][i % 5],
        notes: [
          'Looking for a fresh website and better local visibility.',
          'Discussed a growth plan for the next quarter.',
          'Potential fit for website development and SEO.',
        ][i % 3],
      },
      user.id,
    );
    await db.note.create({
      data: {
        prospectId: p.id,
        userId: user.id,
        content: `Demo prospect. ${contactPerson} is the primary contact. Research the business before the first outreach.`,
      },
    });
    if (i < 10) {
      const d = new Date(`${indiaDay()}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + (i < 3 ? 0 : i === 3 ? -2 : i - 3));
      await saveRecord(
        'followups',
        {
          prospectId: p.id,
          date: d.toISOString().slice(0, 10),
          time: ['09:30', '11:00', '14:30'][i % 3],
          type: ['CALL', 'WHATSAPP', 'EMAIL'][i % 3],
          notes: [
            'Discuss the website redesign proposal',
            'Check in on the marketing requirements',
            'Share the next steps and pricing',
          ][i % 3],
        },
        user.id,
      );
    }
    if ([0, 1, 2, 7, 13, 16].includes(i))
      await saveRecord(
        'deals',
        {
          prospectId: p.id,
          title: `${businessName} — ${i % 2 ? 'Growth package' : 'Website redesign'}`,
          serviceType: i % 2 ? 'SEO' : 'Website Development',
          value: Number(p.estimatedValue),
          status:
            i === 1 || i === 16
              ? 'PROPOSAL'
              : i === 7
                ? 'NEGOTIATION'
                : i === 2
                  ? 'MEETING'
                  : 'QUALIFIED',
          expectedCloseDate: new Date(Date.now() + 14 * 86400000)
            .toISOString()
            .slice(0, 10),
        },
        user.id,
      );
    if ([2, 7].includes(i))
      await saveRecord(
        'meetings',
        {
          prospectId: p.id,
          title: 'Discovery & project scope',
          meetingDate: indiaDay(),
          meetingTime: i === 2 ? '11:30' : '16:00',
          meetingType: 'PHONE',
          notes: 'Discuss goals, timeline, and budget.',
        },
        user.id,
      );
    if (!['NEW', 'RESEARCHED'].includes(status))
      await saveRecord(
        'outreach',
        {
          prospectId: p.id,
          channel: i % 2 ? 'EMAIL' : 'PHONE',
          message: 'Introduced our development and digital marketing services.',
          response: [
            'INTERESTED',
            'PROPOSAL_SENT',
            'WON',
            'NEGOTIATION',
            'REPLIED',
          ].includes(status)
            ? 'Interested in learning more. Please share details.'
            : '',
          positiveReply: [
            'INTERESTED',
            'PROPOSAL_SENT',
            'WON',
            'NEGOTIATION',
          ].includes(status),
          meetingGenerated: [2, 7].includes(i),
        },
        user.id,
      );
  }
  console.log(
    'Seed complete: administrator and 20 demo prospects. Demo contacts use reserved .example domains.',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
