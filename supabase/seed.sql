-- ============================================================
-- IOLA Seed Data — run in Supabase SQL Editor after migration
-- ============================================================

-- Applications & Grants
insert into public.applications
  (name, type, region, amount, status, priority, fund_description, next_step, notes, contact_name, owner, deadline)
values
  ('Black Flag',
   'Accelerator', 'USA', '$2M–$3M', 'Not Yet Applied', 'Critical',
   'Defense-tech and deep tech fund backed by founders of Palantir, Anthropic, and xAI. Focus on defense, space, and hardware infrastructure. Rolling 30-day review cycle.',
   'Apply immediately after Delaware C-Corp registration is confirmed.',
   'Highest priority. Apply now with the updated deck.',
   '', 'Jason', null),

  ('LVL UP Labs',
   'Accelerator', 'USA', '$250K + perks', 'Not Yet Applied', 'Critical',
   '$250K plus credits from OpenAI, Anthropic, AWS, and more. Backed by top deep tech investors. Strong Africa and emerging market interest.',
   'Apply as soon as Delaware C-Corp is confirmed. Use Roberto''s referral from Italy.',
   'Previously accepted. Only blocked by missing Delaware registration.',
   'Roberto', 'Jason', null),

  ('Techstars Europe',
   'Accelerator', 'Europe', 'Varies', 'Not Yet Applied', 'High',
   'Deep tech, space, manufacturing, and climate focus. One of the strongest European accelerator networks.',
   'Start application — deadline June 10 2026.',
   '',
   '', 'Jason', '2026-06-10'),

  ('ESA Kick-starts',
   'Grant', 'Europe', '€75,000', 'In Progress', 'Critical',
   'ESA Business Applications non-dilutive grant for space-derived services. Requires European entity. Germany entity via Alph Doamekpor.',
   'Final push with Alph. Confirm Germany entity pathway. Submit by May 29.',
   'Non-dilutive. €75,000. Hard deadline May 29.',
   'Alph Doamekpor', 'Jason + Alph', '2026-05-29'),

  ('SPACERAISE 2026',
   'Grant', 'Europe', 'Scholarship', 'Accepted', 'High',
   'EU-funded space technology program in L''Aquila, Italy. Scholarship covers program fees. Reimbursement on arrival.',
   'Confirm visa. Attend late May. Natural moment to meet Moira from SRI International.',
   'Jason attending late May. Visa in progress.',
   '', 'Jason', null),

  ('Deep Learning Indaba Grants',
   'Grant', 'Africa', 'Varies', 'Pending', 'High',
   'Annual grants supporting African ML research and projects. Warm relationship from 2025 Ideathon win.',
   'Follow up on grant status.',
   'Won 2025 Ideathon. Public support offered by leadership.',
   '', 'Jason + Abigail', null),

  ('Google for Startups',
   'Grant', 'Global', 'Cloud credits', 'Accepted', 'Medium',
   'Google Cloud credits for early-stage startups. Active credits supporting IOLA''s RL training infrastructure.',
   'Keep active and monitor usage.',
   'Active.',
   '', 'Jason', null),

  ('Nvidia Inception',
   'Grant', 'Global', 'GPU credits', 'Accepted', 'Medium',
   'GPU credits and technical support for AI startups. Active credits for IkirereMesh RL training.',
   'Keep active and monitor usage.',
   'Active for IkirereMesh RL training.',
   '', 'Jason', null),

  ('Station F Fighters',
   'Accelerator', 'Europe', 'Workspace + network', 'Applied', 'High',
   'World''s largest startup campus in Paris. Workspace, mentorship, and European ecosystem access. Rolling applications.',
   'Await response.',
   '',
   '', 'Jason', null),

  ('Generation Space',
   'VC / Angel', 'Global', 'Up to $10B fund', 'Not Yet Applied', 'Medium',
   'Focused on next-generation aerospace, deep space, and planetary ventures. SpaceX-scale ambitions.',
   'Apply when deck is final.',
   '',
   '', 'Jason', null),

  ('Speedrun',
   'Accelerator', 'Global', 'Varies', 'Not Yet Applied', 'Medium',
   'Fast-moving accelerator with significant buzz around current cohort. AI and deep tech friendly.',
   'Apply this week.',
   'High buzz around current cohort.',
   '', 'Jason', null),

  ('Setcoin Group / DSE Fund',
   'VC / Angel', 'Europe', '€17B fund', 'In Progress', 'Low',
   'Large European investment fund. Minimum ticket €100M. Not appropriate for pre-seed stage.',
   'Keep warm. Update Olena when Phase 1 ships. Revisit in 18–24 months.',
   'Long-term relationship only. Minimum ticket €100M.',
   'Olena', 'Jason', null);

-- Outreach & Contacts
insert into public.outreach
  (name, role, region, status, last_contact, notes, next_step, owner)
values
  ('Michael Daley',
   'Financial advisor and connector', 'USA (Bay Area)', 'Active', '2026-04-24',
   'Created Africa Space Race WhatsApp group. Moira from SRI International and Vijay in the group. Zoom call with Moira being arranged.',
   'Wait for Moira intro in WhatsApp group. Do not pitch — let Michael lead.',
   'Jason'),

  ('Rosalind',
   'Harvard Center for African Studies, Associate Director', 'USA (Boston)', 'Active', '2026-04-23',
   'Very warm. Bio sent. Will intro Prof. Achampon week of May 12. Connected to Prof. Dembele (School of Engineering) and climate sustainability faculty.',
   'Email Prof. Achampon May 12 once Rosalind shares his contact.',
   'Jason'),

  ('Parsa',
   'CEO, Spark (geospatial and defense tech, 500 people)', 'Canada (Vancouver)', 'Pending', '2026-04-22',
   'Good call. Offered dev support, ISRO contact (chief architect of India moon missions), and investor intros in NY and LA. Waiting for deck.',
   'Send IOLA pre-seed deck.',
   'Jason'),

  ('Sameep',
   'Tech dev company with NATO AI work', 'UK (London)', 'Pending', '2026-04-22',
   'Shared IOLA site with 2 defense contacts. Has ISRO partner. Mentioned Chilean VC for lunar rover company.',
   'Follow up April 28 — ask if defense contacts responded, get Chilean VC name.',
   'Jason'),

  ('Olena / Setcoin Group',
   'BD and deal sourcing', 'Europe', 'Warm', '2026-04-21',
   'Sent phase roadmap. Said interesting, will look when raising. Long-term play only. Minimum ticket €100M.',
   'Keep warm. Update when Phase 1 ships.',
   'Jason');

-- Action Items — Week 1
insert into public.action_items
  (title, description, owner, due_date, status, priority, week_label)
values
  ('Register Delaware C-Corp via Stripe Atlas',
   'Use Glenn''s Mercury discount code. This unlocks LVL UP Labs, Black Flag, and most investor conversations. Go to Stripe Atlas and complete the registration.',
   'Jason', '2026-05-02', 'To Do', 'Critical', 'Week 1 — Apr 28 to May 4'),

  ('Apply to Black Flag',
   'Backed by Palantir, Anthropic, xAI founders. $2M–$3M. 30-day review cycle. Use the updated deck and refined narrative. Defense/space/hardware focus.',
   'Jason', '2026-05-02', 'To Do', 'Critical', 'Week 1 — Apr 28 to May 4'),

  ('Follow up with Sameep',
   'Did his defense contacts respond? Get the Chilean VC name for the lunar rover company. Explore ISRO contact for aerospace software support.',
   'Jason', '2026-04-28', 'To Do', 'High', 'Week 1 — Apr 28 to May 4'),

  ('Send pre-seed deck to Parsa',
   'Send IOLA_PreSeed_2026.pdf. He has investor intros in New York and LA and an ISRO contact (chief architect of India moon missions). He is waiting.',
   'Jason', '2026-04-28', 'To Do', 'High', 'Week 1 — Apr 28 to May 4'),

  ('Begin Phase 1 TLE data ingestion from CelesTrak',
   'Pull live TLE data from CelesTrak. Parse Two-Line Elements. Store in database. This is the start of real orbital mechanics — Phase 1 begins here.',
   'Salami', '2026-05-04', 'To Do', 'Critical', 'Week 1 — Apr 28 to May 4'),

  ('Begin research literature review for Q4 paper',
   'Paper topic: open-source satellite simulation framework with SGP4 propagation for African space programs. Target venue: Deep Learning Indaba 2026 or AAAI workshop.',
   'Abigail', '2026-05-04', 'To Do', 'High', 'Week 1 — Apr 28 to May 4'),

  ('Everyone shares 2–3 network contacts with Jason',
   'Advisors, potential users, anyone in the space, AI, climate, or defense ecosystem. Drop names to Jason on WhatsApp. Do not filter — Jason will assess.',
   'All', '2026-05-05', 'To Do', 'High', 'Week 1 — Apr 28 to May 4'),

-- Week 2
  ('Apply to Techstars Europe',
   'Deep tech, space, and manufacturing focus. Application closes June 10. Start drafting this week to give enough time for a strong submission.',
   'Jason', '2026-05-09', 'To Do', 'High', 'Week 2 — May 5 to May 11'),

  ('Apply to LVL UP Labs (after Delaware done)',
   'Use Roberto''s referral from Italy. Previously accepted — only blocked by missing Delaware registration. $250K plus credits from OpenAI, Anthropic, AWS.',
   'Jason', '2026-05-11', 'To Do', 'Critical', 'Week 2 — May 5 to May 11'),

  ('SGP4 orbit propagation implementation',
   'Implement orbit propagation using satellite.js on the frontend and Skyfield or sgp4 library on the backend. Validate computed positions against N2YO or SatNOGS.',
   'Salami', '2026-05-09', 'To Do', 'Critical', 'Week 2 — May 5 to May 11'),

-- Week 3
  ('Email Professor Achampon (Harvard intro via Rosalind)',
   'Rosalind will share his email after May 12. Do not email before May 12 — exams in progress. Attach bio doc. Gateway to Prof. Dembele (School of Engineering) and climate faculty.',
   'Jason', '2026-05-12', 'To Do', 'Critical', 'Week 3 — May 12 to May 18'),

  ('ESA Kick-starts application — final push',
   'Deadline May 29. Confirm Germany entity pathway with Alph Doamekpor. €75,000 non-dilutive. Most important grant application of the month.',
   'Jason + Alph', '2026-05-16', 'To Do', 'Critical', 'Week 3 — May 12 to May 18'),

  ('Connect simulation frontend to real orbital engine',
   'Replace dummy satellite positions on the Command Center globe with real propagated orbits from the Phase 1 backend. Phase 1 becomes visible.',
   'Salami', '2026-05-16', 'To Do', 'Critical', 'Week 3 — May 12 to May 18'),

-- Week 4
  ('SPACERAISE 2026 — Italy',
   'EU-funded space program in L''Aquila, Italy. Scholarship awarded, reimbursement on arrival. Visa must be confirmed before travel. Natural moment to meet Moira from SRI International.',
   'Jason', '2026-05-25', 'To Do', 'Critical', 'Week 4 — May 19 to May 31'),

  ('ESA Kick-starts — final submission',
   'Hard deadline May 29. Submit via Alph''s Germany entity. Every day of delay is risk.',
   'Jason + Alph', '2026-05-29', 'To Do', 'Critical', 'Week 4 — May 19 to May 31'),

  ('Phase 1 complete — integration testing',
   'Verify globe visualization matches real tracking sites like N2YO. Fix edge cases. Document architecture for the Q4 research paper. Phase 1 ships.',
   'Salami', '2026-05-30', 'To Do', 'Critical', 'Week 4 — May 19 to May 31'),

  ('Research paper first draft — intro and background sections',
   'First two sections of the Q4 2026 paper. Tied to Phase 1 completion. As confirmed in email response.',
   'Abigail', '2026-05-30', 'To Do', 'High', 'Week 4 — May 19 to May 31');
