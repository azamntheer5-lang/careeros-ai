import json, sys, urllib.request

SAMPLE = """DOC-20260623-WA0028.

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
Professional and efficient work delivery.
Technical knowledge in cybersecurity and network protection.
Time management and task prioritization.

LANGUAGES

Arabic: Native.
English: Intermediate."""

payload = json.dumps({"rawText": SAMPLE}).encode()
req = urllib.request.Request("http://127.0.0.1:3000/api/desktop/generate-resume-v2", data=payload, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
except Exception as e:
    print("Request error:", e)
    sys.exit(1)

if "error" in data:
    print("ERROR:", data["error"][:300])
    sys.exit(1)

r = data.get("resume", {})
s = data.get("score", {})

print("=== PARSED RESUME ===")
print("Name:", r.get("contact", {}).get("name"))
print("Email:", r.get("contact", {}).get("email"))
print("Phone:", r.get("contact", {}).get("phone"))
print("Location:", r.get("contact", {}).get("location"))
print("Objective:", (r.get("objective") or "")[:200])
print()
print("Experience entries:", len(r.get("experience", [])))
for exp in r.get("experience", []):
    print(f"  - {exp.get('title')} at {exp.get('company')}")
    for b in exp.get("bullets", [])[:3]:
        print(f"    • {b[:100]}")
print()
print("Education entries:", len(r.get("education", [])))
for ed in r.get("education", []):
    print(f"  - {ed.get('degree')} at {ed.get('school')}")
print()
print("Technical skills:", r.get("skills", {}).get("technical", []))
print("Soft skills:", r.get("skills", {}).get("soft", []))
print("Languages:", r.get("skills", {}).get("languages", []))
print("Courses:", len(r.get("courses", [])))
for c in r.get("courses", [])[:4]:
    print(f"  - {c.get('name')} ({c.get('provider')}, {c.get('hours')}, {c.get('date')})")
print()

print("=== SCORES ===")
print("Overall:", s.get("overall"))
print("ATS:", s.get("atsScore"))
print("Completeness:", s.get("completeness"))
print("Keyword:", s.get("keywordScore"))
print("Formatting:", s.get("formattingScore"))
print("Dimensions:", [(d.get("name"), d.get("score"), d.get("status")) for d in s.get("dimensions", [])])
print("Quick wins:", s.get("quickWins", [])[:3])
print("Missing critical:", s.get("missingCritical", [])[:3])
print()

print("=== ENRICHMENT ===")
print("Was enriched:", data.get("wasEnriched"))
print("Notes:", data.get("enrichmentNotes", []))
print("Language:", data.get("detectedLanguage"))
print()

print("=== MISSING INFO ===")
for m in data.get("missingInfo", [])[:5]:
    print(f"  [{m.get('priority')}] {m.get('field')}: {m.get('question')}")
    if m.get("suggestion"):
        print(f"    Suggestion: {m.get('suggestion')}")
print()

print("=== KEYWORDS ===")
print("Detected:", data.get("keywords", {}).get("detected", [])[:10])
print("Suggested:", data.get("keywords", {}).get("suggested", [])[:5])
print("Action verbs:", data.get("keywords", {}).get("actionVerbs", [])[:5])
print("Missing action verbs:", data.get("keywords", {}).get("missingActionVerbs", [])[:5])
