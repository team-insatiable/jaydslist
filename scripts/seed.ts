/**
 * Dev seed script — generates SQL for local D1
 * Run: npx tsx scripts/seed.ts | npx wrangler d1 execute jaydslist --local --file /dev/stdin
 *
 * Test accounts (password: Password01):
 *   alice@example.com — woman, non-supporter, has 1 active listing
 *   bob@example.com   — man, supporter, replied to Alice's listing (1 thread exists)
 */

import { promisify } from 'util';
import { scrypt as _scrypt, randomBytes, randomUUID } from 'crypto';

const scryptAsync = promisify(_scrypt);

async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const key = (await scryptAsync(password.normalize('NFKC'), salt, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 1024 * 1024
	})) as Buffer;
	return `${salt}:${key.toString('hex')}`;
}

function sq(s: string | null) {
	if (s === null) return 'NULL';
	return `'${s.replace(/'/g, "''")}'`;
}

const now = Math.floor(Date.now() / 1000);
const nowMs = Date.now();
const expires14 = now + 14 * 24 * 60 * 60;

// ── Dev accounts ───────────────────────────────────────────────────────────────
const BOB_ID = randomUUID(); // bob@example.com — man, supporter
const ALICE_ID = randomUUID(); // alice@example.com — woman, non-supporter

// ── Fake background users ──────────────────────────────────────────────────────
const fakeUsers = [
	{
		id: randomUUID(),
		name: 'Tyler',
		email: 'tyler.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 34,
		lat: 38.7521,
		lng: -121.288,
		fuzzy: 'Roseville area',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Ashley',
		email: 'ashley.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 28,
		lat: 38.4088,
		lng: -121.3716,
		fuzzy: 'Elk Grove area',
		seeking: '["man"]'
	},
	{
		id: randomUUID(),
		name: 'Marcus',
		email: 'marcus.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 41,
		lat: 38.6785,
		lng: -121.176,
		fuzzy: 'Folsom area',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Jordan',
		email: 'jordan.seed@fake.dev',
		identity: 'non_binary',
		physical: 'other',
		age: 31,
		lat: 38.5449,
		lng: -121.7405,
		fuzzy: 'Davis/Woodland area',
		seeking: '["man","woman","non_binary"]'
	},
	{
		id: randomUUID(),
		name: 'Nina',
		email: 'nina.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 35,
		lat: 38.5816,
		lng: -121.4944,
		fuzzy: 'Midtown Sacramento',
		seeking: '["man"]'
	},
	{
		id: randomUUID(),
		name: 'Derek',
		email: 'derek.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 52,
		lat: 38.8966,
		lng: -121.077,
		fuzzy: 'Auburn/Foothill area',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Samantha',
		email: 'samantha.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 29,
		lat: 38.7071,
		lng: -121.281,
		fuzzy: 'Citrus Heights area',
		seeking: '["man","woman"]'
	},
	{
		id: randomUUID(),
		name: 'Alex',
		email: 'alex.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 38,
		lat: 38.5891,
		lng: -121.3024,
		fuzzy: 'Rancho Cordova area',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Brianna',
		email: 'brianna.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 33,
		lat: 37.9577,
		lng: -121.2908,
		fuzzy: 'Stockton area',
		seeking: '["man","woman"]'
	},
	{
		id: randomUUID(),
		name: 'Chris',
		email: 'chris.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 45,
		lat: 38.3566,
		lng: -121.9877,
		fuzzy: 'Vacaville area',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Melissa',
		email: 'melissa.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 27,
		lat: 38.6785,
		lng: -121.7733,
		fuzzy: 'Woodland area',
		seeking: '["man"]'
	},
	{
		id: randomUUID(),
		name: 'Jason',
		email: 'jason.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 36,
		lat: 38.7907,
		lng: -121.2357,
		fuzzy: 'Rocklin area',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Vanessa',
		email: 'vanessa.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 44,
		lat: 38.5816,
		lng: -121.45,
		fuzzy: 'East Sacramento',
		seeking: '["man","woman"]'
	},
	{
		id: randomUUID(),
		name: 'Ryan',
		email: 'ryan.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 39,
		lat: 38.1302,
		lng: -121.2722,
		fuzzy: 'Lodi area',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Stephanie',
		email: 'steph.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 31,
		lat: 38.5802,
		lng: -121.5318,
		fuzzy: 'West Sacramento area',
		seeking: '["man"]'
	},
	{
		id: randomUUID(),
		name: 'Mike',
		email: 'mike.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 48,
		lat: 38.2494,
		lng: -122.04,
		fuzzy: 'Fairfield/Solano area',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Amanda',
		email: 'amanda.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 26,
		lat: 38.7521,
		lng: -121.32,
		fuzzy: 'Roseville/Rocklin area',
		seeking: '["man"]'
	},
	{
		id: randomUUID(),
		name: 'David',
		email: 'david.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 42,
		lat: 38.56,
		lng: -121.48,
		fuzzy: 'Central Sacramento',
		seeking: '["woman"]'
	},
	{
		id: randomUUID(),
		name: 'Lisa',
		email: 'lisa.seed@fake.dev',
		identity: 'woman',
		physical: 'female',
		age: 37,
		lat: 38.67,
		lng: -121.19,
		fuzzy: 'Folsom/El Dorado Hills area',
		seeking: '["man","woman"]'
	},
	{
		id: randomUUID(),
		name: 'Kevin',
		email: 'kevin.seed@fake.dev',
		identity: 'man',
		physical: 'male',
		age: 33,
		lat: 38.42,
		lng: -121.36,
		fuzzy: 'South Sacramento area',
		seeking: '["woman"]'
	}
];

// ── Listings ───────────────────────────────────────────────────────────────────
// Index 0 = Bob's listing, index 1 = Alice's listing (the one Bob replies to)
type ListingDef = {
	userId: string;
	subject: string;
	body: string;
	lookingForIdentity: string;
	lookingForPhysical: string;
	nature: string;
	mood: string;
	availability: string;
	lat: number;
	lng: number;
	fuzzy: string;
	ageMin?: number;
	ageMax?: number;
};

const f = (i: number) => fakeUsers[i % fakeUsers.length];

const raw: Omit<ListingDef, 'userId' | 'lat' | 'lng' | 'fuzzy'>[] = [
	// Index 0 — Bob's listing (man, 47)
	{
		subject: 'Experienced Dom looking for a sub to explore with',
		body: "Married man, very much in an open ENM arrangement. I've been in the lifestyle for over a decade and have a strong foundation in D/s dynamics. I'm patient, communicative, and safety-first. Looking for a woman who is curious about submission or already experienced. We'll go at whatever pace feels right. I want connection first — the dynamic comes after we establish trust. Sacramento area, flexible on schedule.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb","one_time"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 25,
		ageMax: 50
	},
	// Index 1 — Alice's listing (woman, 43) — Bob replies to this one
	{
		subject: 'Hotwife exploring on her own — looking for confident men',
		body: "My husband and I are fully open and this profile is mine alone. I'm 43, take care of myself, and know exactly what I want. Looking for men who are confident, clean, and don't need handholding. I enjoy the build-up as much as the main event. Discretion is important to me. No single women please — I have a girlfriend for that. If you can hold a conversation and aren't in a rush, message me.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["one_time","fwb"]',
		mood: 'coffee_first',
		availability: 'available_weekend',
		ageMin: 30,
		ageMax: 58
	},
	// Fake listings
	{
		subject: 'Switch looking for a like-minded partner in kink',
		body: "I've been in the BDSM community for about five years now. I can go either way — I enjoy dominance and submission depending on chemistry. Looking for someone who has done some self-work around their kink identity and isn't just dipping their toes in for the first time. I'm not your introduction to the lifestyle. Experienced partners only. Rope bondage is my main thing. Shibari specifically.",
		lookingForIdentity: '["woman","non_binary"]',
		lookingForPhysical: '["female","other"]',
		nature: '["fwb"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Couple seeking a third for play — no drama, no strings',
		body: "We're a mid-30s MF couple in the Sacramento area. Fully open, been together eight years, this is our normal. We play together only — no separate arrangements. Looking for a woman who is experienced with couples, communicates well, and has no agenda beyond having fun. We're laid back, non-judgmental, and prioritize everyone's comfort. Chemistry has to be right. Happy to meet for drinks first.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["one_time","fwb"]',
		mood: 'dinner_date',
		availability: 'available_weekend',
		ageMin: 25,
		ageMax: 45
	},
	{
		subject: 'ENM solo female — poly and looking for connections',
		body: "I'm a solo poly woman who has been practicing ethical non-monogamy for six years. I have a couple of established partners and have space for a new connection that could develop organically. Not looking to rush anything. I value emotional intelligence as much as physical chemistry. I'm a whole person with a full life — looking for someone who is too, not someone looking to fill a void.",
		lookingForIdentity: '["man","woman"]',
		lookingForPhysical: '["male","female"]',
		nature: '["dating","fwb"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Sub male seeking a dominant woman — serious inquiry only',
		body: "I've been in the lifestyle for two years as a sub. Looking for a woman who enjoys being in control and wants a consistent arrangement rather than a one-off. I'm reliable, communicative, and responsive. I have a list of interests and limits I'm happy to share after initial conversation. I live in Roseville but travel throughout the valley. Looking for something that develops into a regular dynamic.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 28,
		ageMax: 55
	},
	{
		subject: "Lifestyle couple — swapping or soft swap, let's talk",
		body: "We've been in the swinger lifestyle for three years. Both bi-friendly. We attend local events and are looking to expand our circle of trusted play partners. Prefer established couples who have been together a while and communicate well. Newbies are welcome if you've done your research and have realistic expectations. We do full swap and soft swap depending on comfort level and chemistry.",
		lookingForIdentity: '["woman","man"]',
		lookingForPhysical: '["female","male"]',
		nature: '["one_time","fwb"]',
		mood: 'dinner_date',
		availability: 'available_weekend'
	},
	{
		subject: 'Breeding kink — explicitly consensual, looking for the right woman',
		body: "This is a kink post so let me be direct. I have a breeding kink that's 100% fantasy-forward. In practice I'm responsible and safe — this is about the dynamic and the psychology of it, not actual risk. Looking for a woman who shares this interest or is curious about exploring it. I'm clean, tested, and respectful. Happy to talk through what this looks like before we meet.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["one_time","fwb"]',
		mood: 'netflix_chill',
		availability: 'flexible',
		ageMin: 21,
		ageMax: 42
	},
	{
		subject: 'Voyeur/exhibitionist — looking for someone who gets it',
		body: "I'm into voyeurism and exhibitionism in a very consensual, intentional way. Not creepy, not covert — the opposite. I want someone who enjoys being seen and seeing in return. Could be as simple as a nude beach day or as involved as a planned scene. Open to either gender. I'm in the Davis area and have flexibility on schedule. Let's talk about what this could look like for both of us.",
		lookingForIdentity: '["woman","man","non_binary"]',
		lookingForPhysical: '["female","male","other"]',
		nature: '["one_time","fwb"]',
		mood: 'coffee_first',
		availability: 'available_weekend'
	},
	{
		subject: 'Dominant woman seeking a male sub — disciplined only',
		body: "I've been a practicing Domme for four years. I'm looking for a male sub who has his life in order and comes to this with maturity. I don't have time for men who haven't done the work of understanding what submission actually means. This isn't about me doing the heavy lifting. You bring your headspace, your limits, and your communication skills. I'll bring the rest. Stockton-based.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 25,
		ageMax: 50
	},
	{
		subject: 'Kinky FWB situation wanted — Folsom area',
		body: "I'm a 33-year-old woman looking for a consistent FWB who is open to incorporating kink elements. Nothing extreme — think light bondage, sensory play, role dynamics. I work full time and have my own place. I'm not looking for a relationship but I do want someone I actually like spending time with. Ongoing arrangement preferred over one-and-done. Must be local — I don't drive far for hookups.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb"]',
		mood: 'netflix_chill',
		availability: 'available_weekend',
		ageMin: 28,
		ageMax: 48
	},
	{
		subject: 'Poly man building a network of genuine connections',
		body: "I've been polyamorous for most of my adult life. I currently have one nesting partner who knows I'm here. I'm looking for connections that have the potential to grow — I don't really do casual for its own sake. I want to actually know the people I'm intimate with. Into the kink side of things too but it's not a requirement upfront. Auburn area, willing to travel the valley.",
		lookingForIdentity: '["woman","non_binary"]',
		lookingForPhysical: '["female","other"]',
		nature: '["dating","fwb"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Cuckolding situation — my wife wants to watch me be humiliated',
		body: "My wife and I are exploring cuckolding dynamics and she is very much the driver here. We're looking for a confident, dominant-leaning man who understands the psychology of this kink. She picks. She decides. My role is what she decides it is. If you're interested in being part of a real-life cuckold arrangement with an established couple, reach out with a bit about yourself.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["one_time","fwb"]',
		mood: 'netflix_chill',
		availability: 'flexible',
		ageMin: 28,
		ageMax: 55
	},
	{
		subject: 'Experienced rope top looking for a willing rope bottom',
		body: "I've been doing Shibari for six years and teach occasional workshops. Looking for someone interested in rope bondage — either as a creative/meditative practice or with erotic elements, or both. I have my own suspension rig. Safety is not negotiable. I expect a real conversation before any session. This is a skill-based practice and I take it seriously. Based in Sacramento, studio available.",
		lookingForIdentity: '["woman","non_binary"]',
		lookingForPhysical: '["female","other"]',
		nature: '["fwb","one_time"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Bisexual woman, open marriage, looking for women primarily',
		body: "My husband knows I'm here. I've been exploring my bisexuality for the past two years and I've had a couple of experiences that confirmed this is very much real for me. Looking for a woman — ideally bi or lesbian — who is patient and enjoys building chemistry before jumping into anything. I'm in Citrus Heights. Daytime hours work best for me.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'available_today'
	},
	{
		subject: 'Single man, 48, looking for a woman to explore ENM lifestyle with',
		body: "I've been single for two years and recently started exploring ethical non-monogamy after a long traditional relationship. I'm not looking to jump into anything — I want to understand what this lifestyle looks like before I commit to any label. Looking for a woman who is patient, already established in this world, and willing to help me figure out where I fit. Fairfield area, willing to travel.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["dating","open"]',
		mood: 'dinner_date',
		availability: 'available_weekend',
		ageMin: 30,
		ageMax: 55
	},
	{
		subject: 'Age gap dynamic — younger woman, older man, anyone?',
		body: "I'm 26 and have always been attracted to older men. Not looking for a daddy dynamic specifically — more like the maturity, the stability, the experience that comes with someone significantly older. I'm an adult with my own career and life sorted. This would be a real connection with someone who matches my energy. Sacramento area, flexible schedule.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb","dating"]',
		mood: 'dinner_date',
		availability: 'flexible',
		ageMin: 38,
		ageMax: 60
	},
	{
		subject: 'Swinger looking for couples — Vacaville area',
		body: "Single male, active in the lifestyle, looking to connect with couples. I know the drill — I know what single males bring to the dynamic and I also know the frustrations couples have with single males. I am not that guy. I communicate, I respect the couple's rules, and I take direction from the female half of the couple. References available from lifestyle couples I've played with. Let's talk.",
		lookingForIdentity: '["woman","man"]',
		lookingForPhysical: '["female","male"]',
		nature: '["one_time","fwb"]',
		mood: 'dinner_date',
		availability: 'available_weekend',
		ageMin: 25,
		ageMax: 55
	},
	{
		subject: 'Looking for a play partner with impact kink interest',
		body: "Impact play is my thing — specifically spanking, paddling, and the occasional flogger scene. I have my own equipment and a safe, private space. I'm a top in this context but I'm not rigid about the relationship. Looking for someone who is genuinely into this, not just tolerating it to make something else happen. Elk Grove area. NSA is fine, recurring arrangement preferred.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb","one_time"]',
		mood: 'netflix_chill',
		availability: 'flexible'
	},
	{
		subject: 'ENM-friendly woman looking for a primary partner who gets it',
		body: "I've been solo poly for three years and I'm now open to something more primary-relationship-shaped, as long as it's ENM-compatible. I have connections I'm not walking away from. Looking for someone who is either already in the lifestyle or genuinely open to it — not someone who says they're fine with it and then isn't. Lodi area. Own place, own car, own life.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["dating","fwb"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 30,
		ageMax: 52
	},
	{
		subject: 'Kink-curious couple seeking guidance from experienced folks',
		body: "We're a MF couple in our early 30s who have been together for five years. We're vanilla-ish but increasingly curious about the kink and lifestyle world. Looking to connect with experienced individuals or couples who might be willing to help us explore safely. We're not looking to jump into anything — more of a mentorship vibe at first. West Sacramento area.",
		lookingForIdentity: '["woman","man"]',
		lookingForPhysical: '["female","male"]',
		nature: '["open","fwb"]',
		mood: 'coffee_first',
		availability: 'available_weekend'
	},
	{
		subject: 'Dominant male, structured D/s dynamic preferred',
		body: "I've been a Dom in structured relationships for seven years. What I'm looking for isn't a casual kink hookup — it's an actual D/s dynamic with protocols, rituals, and genuine power exchange. This is a serious lifestyle for me. If that sounds like something you're drawn to and you're ready for what that actually entails, I want to hear from you. Rocklin area.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 23,
		ageMax: 45
	},
	{
		subject: '24/7 sub female seeking a real dynamic, not roleplay',
		body: "I've been in the lifestyle for four years and I'm very clear on what I want. A real, consistent D/s arrangement with someone who takes the responsibility of dominance seriously. I don't want play partners. I want a dynamic. I'm in Roseville, work from home, and have flexibility. Please read this post carefully before reaching out — I can tell if you didn't.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 30,
		ageMax: 55
	},
	{
		subject: 'Swinger couple, bi-friendly, looking for other couples',
		body: "Five years in the lifestyle, bi-friendly on both sides. We've been to Secrets, Colette, and a handful of private parties. Looking to expand our circle of play partners we actually like as people. We're not interested in strangers at a club anymore — we want people we can have dinner with and then see where the night goes. Sacramento to Roseville corridor preferred.",
		lookingForIdentity: '["woman","man"]',
		lookingForPhysical: '["female","male"]',
		nature: '["fwb","one_time"]',
		mood: 'dinner_date',
		availability: 'available_weekend'
	},
	{
		subject: 'Woman seeking woman — kink-friendly, queer space',
		body: "I'm a bisexual woman looking for connections with other women. I'm kink-adjacent — not heavy lifestyle, but I'm into power dynamics in a softer way. I value communication, queer-affirming spaces, and women who know themselves. I'm in the Sacramento midtown area. Open to NSA or something more depending on chemistry.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb","dating","one_time"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Masochist looking for a sadist who takes this seriously',
		body: "Pain play is where I live. Looking for an experienced sadist — someone who knows the difference between causing pain and causing harm, and gets genuine satisfaction from one and not the other. I'm not a beginner. I have established limits and a history of responsible play. Interested in a consistent partner, not one-off scenes. Woodland area.",
		lookingForIdentity: '["woman","man"]',
		lookingForPhysical: '["female","male"]',
		nature: '["fwb"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Lifestyle-curious single male, Folsom area',
		body: "I've been reading about the ENM and swinger lifestyle for about a year and I'm finally ready to put myself out there. I'm not looking to immediately dive into group situations — I'd rather build actual connections first. I'm a normal guy with a professional job and a private life. Looking for a woman or couple who might be patient with someone who is new but serious.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["dating","open"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Hotwife and husband seeking a bull — serious only',
		body: "We've been in the hotwife lifestyle for two years. Looking for a confident, dominant-leaning man for ongoing arrangements with my wife. I'm present in a cuckold-observer role. Must be comfortable with that dynamic. We have high standards and a very clear picture of what we're looking for. Don't message unless you've actually read this and understand what we're describing.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb","one_time"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 28,
		ageMax: 55
	},
	{
		subject: 'Age gap — older woman seeking younger man',
		body: "I'm 44 and I'm very much done pretending I'm looking for something I'm not. I want a younger man who is confident, energetic, and not intimidated by a woman who knows herself. This won't be a typical arrangement — I don't chase, I don't beg, and I don't do games. If you're looking for an older woman who has her life together and knows what she wants in bed, here I am.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb","one_time"]',
		mood: 'netflix_chill',
		availability: 'flexible',
		ageMin: 24,
		ageMax: 38
	},
	{
		subject: 'ENM couple looking to build community, not just play',
		body: "We're an established ENM couple who is honestly more interested in building real friendships in this world than just finding play partners. If the friendship leads to play, great. If it doesn't, we've still made connections we value. We host occasional small social gatherings and are looking for people who want to be part of something ongoing. Rancho Cordova area.",
		lookingForIdentity: '["woman","man","non_binary"]',
		lookingForPhysical: '["female","male","other"]',
		nature: '["platonic","fwb","dating"]',
		mood: 'dinner_date',
		availability: 'available_weekend'
	},
	{
		subject: 'Femme sub looking for a gentle Dom — not the leather and chains type',
		body: "I know BDSM looks different for everyone. For me, it's soft dominance — guiding, controlling the pace, taking charge without aggression. I'm not looking for a dungeon master. I'm looking for someone confident and emotionally intelligent who naturally gravitates toward being in charge without needing it to look like a movie scene. Citrus Heights area.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 28,
		ageMax: 52
	},
	{
		subject: 'NSA kink hookup — just looking for one good afternoon',
		body: "Not looking for anything ongoing. Just want a consensual kink encounter with someone I connect with. I'm into light BDSM, power exchange, the usual stuff. I have my own place in Sacramento. Looking for someone who can communicate clearly, show up when they say they will, and leave drama at the door. I work weird hours so daytime often works best.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["one_time"]',
		mood: 'ready_now',
		availability: 'available_today',
		ageMin: 21,
		ageMax: 50
	},
	{
		subject: 'Queer poly person looking for connections outside traditional dating',
		body: "I'm genderqueer, poly, and pretty done with apps designed for monogamous straight people. Looking for connections that don't fit into a box — people who are actually interesting, think about their lives, and bring something real to a connection. Kink-friendly but not required. I'm in the Davis area and spend time in Sacramento frequently.",
		lookingForIdentity: '["non_binary","woman","man"]',
		lookingForPhysical: '["other","female","male"]',
		nature: '["dating","fwb","platonic"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: "Consistent kink partner wanted — let's build something",
		body: "I've tried the one-off scene approach and it's not for me. I want someone I can build a consistent play dynamic with over time — where we know each other's bodies, limits, and preferences well. I'm a switch leaning Dom. I like structure in scenes but I'm flexible on the relationship container. Elk Grove area, own place.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 24,
		ageMax: 48
	},
	{
		subject: 'Kink educator and community member — looking to connect',
		body: "I've been in the Sacramento kink community for eight years and have facilitated workshops on consent and communication. I'm not here to educate you — I'm here to find a play partner who doesn't need educating. Looking for someone experienced, thoughtful, and genuinely curious about another person. I attend local munches and events regularly. References available.",
		lookingForIdentity: '["woman","non_binary"]',
		lookingForPhysical: '["female","other"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'MF couple — she runs the show, looking for our next adventure',
		body: "She picks. She always picks. We've been doing this for four years and the dynamic in our couple is that my wife is the one who decides everything about our lifestyle activities. I support and participate. She dominates. We're looking for a woman for her to explore with, or a man for a cuckold situation. Either way — if you're interested, you're talking to her, not me.",
		lookingForIdentity: '["woman","man"]',
		lookingForPhysical: '["female","male"]',
		nature: '["one_time","fwb"]',
		mood: 'coffee_first',
		availability: 'available_weekend'
	},
	{
		subject: 'New to ENM, husband is supportive, looking for my own experiences',
		body: "I'm a 37-year-old woman who has always been curious and finally have a partner who supports exploration. I'm going slowly and I'm not looking to be rushed. Looking for patient, communicative people who understand what it means to navigate this for the first time. I'm in the Folsom area. Would love to talk first and see if there's genuine compatibility.",
		lookingForIdentity: '["woman","man"]',
		lookingForPhysical: '["female","male"]',
		nature: '["dating","open"]',
		mood: 'coffee_first',
		availability: 'available_weekend'
	},
	{
		subject: 'Daddy Dom type — not about age, about energy',
		body: "When I say Daddy Dom I mean a specific kind of dominance — nurturing, protective, directive without being harsh. I'm 42 and I carry that energy naturally. Looking for a woman who is drawn to that kind of dynamic. This can be completely platonic in its container if the chemistry doesn't go further — the dynamic stands on its own. Rocklin area, own home, very private.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 21,
		ageMax: 45
	},
	{
		subject: 'Experienced sub woman — private, discreet, for the right Dom',
		body: "I have a professional life that requires discretion and I bring that expectation to lifestyle connections as well. I've been submissive in D/s contexts for six years. I know what I bring to a dynamic and I have high standards for what I receive. I'm in Sacramento and I don't broadcast my lifestyle. If you are similarly situated and understand that, we might get along well.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 35,
		ageMax: 60
	},
	{
		subject: 'Outdoor exhibitionist — anyone else into this?',
		body: 'This is niche, I know. I love outdoor situations — hiking trails, camping, that kind of context. I find the combination of nature and the risk of being seen genuinely exciting in a way indoor situations never match. Looking for someone who shares this specific interest. Fully consensual — no involving non-consenting parties, obviously. Foothill area, I know good spots.',
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb","one_time"]',
		mood: 'netflix_chill',
		availability: 'available_weekend'
	},
	{
		subject: 'Looking for a local kink community — and maybe a partner',
		body: "I'm relatively new to Sacramento — moved here eight months ago. I'm an experienced kinkster looking to find my people here. The lifestyle community in Sacramento is supposed to be solid and I'd love to connect with folks who know the scene. Looking for connections that could become friendships, play partnerships, or both. Hit me up if you're connected to the local scene.",
		lookingForIdentity: '["woman","man","non_binary"]',
		lookingForPhysical: '["female","male","other"]',
		nature: '["platonic","fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Experienced lifestyle couple — Yuba City area',
		body: "We're a MF couple in our 40s based in Yuba City, willing to travel to Sacramento. Been in the lifestyle eight years. Looking for other established couples or single women. We play well with others — communication and humor are important to us. We don't take ourselves too seriously but we do take consent and safety seriously. Reach out if you're also in the northern valley.",
		lookingForIdentity: '["woman","man"]',
		lookingForPhysical: '["female","male"]',
		nature: '["fwb","one_time"]',
		mood: 'dinner_date',
		availability: 'available_weekend'
	},
	{
		subject: 'Pet play — looking for someone who gets the dynamic',
		body: "Pet play is my kink and I understand that's not everyone's scene. I'm an experienced kitty looking for a handler who actually understands the headspace involved. This isn't just about costumes. I'm looking for someone who is drawn to the caretaker role naturally. I'm in Sacramento and I have experience with multiple long-term pet/handler relationships.",
		lookingForIdentity: '["man","woman"]',
		lookingForPhysical: '["male","female"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Poly man, Sacramento, looking for connections that stick',
		body: "I've been polyamorous my whole adult life. I have two long-term partners and I'm looking for a third connection that has the potential to develop into something meaningful. I'm not interested in maintaining a roster — I'm interested in depth. I work in tech, have my own place in midtown, and spend a lot of time at coffeeshops and live music venues. I'm a real person with a real life.",
		lookingForIdentity: '["woman","non_binary"]',
		lookingForPhysical: '["female","other"]',
		nature: '["dating","fwb"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Single female, impact and restraint, looking for reliable top',
		body: "I'm into impact play and restraint — I've explored both in past dynamics and I know it's what I want. Looking for a reliable top who doesn't ghost, doesn't flake, and shows up when they say they will. That's honestly the hardest part to find. I'm in West Sacramento, work Tuesday through Saturday, and have evenings free most weeks.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb"]',
		mood: 'netflix_chill',
		availability: 'flexible',
		ageMin: 28,
		ageMax: 52
	},
	{
		subject: 'Munch-going kinkster looking to connect offline too',
		body: "I attend the Sacramento munch regularly and I'm looking to build connections that extend beyond the event. I'm a Dom-leaning switch with five years in the community. Looking for someone who is already community-connected or interested in becoming so. Not into completely private arrangements that exist in isolation from any community context.",
		lookingForIdentity: '["woman","non_binary"]',
		lookingForPhysical: '["female","other"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'available_weekend'
	},
	{
		subject: 'Cuckcake available — looking for the right couple',
		body: "I'm a woman who genuinely enjoys being the third in a cuckold arrangement. I understand this is a specific dynamic and I've participated in it before. I enjoy the power I hold in this context and I take that responsibility seriously. Looking for an established couple who has been doing this a while and has their communication dialed in. Lincoln area.",
		lookingForIdentity: '["man","woman"]',
		lookingForPhysical: '["male","female"]',
		nature: '["fwb","one_time"]',
		mood: 'coffee_first',
		availability: 'flexible'
	},
	{
		subject: 'Experienced Top seeks a curious mind and willing spirit',
		body: "Eight years as a Top across various kink disciplines. I'm not looking for the most experienced sub or the most extreme scene — I'm looking for someone genuinely curious, communicative, and present. Some of my best dynamics have been with people newer to this who approached it thoughtfully. Placerville area but I come down to Sacramento regularly.",
		lookingForIdentity: '["woman"]',
		lookingForPhysical: '["female"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 22,
		ageMax: 50
	},
	{
		subject: 'Kinky introvert looking for one-on-one connection',
		body: "I'm not a party person. I don't do clubs or group situations — that's not where I thrive. I'm looking for a one-on-one connection with someone I genuinely like who happens to share my kink interests. I'm into role dynamics, soft dominance, and intimacy-forward encounters. I'm in the Marysville/Yuba City area but drive to Sacramento often. Patient and communicative.",
		lookingForIdentity: '["man"]',
		lookingForPhysical: '["male"]',
		nature: '["fwb","dating"]',
		mood: 'coffee_first',
		availability: 'flexible',
		ageMin: 30,
		ageMax: 55
	},
	{
		subject: 'Open relationship, looking for ongoing kink connection',
		body: "My partner and I are open — we both date and play independently. I'm looking for an ongoing kink connection with someone local. I'm into bondage, sensation play, and D/s elements. I have my own space and schedule flexibility. I value consistency and communication above almost everything else. Don't message me with \"hi\" and nothing else — I need to see that you can put together a sentence.",
		lookingForIdentity: '["woman","non_binary"]',
		lookingForPhysical: '["female","other"]',
		nature: '["fwb"]',
		mood: 'coffee_first',
		availability: 'flexible'
	}
];

// Assign users to listing defs
// Index 0 = Bob, index 1 = Alice, rest cycle through fake users
const listingAssignments: ListingDef[] = raw.map((r, i) => {
	let userId: string;
	let lat: number;
	let lng: number;
	let fuzzy: string;

	if (i === 0) {
		userId = BOB_ID;
		lat = 38.5816;
		lng = -121.4944;
		fuzzy = 'Central Sacramento';
	} else if (i === 1) {
		userId = ALICE_ID;
		lat = 38.5816;
		lng = -121.4944;
		fuzzy = 'Central Sacramento';
	} else {
		const fake = f(i - 2);
		userId = fake.id;
		lat = fake.lat + (Math.random() - 0.5) * 0.02;
		lng = fake.lng + (Math.random() - 0.5) * 0.02;
		fuzzy = fake.fuzzy;
	}

	return { ...r, userId, lat, lng, fuzzy };
});

// ── SQL generation ────────────────────────────────────────────────────────────

async function main() {
	const pw = await hashPassword('Password01');

	const lines: string[] = ['-- Jaydslist dev seed', 'PRAGMA foreign_keys = OFF;', ''];

	// Better Auth users
	const insertUser = (id: string, name: string, email: string) =>
		`INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (${sq(id)}, ${sq(name)}, ${sq(email)}, 1, ${nowMs}, ${nowMs});`;

	lines.push('-- Users');
	lines.push(insertUser(BOB_ID, 'Bob', 'bob@example.com'));
	lines.push(insertUser(ALICE_ID, 'Alice', 'alice@example.com'));
	for (const u of fakeUsers) lines.push(insertUser(u.id, u.name, u.email));
	lines.push('');

	// For dev accounts: upsert password using a subquery so it works whether or not
	// the user was registered via the app (different user ID) or via this seed.
	const upsertAccount = (email: string) =>
		`INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) SELECT ${sq(randomUUID())}, ${sq(email)}, 'credential', id, ${sq(pw)}, ${nowMs}, ${nowMs} FROM user WHERE email = ${sq(email)};`;

	lines.push('-- Accounts');
	lines.push(upsertAccount('bob@example.com'));
	lines.push(upsertAccount('alice@example.com'));
	lines.push('');

	// User profiles
	const insertProfile = (
		id: string,
		identity: string,
		physical: string,
		age: number,
		lat: number,
		lng: number,
		_fuzzy: string,
		seeking: string,
		alias: string,
		trustTier = 'established',
		isSupporter = false,
		dob?: number
	) => {
		const dobVal = dob ?? now - age * 365.25 * 24 * 3600;
		return `INSERT OR IGNORE INTO user_profiles (id, identity, physical_type, age, date_of_birth, lat, lng, seeking_identity, phone_verified, trust_tier, is_supporter, alias, status, created_at, location_updated_at) VALUES (${sq(id)}, ${sq(identity)}, ${sq(physical)}, ${age}, ${Math.floor(dobVal)}, ${lat}, ${lng}, ${sq(seeking)}, 1, ${sq(trustTier)}, ${isSupporter ? 1 : 0}, ${sq(alias)}, 'active', ${now}, ${now});`;
	};

	lines.push('-- User profiles');
	// Bob: man, 47, supporter, trusted
	lines.push(
		insertProfile(
			BOB_ID,
			'man',
			'male',
			47,
			38.5816,
			-121.4944,
			'Central Sacramento',
			'["woman"]',
			'Bob',
			'trusted',
			true
		)
	);
	// Alice: woman, 43, non-supporter, trusted
	lines.push(
		insertProfile(
			ALICE_ID,
			'woman',
			'female',
			43,
			38.5816,
			-121.4944,
			'Central Sacramento',
			'["man"]',
			'Alice',
			'trusted',
			false
		)
	);
	const fakeTiers = [
		'new',
		'new',
		'new',
		'new',
		'new',
		'new',
		'new',
		'new',
		'established',
		'established',
		'established',
		'established',
		'established',
		'established',
		'trusted',
		'trusted',
		'trusted',
		'trusted',
		'new',
		'new'
	] as const;
	for (const [i, u] of fakeUsers.entries()) {
		lines.push(
			insertProfile(
				u.id,
				u.identity,
				u.physical,
				u.age,
				u.lat,
				u.lng,
				u.fuzzy,
				u.seeking,
				u.name,
				fakeTiers[i]
			)
		);
	}
	lines.push('');

	// Listings — capture Alice's listing ID (index 1) for the thread
	lines.push('-- Listings');
	let aliceListingId: string | null = null;
	for (const [i, l] of listingAssignments.entries()) {
		const id = randomUUID();
		if (i === 1) aliceListingId = id;
		const bumpedAt = now - Math.floor(Math.random() * 7 * 24 * 3600);
		const ageMinVal = l.ageMin ? l.ageMin.toString() : null;
		const ageMaxVal = l.ageMax ? l.ageMax.toString() : null;

		lines.push(
			`INSERT OR IGNORE INTO listings (id, user_id, category, subject, body, status, looking_for_identity, looking_for_physical, nature_of_connection, mood, availability, lat, lng, fuzzy_location, expires_at, last_bumped_at, age_range_min, age_range_max, created_at) VALUES (${sq(id)}, ${sq(l.userId)}, 'casual_encounters', ${sq(l.subject)}, ${sq(l.body)}, 'active', ${sq(l.lookingForIdentity)}, ${sq(l.lookingForPhysical)}, ${sq(l.nature)}, ${sq(l.mood)}, ${sq(l.availability)}, ${l.lat}, ${l.lng}, ${sq(l.fuzzy)}, ${expires14}, ${bumpedAt}, ${ageMinVal ? ageMinVal : 'NULL'}, ${ageMaxVal ? ageMaxVal : 'NULL'}, ${bumpedAt});`
		);
	}
	lines.push('');

	// Thread: Bob replied to Alice's listing
	lines.push("-- Thread (Bob replied to Alice's listing)");
	const threadId = randomUUID();
	const threadCreatedAt = now - 3600; // 1 hour ago
	lines.push(
		`INSERT OR IGNORE INTO conversation_threads (id, listing_id, initiator_id, poster_id, status, acknowledged_requirements, created_at, last_activity_at) VALUES (${sq(threadId)}, ${sq(aliceListingId!)}, ${sq(BOB_ID)}, ${sq(ALICE_ID)}, 'open', '[]', ${threadCreatedAt}, ${threadCreatedAt + 600});`
	);
	lines.push('');

	// Messages in the thread
	lines.push('-- Messages');
	const msg1At = threadCreatedAt;
	const msg2At = threadCreatedAt + 600; // Alice replied 10 minutes later
	lines.push(
		`INSERT OR IGNORE INTO messages (id, thread_id, sender_id, body, scan_status, sent_at) VALUES (${sq(randomUUID())}, ${sq(threadId)}, ${sq(BOB_ID)}, ${sq("Hi — I came across your listing and thought there might be genuine compatibility here. I've been in the ENM lifestyle for over a decade and I know what I'm looking for. Your post stood out because it's direct and you clearly know yourself. I'd love to start with a coffee conversation if you're open to it. No rush, no pressure.")}, 'passed', ${msg1At});`
	);
	lines.push(
		`INSERT OR IGNORE INTO messages (id, thread_id, sender_id, body, scan_status, sent_at) VALUES (${sq(randomUUID())}, ${sq(threadId)}, ${sq(ALICE_ID)}, ${sq('Thanks for reaching out — your message is actually thoughtful which is more than I can say for most. Your profile looks genuine. Coffee works for me. What part of Sacramento are you based in and when are you generally free?')}, 'passed', ${msg2At});`
	);
	lines.push('');

	lines.push('PRAGMA foreign_keys = ON;');

	console.log(lines.join('\n'));
}

main().catch(console.error);
