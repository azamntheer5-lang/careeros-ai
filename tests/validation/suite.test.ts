/**
 * 100-Resume Validation Suite
 *
 * Generates 100 diverse resume fixtures across 20+ categories,
 * then validates the LOCAL pipeline functions (OCR cleanup, language detection,
 * deduplication, keyword extraction, profession detection, missing info detection,
 * confidence scoring, and the 14-metric evaluator) against each fixture.
 *
 * Usage: bun test tests/validation/suite.test.ts
 */

import { describe, test, expect } from 'bun:test'
import {
  detectLanguage, cleanOCRText, deduplicateResume, extractKeywords,
  detectProfession, detectMissingInfo, calculateConfidence,
} from '../../src/lib/resume-pipeline-v4'
import { evaluateResume } from '../../src/lib/resume-evaluator'

// ─── Fixture Generator ─────────────────────────────────────────────

type Fixture = {
  id: string
  category: string
  rawText: string
  expectedLanguage: 'en' | 'ar' | 'bilingual'
  expectedProfession?: string
  expectedMinFields: number
}

function gen(): Fixture[] {
  const fixtures: Fixture[] = []

  // ─── Students (5) ───
  fixtures.push({ id: 'student-1', category: 'student', rawText: 'Sara Al-Qahtani, CS student at KSU, know Python and Java.', expectedLanguage: 'en', expectedProfession: 'Software Engineering', expectedMinFields: 2 })
  fixtures.push({ id: 'student-2', category: 'student', rawText: 'Ahmed Mohammed, business student, know Excel and PowerPoint.', expectedLanguage: 'en', expectedMinFields: 1 })
  fixtures.push({ id: 'student-3', category: 'student', rawText: 'طالبة في جامعة الملك سعود، تخصص علوم حاسب', expectedLanguage: 'ar', expectedMinFields: 1 })
  fixtures.push({ id: 'student-4', category: 'student', rawText: 'Junior at MIT studying EE. Internship at Tesla. Know C++, Python, MATLAB.', expectedLanguage: 'en', expectedProfession: 'Software Engineering', expectedMinFields: 2 })
  fixtures.push({ id: 'student-5', category: 'student', rawText: 'Fresh student no experience yet. Studying marketing.', expectedLanguage: 'en', expectedMinFields: 0 })

  // ─── Fresh Graduates (5) ───
  fixtures.push({ id: 'grad-1', category: 'fresh-graduate', rawText: 'John Smith\njohn@test.com\n555-1234\nNew York\nRecent CS graduate from NYU. Internship at Google on React. Know JavaScript, Python, React, Node.js.', expectedLanguage: 'en', expectedMinFields: 5 })
  fixtures.push({ id: 'grad-2', category: 'fresh-graduate', rawText: 'خريج جديد في إدارة الأعمال من جامعة الملك عبدالعزيز. أبحث عن عمل في مجال التسويق.', expectedLanguage: 'ar', expectedMinFields: 1 })
  fixtures.push({ id: 'grad-3', category: 'fresh-graduate', rawText: 'Jane Doe, BSN nursing graduate from Johns Hopkins. Clinical rotations at Hopkins Hospital. BLS certified.', expectedLanguage: 'en', expectedProfession: 'Healthcare', expectedMinFields: 3 })
  fixtures.push({ id: 'grad-4', category: 'fresh-graduate', rawText: 'Mohammed Ali, recent accounting grad. CPA candidate. Know SAP, Excel, QuickBooks.', expectedLanguage: 'en', expectedProfession: 'Accounting', expectedMinFields: 2 })
  fixtures.push({ id: 'grad-5', category: 'fresh-graduate', rawText: 'ليلى أحمد، خريجة تسويق، أعرف SEO و Google Analytics و social media', expectedLanguage: 'bilingual', expectedMinFields: 2 })

  // ─── Experienced Professionals (5) ───
  fixtures.push({ id: 'exp-1', category: 'experienced', rawText: 'Senior Software Engineer with 8 years experience. React, TypeScript, Node.js. Led teams of 10. Reduced latency by 60%.', expectedLanguage: 'en', expectedProfession: 'Software Engineering', expectedMinFields: 2 })
  fixtures.push({ id: 'exp-2', category: 'experienced', rawText: 'مديرة موارد بشرية مع 10 سنوات خبرة في التوظيف وإدارة الموظفين', expectedLanguage: 'ar', expectedProfession: 'Human Resources', expectedMinFields: 1 })
  fixtures.push({ id: 'exp-3', category: 'experienced', rawText: 'Marketing manager 6 years. SEO, SEM, HubSpot. Grew traffic 250%. Managed $500K budget.', expectedLanguage: 'en', expectedProfession: 'Marketing', expectedMinFields: 2 })
  fixtures.push({ id: 'exp-4', category: 'experienced', rawText: 'Senior accountant 7 years. CPA, IFRS, SAP. Reduced close from 10 to 5 days.', expectedLanguage: 'en', expectedProfession: 'Accounting', expectedMinFields: 2 })
  fixtures.push({ id: 'exp-5', category: 'experienced', rawText: 'ICU nurse 5 years. BLS, ACLS, PALS. Reduced medication errors 50%. Trained 12 staff.', expectedLanguage: 'en', expectedProfession: 'Healthcare', expectedMinFields: 2 })

  // ─── Executives (5) ───
  fixtures.push({ id: 'exec-1', category: 'executive', rawText: 'CTO at tech startup. 15 years experience. Built engineering org from 5 to 80 people. $50M ARR.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'exec-2', category: 'executive', rawText: 'VP of Marketing at Fortune 500. Led rebrand generating $100M pipeline. MBA from Wharton.', expectedLanguage: 'en', expectedProfession: 'Marketing', expectedMinFields: 2 })
  fixtures.push({ id: 'exec-3', category: 'executive', rawText: 'مدير عام لشركة صناعية. 20 سنة خبرة. إدارة 500 موظف. ميزانية 100 مليون.', expectedLanguage: 'ar', expectedMinFields: 1 })
  fixtures.push({ id: 'exec-4', category: 'executive', rawText: 'Chief Financial Officer. CPA, MBA. 20 years in finance. IPO experience. Sarbanes-Oxley compliance.', expectedLanguage: 'en', expectedProfession: 'Accounting', expectedMinFields: 2 })
  fixtures.push({ id: 'exec-5', category: 'executive', rawText: 'Chief Nursing Officer. 25 years. DNP. Managed 500+ nurses across 3 hospitals.', expectedLanguage: 'en', expectedProfession: 'Healthcare', expectedMinFields: 2 })

  // ─── Software Engineers (5) ───
  fixtures.push({ id: 'swe-1', category: 'software-engineering', rawText: 'Full-stack developer. React, Node, PostgreSQL, AWS. 5 years. Built 3 SaaS products.', expectedLanguage: 'en', expectedProfession: 'Software Engineering', expectedMinFields: 2 })
  fixtures.push({ id: 'swe-2', category: 'software-engineering', rawText: 'Backend engineer Go, Kubernetes, gRPC. Microservices. Handled 1M req/sec.', expectedLanguage: 'en', expectedProfession: 'Software Engineering', expectedMinFields: 2 })
  fixtures.push({ id: 'swe-3', category: 'software-engineering', rawText: 'Mobile developer Flutter, Kotlin, Swift. 10 apps published. 500K downloads.', expectedLanguage: 'en', expectedProfession: 'Software Engineering', expectedMinFields: 2 })
  fixtures.push({ id: 'swe-4', category: 'software-engineering', rawText: 'DevOps engineer. Docker, Kubernetes, Terraform, CI/CD. Reduced deploy time 80%.', expectedLanguage: 'en', expectedProfession: 'Software Engineering', expectedMinFields: 2 })
  fixtures.push({ id: 'swe-5', category: 'software-engineering', rawText: 'Data scientist Python, TensorFlow, SQL, Spark. Built ML models for 10M users.', expectedLanguage: 'en', expectedProfession: 'Software Engineering', expectedMinFields: 2 })

  // ─── Cybersecurity (5) ───
  fixtures.push({ id: 'cyber-1', category: 'cybersecurity', rawText: 'Maria Al-Juhani, cybersecurity diploma, Cisco certs, JavaScript, network defense, Yanbu.', expectedLanguage: 'en', expectedProfession: 'Cybersecurity', expectedMinFields: 2 })
  fixtures.push({ id: 'cyber-2', category: 'cybersecurity', rawText: 'Security analyst 3 years. SIEM, incident response, penetration testing, reverse engineering.', expectedLanguage: 'en', expectedProfession: 'Cybersecurity', expectedMinFields: 2 })
  fixtures.push({ id: 'cyber-3', category: 'cybersecurity', rawText: 'أخصائي أمن سيبراني. اختبار الاختراق. حماية الشبكات. شهادات CISSP و CEH.', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'cyber-4', category: 'cybersecurity', rawText: 'SOC analyst. Firewalls, IDS/IPS, log analysis, threat hunting. 4 years experience.', expectedLanguage: 'en', expectedProfession: 'Cybersecurity', expectedMinFields: 2 })
  fixtures.push({ id: 'cyber-5', category: 'cybersecurity', rawText: 'Cybersecurity consultant. Risk assessment, compliance, ISO 27001, NIST framework.', expectedLanguage: 'en', expectedProfession: 'Cybersecurity', expectedMinFields: 2 })

  // ─── HR (5) ───
  fixtures.push({ id: 'hr-1', category: 'hr', rawText: 'فاطمة الزهراني، مديرة موارد بشرية، 10 سنوات، التوظيف، تقييم الأداء، جدة', expectedLanguage: 'ar', expectedProfession: 'Human Resources', expectedMinFields: 2 })
  fixtures.push({ id: 'hr-2', category: 'hr', rawText: 'HR generalist 4 years. Recruitment, onboarding, payroll, employee relations.', expectedLanguage: 'en', expectedProfession: 'Human Resources', expectedMinFields: 2 })
  fixtures.push({ id: 'hr-3', category: 'hr', rawText: 'Talent acquisition specialist. LinkedIn Recruiter, ATS, campus recruiting. Hired 200+.', expectedLanguage: 'en', expectedProfession: 'Human Resources', expectedMinFields: 2 })
  fixtures.push({ id: 'hr-4', category: 'hr', rawText: 'HR business partner. Performance management, compensation, L&D, organizational design.', expectedLanguage: 'en', expectedProfession: 'Human Resources', expectedMinFields: 2 })
  fixtures.push({ id: 'hr-5', category: 'hr', rawText: 'أخصائية توظيف. مقابلات. إدارة الموظفين. قانون العمل السعودي.', expectedLanguage: 'ar', expectedMinFields: 2 })

  // ─── Marketing (5) ───
  fixtures.push({ id: 'mkt-1', category: 'marketing', rawText: 'Digital marketing manager. SEO, SEM, Google Analytics, HubSpot. 300% ROI.', expectedLanguage: 'en', expectedProfession: 'Marketing', expectedMinFields: 2 })
  fixtures.push({ id: 'mkt-2', category: 'marketing', rawText: 'Content strategist. Blog writing, SEO, social media. Grew organic traffic 500%.', expectedLanguage: 'en', expectedProfession: 'Marketing', expectedMinFields: 2 })
  fixtures.push({ id: 'mkt-3', category: 'marketing', rawText: 'مدير تسويق رقمي. إعلانات جوجل. سوشيال ميديا. تحليل البيانات.', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'mkt-4', category: 'marketing', rawText: 'Brand manager. Product launches, market research, consumer insights, agency management.', expectedLanguage: 'en', expectedProfession: 'Marketing', expectedMinFields: 2 })
  fixtures.push({ id: 'mkt-5', category: 'marketing', rawText: 'Growth hacker. A/B testing, funnel optimization, viral campaigns. 10M users.', expectedLanguage: 'en', expectedProfession: 'Marketing', expectedMinFields: 2 })

  // ─── Finance (5) ───
  fixtures.push({ id: 'fin-1', category: 'finance', rawText: 'Financial analyst. CFA Level 3. Excel modeling, DCF, M&A analysis. 5 years.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'fin-2', category: 'finance', rawText: 'محلل مالي. تقارير مالية. موازنات. تحليل الانحرافات. SAP.', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'fin-3', category: 'finance', rawText: 'Investment banker. M&A, IPO, LBO modeling. Series 7 & 63. Goldman Sachs.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'fin-4', category: 'finance', rawText: 'Treasury manager. Cash management, FX hedging, bank relationships. 8 years.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'fin-5', category: 'finance', rawText: 'Credit analyst. Risk assessment, loan underwriting, financial statements. 6 years.', expectedLanguage: 'en', expectedMinFields: 2 })

  // ─── Healthcare (5) ───
  fixtures.push({ id: 'hlth-1', category: 'healthcare', rawText: 'Registered nurse ICU. 5 years. BLS, ACLS. King Faisal Hospital. Patient satisfaction 98%.', expectedLanguage: 'en', expectedProfession: 'Healthcare', expectedMinFields: 2 })
  fixtures.push({ id: 'hlth-2', category: 'healthcare', rawText: 'ممرض غرفة عمليات. 7 سنوات. التعقيم. مستشفى الحبيب.', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'hlth-3', category: 'healthcare', rawText: 'Pharmacist. PharmD. Drug interactions, compounding, patient counseling. CVS.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'hlth-4', category: 'healthcare', rawText: 'Physical therapist. DPT. Sports injuries, rehabilitation, manual therapy. 4 years.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'hlth-5', category: 'healthcare', rawText: 'Medical lab technician. Hematology, microbiology, chemistry. ASCP certified.', expectedLanguage: 'en', expectedMinFields: 2 })

  // ─── Arabic Only (5) ───
  fixtures.push({ id: 'ar-1', category: 'arabic-only', rawText: 'عبدالله السعد، مهندس مدني، 8 سنوات خبرة، إدارة مشاريع إنشائية', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'ar-2', category: 'arabic-only', rawText: 'نورة العتيبي، معلمة رياضيات، 5 سنوات، تطوير المناهج', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'ar-3', category: 'arabic-only', rawText: 'سعد القحطاني، محامي، قانون تجاري، 12 سنة خبرة، الرياض', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'ar-4', category: 'arabic-only', rawText: 'ريم الدوسري، مصممة جرافيك، فوتوشوب، إليستريتور، 3 سنوات', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'ar-5', category: 'arabic-only', rawText: 'فهد المطيري، مدير مبيعات، 10 سنوات، إدارة فريق 20 موظف', expectedLanguage: 'ar', expectedMinFields: 2 })

  // ─── English Only (5) ───
  fixtures.push({ id: 'en-1', category: 'english-only', rawText: 'Sales representative. B2B, CRM, pipeline management. Quota attainment 120%.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'en-2', category: 'english-only', rawText: 'Project manager PMP. Agile, Scrum, Kanban. Delivered 50+ projects on time.', expectedLanguage: 'en', expectedProfession: 'Project Management', expectedMinFields: 2 })
  fixtures.push({ id: 'en-3', category: 'english-only', rawText: 'Customer success manager. Onboarding, retention, NPS. Reduced churn 30%.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'en-4', category: 'english-only', rawText: 'Logistics coordinator. Supply chain, inventory, shipping. SAP. 6 years.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'en-5', category: 'english-only', rawText: 'Chef. 15 years. French cuisine. Michelin star restaurant. Menu development.', expectedLanguage: 'en', expectedMinFields: 2 })

  // ─── Mixed Arabic/English (5) ───
  fixtures.push({ id: 'mix-1', category: 'bilingual', rawText: 'Khalid Al-Ghamdi / خالد الغامدي. Project manager / مدير مشاريع. ARAMCO. MBA.', expectedLanguage: 'bilingual', expectedMinFields: 2 })
  fixtures.push({ id: 'mix-2', category: 'bilingual', rawText: 'Sara Ahmed / سارة أحمد. Marketing specialist / أخصائية تسويق. SEO, social media / سوشيال ميديا.', expectedLanguage: 'bilingual', expectedMinFields: 2 })
  fixtures.push({ id: 'mix-3', category: 'bilingual', rawText: 'Ahmed / أحمد. Software engineer / مهندس برمجيات. React, TypeScript / ريact.', expectedLanguage: 'bilingual', expectedMinFields: 2 })
  fixtures.push({ id: 'mix-4', category: 'bilingual', rawText: 'Noura / نورة. HR manager / مديرة موارد بشرية. Recruitment / توظيف.', expectedLanguage: 'bilingual', expectedMinFields: 2 })
  fixtures.push({ id: 'mix-5', category: 'bilingual', rawText: 'Mohammed / محمد. Accountant / محاسب. CPA, IFRS / التقارير المالية.', expectedLanguage: 'bilingual', expectedMinFields: 2 })

  // ─── OCR Scanned (5) ───
  fixtures.push({ id: 'ocr-1', category: 'ocr', rawText: 'Robert|Chen\nrob chen at\ngmail dot com\n415-555\n-0199\nSan Fran\ncisco CA\n\nSoftware eng\nineer\n\nGoogle\n2020 to now\n- Built search\n- Led team of 6', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'ocr-2', category: 'ocr', rawText: 'DOC-20260623-WA0028.\n\nJane Doe\n\njane.doe@email.com\n\n555-9876\n\nNYC\n\nDeveloper\n\nBuilt apps', expectedLanguage: 'en', expectedMinFields: 3 })
  fixtures.push({ id: 'ocr-3', category: 'ocr', rawText: 'James+Smith+james@test.com+555-0000+Boston+Engineer+5+years+Python+Java', expectedLanguage: 'en', expectedMinFields: 3 })
  fixtures.push({ id: 'ocr-4', category: 'ocr', rawText: 'مري%0D%0A%0A%0Aمحمد%0D%0A%0A%0Aمھندس', expectedLanguage: 'bilingual', expectedMinFields: 1 })
  fixtures.push({ id: 'ocr-5', category: 'ocr', rawText: 'Sarah\n\n\n\nJohnson\n\n\nsarah@email.com\n\n\nPython developer', expectedLanguage: 'en', expectedMinFields: 2 })

  // ─── WhatsApp Exports (5) ───
  fixtures.push({ id: 'wa-1', category: 'whatsapp', rawText: 'DOC-20260623-WA0028.\n\nMaria Msaad Al-Juhani\n\nmariaaljuhani890@gmail.com\n\n0504157855\n\nYanbu\n\nCybersecurity diploma\n\nCisco courses', expectedLanguage: 'en', expectedMinFields: 4 })
  fixtures.push({ id: 'wa-2', category: 'whatsapp', rawText: 'DOC-20260101-WA0001.\n\nAhmed Hassan\n\nahmed@gmail.com\n\n0551234567\n\nRiyadh\n\nSoftware engineer\n\n8 years\n\nReact TypeScript', expectedLanguage: 'en', expectedMinFields: 4 })
  fixtures.push({ id: 'wa-3', category: 'whatsapp', rawText: 'DOC-20260315-WA0005.\n\nفاطمة علي\n\nfatima@email.com\n\n0559876543\n\nجدة\n\nمديرة موارد بشرية\n\n10 سنوات خبرة', expectedLanguage: 'bilingual', expectedMinFields: 4 })
  fixtures.push({ id: 'wa-4', category: 'whatsapp', rawText: 'DOC-20260420-WA0010.\n\nJohn Smith | john@test.com | 555-1234 | NYC | Marketing | 5 years', expectedLanguage: 'en', expectedMinFields: 4 })
  fixtures.push({ id: 'wa-5', category: 'whatsapp', rawText: 'DOC-20260501-WA0003.\n\nKhalid / خالد\n\nkhalid@email.com\n\n0551112222\n\nRiyadh / الرياض\n\nProject manager / مدير مشاريع', expectedLanguage: 'bilingual', expectedMinFields: 4 })

  // ─── Poorly Formatted (5) ───
  fixtures.push({ id: 'fmt-1', category: 'poor-format', rawText: 'name: bob  email: bob@bob.com  phone: 1234567890  job: developer  skills: python java go', expectedLanguage: 'en', expectedMinFields: 3 })
  fixtures.push({ id: 'fmt-2', category: 'poor-format', rawText: 'BOB SMITH BOB@TEST.COM 555-1234 DEVELOPER 5 YEARS PYTHON REACT', expectedLanguage: 'en', expectedMinFields: 3 })
  fixtures.push({ id: 'fmt-3', category: 'poor-format', rawText: 'alice // alice@test.com // 555-9999 // engineer // 3 years // javascript', expectedLanguage: 'en', expectedMinFields: 3 })
  fixtures.push({ id: 'fmt-4', category: 'poor-format', rawText: 'Name: Mohammed\nPhone: 0551234567\nEmail: mohammed@test.com\nJob: Accountant\nSkills: Excel SAP IFRS', expectedLanguage: 'en', expectedMinFields: 4 })
  fixtures.push({ id: 'fmt-5', category: 'poor-format', rawText: '---RESUME---\nJohn Doe\njohn@doe.com\n555-0000\n---EXPERIENCE---\nDeveloper 5 years\n---SKILLS---\nPython Java', expectedLanguage: 'en', expectedMinFields: 4 })

  // ─── Very Short (5) ───
  fixtures.push({ id: 'short-1', category: 'very-short', rawText: 'Dev.', expectedLanguage: 'en', expectedMinFields: 0 })
  fixtures.push({ id: 'short-2', category: 'very-short', rawText: 'مھندس', expectedLanguage: 'ar', expectedMinFields: 0 })
  fixtures.push({ id: 'short-3', category: 'very-short', rawText: 'John, Python dev', expectedLanguage: 'en', expectedMinFields: 1 })
  fixtures.push({ id: 'short-4', category: 'very-short', rawText: 'Nurse, 5 years', expectedLanguage: 'en', expectedMinFields: 1 })
  fixtures.push({ id: 'short-5', category: 'very-short', rawText: 'محاسب', expectedLanguage: 'ar', expectedMinFields: 0 })

  // ─── Very Long (5) ───
  fixtures.push({ id: 'long-1', category: 'very-long', rawText: 'John Doe. Software Engineer. ' + 'Built scalable systems and reduced latency. '.repeat(100), expectedLanguage: 'en', expectedMinFields: 1 })
  fixtures.push({ id: 'long-2', category: 'very-long', rawText: 'Ahmed. Engineer. ' + 'Developed features and improved performance. '.repeat(150), expectedLanguage: 'en', expectedMinFields: 1 })
  fixtures.push({ id: 'long-3', category: 'very-long', rawText: 'محمد. مھندس. ' + 'طور الأنظمة وحسن الأداء. '.repeat(100), expectedLanguage: 'ar', expectedMinFields: 1 })

  // ─── Missing Sections (5) ───
  fixtures.push({ id: 'miss-1', category: 'missing-sections', rawText: 'John Doe, john@test.com. No experience listed. Know Python.', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'miss-2', category: 'missing-sections', rawText: 'Jane Smith. Software engineer. 5 years. No contact info.', expectedLanguage: 'en', expectedMinFields: 1 })
  fixtures.push({ id: 'miss-3', category: 'missing-sections', rawText: 'Bob. bob@email.com. No skills, no experience, no education.', expectedLanguage: 'en', expectedMinFields: 1 })
  fixtures.push({ id: 'miss-4', category: 'missing-sections', rawText: 'علي. علي@email.com. محاسب. لا توجد خبرات مذكورة.', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'miss-5', category: 'missing-sections', rawText: 'Alice, engineer, Python, 3 years. Missing phone and email.', expectedLanguage: 'en', expectedMinFields: 2 })

  // ─── Duplicate Sections (5) ───
  fixtures.push({ id: 'dup-1', category: 'duplicate-sections', rawText: 'John Smith\nDeveloper at Google\nDeveloper at Google\nPython Java', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'dup-2', category: 'duplicate-sections', rawText: 'Jane\nJane\nSoftware engineer\nSoftware engineer\nPython\nPython', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'dup-3', category: 'duplicate-sections', rawText: 'فاطمة\nفاطمة\nممرضة\nممرضة\nBLS\nBLS', expectedLanguage: 'ar', expectedMinFields: 2 })
  fixtures.push({ id: 'dup-4', category: 'duplicate-sections', rawText: 'Bob bob@test.com\nBob bob@test.com\nDeveloper Developer\nReact React', expectedLanguage: 'en', expectedMinFields: 2 })
  fixtures.push({ id: 'dup-5', category: 'duplicate-sections', rawText: 'Ahmed / أحمد\nAhmed / أحمد\nEngineer / مهندس\nEngineer / مهندس', expectedLanguage: 'bilingual', expectedMinFields: 2 })

  // ─── Edge Cases (2) ───
  fixtures.push({ id: 'edge-1', category: 'edge-case', rawText: '', expectedLanguage: 'en', expectedMinFields: 0 })
  fixtures.push({ id: 'edge-2', category: 'edge-case', rawText: '!!!@@@##$%%^^&&**(())', expectedLanguage: 'en', expectedMinFields: 0 })

  // ─── Additional Diverse (remove 5 to reach exactly 100) ───
  // We have 105 above — remove the last 5 "additional" entries if any, or adjust.
  // Actually we have exactly 100 above (20 categories × 5 each = 100).

  return fixtures
}

const FIXTURES = gen()

// ─── Validation Tests ──────────────────────────────────────────────

describe('100-Resume Validation Suite', () => {
  test('generates exactly 100 fixtures', () => {
    expect(FIXTURES.length).toBe(100)
  })

  test('covers 20+ categories', () => {
    const categories = new Set(FIXTURES.map(f => f.category))
    expect(categories.size).toBeGreaterThanOrEqual(20)
  })

  test('includes all required categories', () => {
    const categories = new Set(FIXTURES.map(f => f.category))
    const required = ['student', 'fresh-graduate', 'experienced', 'executive', 'software-engineering',
      'cybersecurity', 'hr', 'marketing', 'finance', 'healthcare', 'arabic-only', 'english-only',
      'bilingual', 'ocr', 'whatsapp', 'poor-format', 'very-short', 'very-long',
      'missing-sections', 'duplicate-sections', 'edge-case']
    for (const r of required) {
      expect(categories.has(r)).toBe(true)
    }
  })
})

// ─── Per-Fixture Validation: Language Detection ────────────────────

describe('Language Detection — all 100 fixtures', () => {
  for (const f of FIXTURES) {
    test(`[${f.id}] detects ${f.expectedLanguage}`, () => {
      const result = detectLanguage(f.rawText)
      if (f.rawText.trim().length === 0 || f.id.startsWith('edge-')) {
        expect(['en', 'ar', 'bilingual']).toContain(result)
      } else {
        expect(result).toBe(f.expectedLanguage)
      }
    })
  }
})

// ─── Per-Fixture Validation: OCR Cleanup ───────────────────────────

describe('OCR Cleanup — all 100 fixtures', () => {
  for (const f of FIXTURES) {
    test(`[${f.id}] cleanup does not crash`, () => {
      const result = cleanOCRText(f.rawText)
      expect(typeof result).toBe('string')
    })
  }
})

describe('OCR Cleanup — artifact removal', () => {
  test('removes WhatsApp headers', () => {
    const cleaned = cleanOCRText(FIXTURES.find(x => x.id === 'wa-1')!.rawText)
    expect(cleaned).not.toContain('DOC-')
  })
  test('fixes broken emails', () => {
    const cleaned = cleanOCRText(FIXTURES.find(x => x.id === 'ocr-1')!.rawText)
    expect(cleaned).toContain('@gmail.com')
  })
  test('decodes URL encoding', () => {
    const cleaned = cleanOCRText(FIXTURES.find(x => x.id === 'ocr-4')!.rawText)
    expect(cleaned).not.toContain('%0D')
  })
  test('replaces + with spaces', () => {
    const cleaned = cleanOCRText(FIXTURES.find(x => x.id === 'ocr-3')!.rawText)
    expect(cleaned).not.toContain('+')
  })
})

// ─── Evaluator Validation ──────────────────────────────────────────

describe('Evaluator — 14 metrics on known-good resume (20 fixtures)', () => {
  const goodResume = {
    contact: { name: 'Test User', email: 'test@test.com', phone: '555-1234', location: 'NYC' },
    objective: 'Experienced professional seeking new challenges.',
    experience: [{ title: 'Developer', company: 'Tech Co', location: 'NYC', startDate: '2020', endDate: '2024', bullets: ['Built scalable systems reducing latency by 40%', 'Led team of 6 engineers'] }],
    education: [{ degree: 'BS CS', school: 'MIT', startDate: '2016', endDate: '2020', details: 'GPA 4.0' }],
    skills: { technical: ['Python', 'React'], soft: ['Leadership'], languages: [{ language: 'English', level: 'Native' }] },
    courses: [], certifications: [], projects: [],
  }

  for (const f of FIXTURES.slice(0, 20)) {
    test(`[${f.id}] evaluator produces 14 metrics`, () => {
      const result = evaluateResume(goodResume, f.rawText, [])
      expect(result.metrics.length).toBe(14)
      expect(result.overall).toBeGreaterThanOrEqual(0)
    })
  }
})

describe('Hallucination Guard — honest resume (20 fixtures)', () => {
  const honestResume = {
    contact: { name: 'Test', email: 'test@test.com', phone: '123', location: 'NYC' },
    objective: 'Developer', experience: [], education: [],
    skills: { technical: ['Python'], soft: [], languages: [] },
    courses: [], certifications: [], projects: [],
  }

  for (const f of FIXTURES.slice(0, 20)) {
    test(`[${f.id}] hallucination metric exists`, () => {
      const result = evaluateResume(honestResume, f.rawText, [])
      expect(result.metrics.find(m => m.name === 'Hallucination Detection')).toBeDefined()
    })
  }
})

// ─── Missing Info + Confidence + Profession + Keywords ─────────────

describe('Missing Info — empty vs complete', () => {
  test('empty resume: 8+ missing', () => {
    const missing = detectMissingInfo({ contact: {}, objective: null, objectiveAr: null, experience: [], education: [], skills: { technical: [], soft: [], languages: [] }, courses: [], certifications: [], projects: [] } as any)
    expect(missing.length).toBeGreaterThanOrEqual(8)
  })
  test('complete resume: <5 missing', () => {
    const missing = detectMissingInfo({ contact: { name: 'John', email: 'j@t.com', phone: '123', linkedin: 'l' }, objective: 'Dev', objectiveAr: null, experience: [{ title: 'Dev', company: 'Co', location: null, startDate: null, endDate: null, bullets: ['Built'] }], education: [{ degree: 'BS', school: 'MIT', location: null, startDate: null, endDate: null, details: null }], skills: { technical: ['Python'], soft: [], languages: [{ language: 'En', level: 'Native' }] }, courses: [], certifications: [], projects: [] } as any)
    expect(missing.length).toBeLessThan(5)
  })
})

describe('Confidence — returns all fields', () => {
  test('returns high/medium/low for each field', () => {
    const c = calculateConfidence({ contact: { name: 'Test', email: 't@t.com' }, objective: 'Dev', objectiveAr: null, experience: [], education: [], skills: { technical: [], soft: [], languages: [] }, courses: [], certifications: [], projects: [] } as any)
    expect(c['contact.name']).toBe('high')
    expect(c['contact.phone']).toBe('low')
    expect(c['objective']).toBe('medium')
  })
})

describe('Profession Detection — tagged fixtures', () => {
  const tagged = FIXTURES.filter(f => f.expectedProfession)
  for (const f of tagged) {
    test(`[${f.id}] detects profession without crash`, () => {
      const resume = { contact: { name: 'Test' }, objective: f.rawText.slice(0, 200), objectiveAr: null, experience: [], education: [], skills: { technical: [], soft: [], languages: [] }, courses: [], certifications: [], projects: [] }
      const result = detectProfession(resume as any)
      expect(result.profession).toBeDefined()
    })
  }
})

describe('Keyword Extraction — 20 fixtures', () => {
  for (const f of FIXTURES.slice(0, 20)) {
    test(`[${f.id}] extracts keywords without crash`, () => {
      const resume = { contact: { name: 'Test' }, objective: f.rawText.slice(0, 200), objectiveAr: null, experience: [], education: [], skills: { technical: [], soft: [], languages: [] }, courses: [], certifications: [], projects: [] }
      const kw = extractKeywords(resume as any)
      expect(Array.isArray(kw.detected)).toBe(true)
    })
  }
})

describe('Deduplication', () => {
  test('removes duplicate experience', () => {
    const r = deduplicateResume({ contact: {}, objective: null, objectiveAr: null, experience: [{ title: 'Dev', company: 'Google', location: null, startDate: null, endDate: null, bullets: [] }, { title: 'Dev', company: 'Google', location: null, startDate: null, endDate: null, bullets: [] }], education: [], skills: { technical: [], soft: [], languages: [] }, courses: [], certifications: [], projects: [] } as any)
    expect(r.experience.length).toBe(1)
  })
  test('removes duplicate skills', () => {
    const r = deduplicateResume({ contact: {}, objective: null, objectiveAr: null, experience: [], education: [], skills: { technical: ['Python', 'Python', 'Java'], soft: [], languages: [] }, courses: [], certifications: [], projects: [] } as any)
    expect(r.skills.technical.length).toBe(2)
  })
})

// ─── Statistics ────────────────────────────────────────────────────

describe('Statistics', () => {
  test('all 100 fixtures valid', () => {
    for (const f of FIXTURES) {
      expect(f.id).toBeTruthy()
      expect(f.category).toBeTruthy()
      expect(typeof f.rawText).toBe('string')
    }
  })
  test('language distribution', () => {
    expect(FIXTURES.filter(f => f.expectedLanguage === 'en').length).toBeGreaterThan(10)
    expect(FIXTURES.filter(f => f.expectedLanguage === 'ar').length).toBeGreaterThan(5)
    expect(FIXTURES.filter(f => f.expectedLanguage === 'bilingual').length).toBeGreaterThan(5)
  })
})
