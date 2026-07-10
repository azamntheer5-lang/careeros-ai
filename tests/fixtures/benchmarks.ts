/**
 * Benchmark dataset for the AI Resume Studio evaluation.
 * Each fixture contains: raw input text + expected fields + metadata.
 */

export type BenchmarkFixture = {
  id: string
  label: string
  category: string
  rawText: string
  expectedFields: string[]
  expectedLanguage: 'en' | 'ar' | 'bilingual'
  description: string
}

export const BENCHMARK_FIXTURES: BenchmarkFixture[] = [

  // ─── 1. Cybersecurity Graduate (Bilingual WhatsApp Export) ───
  {
    id: 'cyber-grad-bilingual',
    label: 'Cybersecurity Graduate — Bilingual WhatsApp Export',
    category: 'cybersecurity',
    rawText: `DOC-20260623-WA0028.

Maria Msaad Al-Juhani

mariaaljuhani890@gmail.com

0504157855

Yanbu

CAREER OBJECTIVE

Seeking to work in a field that allows me to be creative, acquire new skills, and add achievements, while leveraging my knowledge in cybersecurity to protect systems and information in service of organizational goals.

EDUCATION

Diploma in Cybersecurity GPA 4.0/5.0 Taibah University, Applied College - 2026

EXPERIENCE

Field Training & Professional Certifications

Field training in cybersecurity with hands-on project execution.
Completed Cisco Networking Academy certifications.
Applied network protection fundamentals and cyber defense techniques.
Acquired JavaScript programming skills and applied them to security projects.

COURSES

JavaScript Essentials 1 - Cisco Networking Academy | 40 hrs | 23 Apr 2025
JavaScript Essentials 2 - Cisco Networking Academy | 50 hrs | 02 May 2025
Introduction to Cybersecurity - Cisco Networking Academy | 6 hrs | 24 Apr 2025
Network Defense - Cisco Networking Academy | 27 hrs | 05 May 2025

SKILLS

Ability to work under pressure.
Accuracy and precision in task execution.
Innovation, creativity, and speed of delivery.
Technical knowledge in cybersecurity and network protection.
Time management and task prioritization.

LANGUAGES

Arabic: Native.
English: Intermediate.`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'experience', 'education', 'skills.technical', 'skills.languages', 'courses'],
    expectedLanguage: 'en',
    description: 'WhatsApp document export with bilingual background. Tests OCR cleanup, course extraction, skill categorization.',
  },

  // ─── 2. Fresh Graduate (English, Short) ───
  {
    id: 'fresh-grad-short',
    label: 'Fresh Graduate — Short Text (50 words)',
    category: 'fresh-graduate',
    rawText: `John Smith
john.smith@email.com
555-1234
New York
Recent computer science graduate from NYU. Did an internship at Google working on React frontend. Know JavaScript, Python, React, Node.js. Looking for a junior developer position.`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'education', 'skills.technical'],
    expectedLanguage: 'en',
    description: 'Very short input (50 words). Tests enrichment of limited information without hallucination.',
  },

  // ─── 3. Senior Software Engineer (LinkedIn Copy) ───
  {
    id: 'senior-swe-linkedin',
    label: 'Senior Software Engineer — LinkedIn Copy',
    category: 'software-engineering',
    rawText: `Ahmed Hassan
Senior Software Engineer at Careeros
ahmed.hassan@gmail.com | +966 55 123 4567 | Riyadh, Saudi Arabia
linkedin.com/in/ahmedhassan

About
Senior software engineer with 8+ years building scalable web applications. Specialized in React, TypeScript, Node.js, and cloud architecture. Led teams of 5-10 engineers.

Experience
Senior Software Engineer | Careeros | 2021 - Present
- Led migration from monolith to microservices, reducing deployment time by 60%
- Mentored 8 junior engineers on React best practices
- Built design system used by 40+ developers across 6 products

Software Engineer | STC | 2017 - 2021
- Developed real-time analytics dashboard handling 2M+ daily events
- Reduced API response time by 45% through query optimization
- Led adoption of TypeScript across the engineering org

Education
B.S. Computer Science | King Saud University | 2013 - 2017
GPA: 4.7/5.0

Skills
React, TypeScript, Node.js, GraphQL, PostgreSQL, AWS, Docker, Kubernetes, System Design, Team Leadership, Agile`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'contact.linkedin', 'objective', 'experience', 'education', 'skills.technical', 'skills.soft'],
    expectedLanguage: 'en',
    description: 'LinkedIn profile copy. Tests structured extraction, bullet point parsing, measurable achievement detection.',
  },

  // ─── 4. Arabic-Only Resume (HR Professional) ───
  {
    id: 'ar-hr-professional',
    label: 'HR Professional — Arabic Only',
    category: 'hr',
    rawText: `فاطمة علي الزهراني
مديرة موارد بشرية
fatima.zhrani@email.com
0551234567
جدة، المملكة العربية السعودية

الهدف الوظيفي
إدارة بشرية محترفة مع خبرة 10 سنوات في إدارة الموارد البشرية والتوظيف وتطوير الموظفين. أسعى لقيادة قسم الموارد البشرية في مؤسسة رائدة.

الخبرات
مديرة موارد بشرية | شركة الأمل | 2018 - حتى الآن
- تطوير استراتيجية الموارد البشرية التي أدت إلى تقليل معدل دوران الموظفين بنسبة 35%
- إدارة فريق من 12 موظف
- تنفيذ نظام تقييم الأداء الجديد

أخصائية توظيف | مجموعة الراجحي | 2014 - 2018
- توظيف أكثر من 200 موظف
- تحسين عملية التوظيف وتقليل وقت التوظيف بنسبة 40%

التعليم
بكالوريوس إدارة أعمال | جامعة الملك عبدالعزيز | 2010 - 2014

المهارات
إدارة الموارد البشرية، التوظيف، تقييم الأداء، قانون العمل، السكرتارية، إدارة الوقت، القيادة`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'experience', 'education', 'skills.technical'],
    expectedLanguage: 'ar',
    description: 'Arabic-only HR resume. Tests Arabic parsing, RTL content handling, profession detection.',
  },

  // ─── 5. Messy OCR (Broken Lines, Random Formatting) ───
  {
    id: 'messy-ocr',
    label: 'Messy OCR — Broken Lines',
    category: 'ocr',
    rawText: `Robert|Chen
rob chen at
gmail dot com
415-555
-0199
San Fran
cisco CA

Objective
Soft
ware eng
ineer with passion
for building scalable
systems

Work
Google
2020 to now
- Built search infra
- Led team of 6
- Reduced latency 40%

Apple
2017 to 2020
- iOS development
- Shipped 3 features

Education
BS Computer Science
UC Berkeley
2013-2017

Skills
Python Java Go React Kubernetes AWS Docker`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'experience', 'education', 'skills.technical'],
    expectedLanguage: 'en',
    description: 'Severely broken OCR text with fragmented words. Tests OCR cleanup, line fixing, email reconstruction.',
  },

  // ─── 6. Student (Very Short, 10 words) ───
  {
    id: 'student-10-words',
    label: 'Student — Ultra Short (10 words)',
    category: 'student',
    rawText: `Sara Al-Qahtani, CS student at KSU, know Python and Java.`,
    expectedFields: ['contact.name', 'education', 'skills.technical'],
    expectedLanguage: 'en',
    description: 'Ultra-short 10-word input. Tests enrichment without hallucination — pipeline must ask for missing info.',
  },

  // ─── 7. Marketing Manager (English, Detailed) ───
  {
    id: 'marketing-manager',
    label: 'Marketing Manager — Detailed',
    category: 'marketing',
    rawText: `David Okafor
Marketing Manager
david.okafor@marketing.com | +1 (415) 555-9876 | San Francisco, CA

Professional Summary
Data-driven marketing manager with 6+ years experience in B2B SaaS marketing. Proven track record of driving 300% revenue growth through integrated campaigns. Expert in marketing automation, SEO/SEM, and content strategy.

Experience
Marketing Manager | SaaS Corp | 2020 - Present
- Launched 15+ integrated campaigns generating $2M+ in pipeline
- Grew organic traffic by 250% through SEO strategy
- Managed $500K annual marketing budget
- Built and led team of 4 marketing specialists

Marketing Specialist | TechStart | 2018 - 2020
- Executed email campaigns with 45% open rate (industry avg: 20%)
- Created content calendar producing 4 blog posts/week
- Managed social media presence across 5 platforms

Education
MBA | Stanford University | 2016 - 2018
BA Communications | UCLA | 2012 - 2016

Skills
Marketing Automation (HubSpot, Marketo), SEO/SEM, Google Analytics, Content Strategy, Email Marketing, Social Media Marketing, Budget Management, Team Leadership, A/B Testing, SQL`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'experience', 'education', 'skills.technical', 'skills.soft'],
    expectedLanguage: 'en',
    description: 'Detailed marketing resume with measurable achievements. Tests profession-specific wording and metric detection.',
  },

  // ─── 8. Nurse (Healthcare) ───
  {
    id: 'nurse-healthcare',
    label: 'Registered Nurse — Healthcare',
    category: 'healthcare',
    rawText: `Noura Al-Saud, RN
Registered Nurse
noura.nurse@hospital.sa | 0501234567 | Riyadh

Objective
Compassionate registered nurse with 5 years experience in critical care. Seeking to leverage clinical expertise in a prestigious hospital setting.

Experience
ICU Nurse | King Faisal Hospital | 2019 - Present
- Managed care for 4-6 critically ill patients per shift
- Reduced medication errors by 50% through protocol implementation
- Trained 12 new nursing staff on ICU procedures
- Maintained 98% patient satisfaction scores

Staff Nurse | Al-Habib Hospital | 2018 - 2019
- Provided direct patient care in medical-surgical unit
- Assisted in 200+ surgical procedures

Education
Bachelor of Nursing | King Saud University | 2014 - 2018
Licensed by Saudi Commission for Health Specialties

Certifications
BLS, ACLS, PALS

Skills
Critical Care, Patient Assessment, IV Therapy, Wound Care, EHR Systems, Patient Education, Infection Control`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'experience', 'education', 'skills.technical', 'certifications'],
    expectedLanguage: 'en',
    description: 'Healthcare professional resume. Tests profession-specific terminology, certification extraction.',
  },

  // ─── 9. Mixed Bilingual (Arabic + English interleaved) ───
  {
    id: 'mixed-bilingual',
    label: 'Mixed Bilingual — Arabic + English Interleaved',
    category: 'bilingual',
    rawText: `Khalid Al-Ghamdi / خالد الغامدي
khalid@email.com | 0559876543 | Riyadh / الرياض

Objective / الهدف
Experienced project manager seeking new challenges. مدير مشاريع ذو خبرة يبحث عن تحديات جديدة.

Experience / الخبرات
Project Manager | ARAMCO | 2018 - Present
- Managed $50M construction projects
- أدار مشاريع إنشائية بقيمة 50 مليون دولار
- Led cross-functional teams of 25+ members

Education / التعليم
MBA | MIT | 2016 - 2018
ماجستير إدارة الأعمال | معهد ماساتشوستس | 2016 - 2018

Skills / المهارات
Project Management, Agile, Scrum, Budget Management
إدارة المشاريع، أجايل، سكرام، إدارة الميزانية`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'experience', 'education', 'skills.technical'],
    expectedLanguage: 'bilingual',
    description: 'Interleaved bilingual text. Tests deduplication, bilingual consistency, translation quality.',
  },

  // ─── 10. Accounting Professional ───
  {
    id: 'accounting-professional',
    label: 'Accounting Professional',
    category: 'accounting',
    rawText: `Mohammed Al-Rashid
Senior Accountant
m.rashid@finance.com | +966 50 111 2222 | Dammam

Summary
CPA-licensed senior accountant with 7 years experience in corporate accounting, financial reporting, and audit preparation. Reduced month-end close from 10 to 5 days.

Experience
Senior Accountant | SABIC | 2019 - Present
- Managed month-end close for $500M revenue division
- Implemented automated reconciliation saving 120 hours/month
- Led audit preparation for Big 4 firm
- Supervised team of 4 accountants

Accountant | Saudi Telecom | 2016 - 2019
- Prepared financial statements in compliance with IFRS
- Reconciled 200+ accounts monthly
- Assisted in annual budget preparation of $10M

Education
Bachelor of Accounting | King Fahd University | 2012 - 2016
CPA License | 2018

Skills
IFRS, Financial Reporting, Audit, Reconciliation, SAP, Excel, Oracle Financials, Tax Compliance, Budget Management`,
    expectedFields: ['contact.name', 'contact.email', 'contact.phone', 'contact.location', 'objective', 'experience', 'education', 'skills.technical', 'certifications'],
    expectedLanguage: 'en',
    description: 'Accounting professional with CPA. Tests profession-specific skills extraction and measurable metrics.',
  },
]
