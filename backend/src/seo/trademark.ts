import { TLDS } from "../scanners/domain.js";
import { ctaBlock, esc, renderSeoPage, seoSlug } from "./shell.js";
import type { SeoCtx, SeoDoc } from "./shell.js";

/**
 * The trademark cluster — one page per Nice class at /trademark-class/<n>.html,
 * plus the hub at /trademark-class/index.html.
 *
 * This is the question a founder asks immediately after "is the domain free":
 * which of the 45 classes is my business in, and does filing one of them cover
 * the rest. The domain cluster already links here — seo/domains.ts points at
 * /trademark-class/ from all fourteen of its pages — so the hub is not optional
 * decoration, it is the target of links that have already shipped.
 *
 * Where the data comes from, and what that costs us. Unlike every other
 * cluster on this site, nothing here is computed by one of our engines: the
 * Nice Classification is a WIPO document and the class headings below are
 * transcribed from it. That makes this the one file where the no-invented-facts
 * rule has to be enforced by hand rather than by an import, so it is enforced
 * in three ways. Each heading carries a `quoted` flag, and a class whose
 * official wording we could not verify against the current edition prints our
 * own scope summary under an honest label instead of a quotation. No filing
 * fee appears anywhere — the Registry sets them, they change, and we have no
 * verified source. And no page claims to know what is registered: the register
 * is at IP India, its public search is free, and a static file built last
 * Tuesday cannot answer a question about today's register.
 *
 * The judgements — what actually files in a class, what people wrongly file
 * there, which classes get filed together — are ours, they are labelled as
 * ours, and every page carries the note that they are general information
 * about the classification system rather than legal advice.
 */

/**
 * SOURCE — the Nice Classification (NCL), published by WIPO, 11th edition.
 * The class headings in `heading` are transcribed from that published list.
 *
 * Two things a reader should know and the pages say out loud. WIPO revises the
 * headings between editions and between versions of an edition, so a heading is
 * a description of the class rather than the closed list of what falls in it —
 * the Registry's own list governs a filing. And where the wording of a heading
 * was materially reworded between recent editions and we could not verify which
 * text is current, `quoted` is false: the page then prints our plain-English
 * scope under "What class N covers" and never presents our sentence as WIPO's.
 * Classes 32, 34 and 35 are flagged that way today, and the flag is per class
 * rather than a footnote so a reader can see which sentence is whose.
 *
 * `plain`, `examples`, `notHere`, `coFile` and `faqs` are entirely ours.
 */

type Side = "goods" | "services";

interface CoFile {
  /** The companion class. Must exist in NICE_CLASSES or the link is dropped. */
  n: number;
  /** Why the two get filed together. No reason, no row — see isPublishable. */
  why: string;
}

interface NotHere {
  what: string;
  /** Where it goes instead. Rendered as links to those class pages. */
  goesIn: number[];
}

interface Faq {
  q: string;
  a: string;
}

interface NiceClass {
  n: number;
  /** The class heading. Quoted from NCL 11 when `quoted`; ours when not. */
  heading: string;
  quoted: boolean;
  /** Four or five words. Used in the 45-row index table every page carries. */
  short: string;
  /** Grouping label, used for the "rest of the family" links. */
  family: string;
  /** What a founder actually files here, in plain English. Ours. */
  plain: string;
  /** Businesses that file here. Concrete enough to recognise yourself in. */
  examples: string[];
  /** The confusions — what gets wrongly filed here, and where it belongs. */
  notHere: NotHere[];
  coFile: CoFile[];
  faqs: Faq[];
}

/**
 * RULE 2 THRESHOLD — a class publishes only when it carries, besides its
 * heading: a plain-English scope, at least four concrete businesses that file
 * in it, at least two things that do not belong in it with the class they
 * belong in instead, at least two companion classes each with a stated reason,
 * and at least one question specific to the class.
 *
 * The threshold is a completeness test rather than a count because no corpus
 * feeds this cluster — all 45 classes exist whether or not anybody has thought
 * about them, and a class number plus a heading plus the shared 45-row index
 * table is exactly the doorway page the rule exists to prevent. Forty-five of
 * those would be a penalty across the whole domain, and the domain carries 537
 * name pages that earn their keep. So a class gets a page when somebody has
 * actually worked out what files in it and what does not.
 *
 * All 45 clear it, so the cluster emits 45 class pages today, plus the hub.
 * A class added or thinned below the bar disappears from the cluster and from
 * every sibling's links in the same build, rather than shipping as a stub.
 */
function isPublishable(c: NiceClass): boolean {
  return (
    c.plain.length > 0 &&
    c.examples.length >= 4 &&
    c.notHere.length >= 2 &&
    c.coFile.length >= 2 &&
    c.faqs.length >= 1
  );
}

const NICE_CLASSES: NiceClass[] = [
  {
    n: 1,
    heading:
      "Chemicals for use in industry, science and photography, as well as in agriculture, horticulture and forestry; unprocessed artificial resins, unprocessed plastics; fire extinguishing and fire prevention compositions; tempering and soldering preparations; substances for tanning animal skins and hides; adhesives for use in industry; putties and other paste fillers; compost, manures, fertilizers; biological preparations for use in industry and science.",
    quoted: true,
    short: "Industrial and agricultural chemicals",
    family: "Chemicals and materials",
    plain:
      "Chemicals sold to somebody who will use them to make something else — fertilisers, industrial adhesives, unprocessed resins and plastics, lab reagents. The test is that the chemical is an input rather than a finished product for the person buying it.",
    examples: [
      "A fertiliser manufacturer selling urea and NPK blends to farmers",
      "An adhesive maker supplying plywood and packaging factories",
      "An agri-input brand selling soil conditioners and bio-fertilisers",
      "A water-treatment chemicals supplier to textile dyeing units",
      "A laboratory reagent and industrial gas supplier",
    ],
    notHere: [
      { what: "Pesticides, fungicides and herbicides", goesIn: [5] },
      { what: "Paints, varnishes and colourants for surfaces", goesIn: [2] },
      { what: "Cleaning and scouring preparations for household use", goesIn: [3] },
      { what: "Fire-extinguishing apparatus — the cylinder, not the compound", goesIn: [9] },
    ],
    coFile: [
      {
        n: 5,
        why: "Agri-inputs split across the two: fertilisers and compost are named in class 1, while preparations for destroying vermin, fungicides and herbicides are named in class 5. A brand selling both needs both.",
      },
      {
        n: 31,
        why: "Seed, grain and raw agricultural produce sit in class 31, and most agri-input brands eventually sell seed under the same name.",
      },
      {
        n: 35,
        why: "The dealer network or online store that distributes the chemicals is a retail service, not a chemical.",
      },
    ],
    faqs: [
      {
        q: "Is a fertiliser brand class 1 or class 5?",
        a: "Compost, manures and fertilizers are named in the class 1 heading. Fungicides, herbicides and preparations for destroying vermin are named in the class 5 heading. A company selling both files both, because a registration in one gives it nothing in the other.",
      },
      {
        q: "Where does an industrial adhesive go, and where does a glue stick?",
        a: "Adhesives for use in industry are named in class 1; adhesives for stationery or household purposes are named in class 16. The same substance can sit in two classes depending on who it is sold to, which is one of the clearer illustrations of how the classification works on use rather than on chemistry.",
      },
    ],
  },
  {
    n: 2,
    heading:
      "Paints, varnishes, lacquers; preservatives against rust and against deterioration of wood; colorants, dyes; inks for printing, marking and engraving; raw natural resins; metals in foil and powder form for use in painting, decorating, printing and art.",
    quoted: true,
    short: "Paints, dyes and printing inks",
    family: "Chemicals and materials",
    plain:
      "Anything whose job is to colour or coat a surface — house paint, wood preservative, textile dye, printing ink, artists' colours. The colour sits here; the brush, the wall and the painter do not.",
    examples: [
      "A decorative paint brand selling emulsions and enamels through hardware dealers",
      "A wood-finish and preservative maker supplying furniture workshops",
      "A dye house selling reactive and vat dyes to textile mills",
      "A printing-ink manufacturer supplying offset and flexo presses",
      "An artists' colour brand selling acrylics and poster colours",
    ],
    notHere: [
      { what: "Cosmetic colour — nail polish, hair colour, make-up", goesIn: [3] },
      { what: "Paintbrushes and artists' materials", goesIn: [16] },
      { what: "The contractor who applies the paint", goesIn: [37] },
      { what: "Writing ink and stationery", goesIn: [16] },
    ],
    coFile: [
      {
        n: 1,
        why: "The resins, solvents and industrial adhesives a coatings business also sells are class 1, and the two ranges usually travel under one name.",
      },
      {
        n: 19,
        why: "Paint brands extend into putties, waterproofing compounds and cement-based products, which are non-metal building materials.",
      },
      {
        n: 37,
        why: "Painting, coating and waterproofing carried out for a customer is a service — the same brand on a tin and on a van needs both classes.",
      },
    ],
    faqs: [
      {
        q: "Is nail polish class 2?",
        a: "No. Class 2 colourants colour surfaces and materials; cosmetic colour applied to a person is non-medicated cosmetics, class 3. The word 'colour' does not decide the class — what is being coloured does.",
      },
      {
        q: "My paint brand also has a painting service. Is that covered?",
        a: "Not by class 2. Goods and the services performed with them are always separate: the tin is class 2, the painting contract is class 37, and a registration in one is no registration in the other.",
      },
    ],
  },
  {
    n: 3,
    heading:
      "Non-medicated cosmetics and toiletry preparations; non-medicated dentifrices; perfumery, essential oils; bleaching preparations and other substances for laundry use; cleaning, polishing, scouring and abrasive preparations.",
    quoted: true,
    short: "Cosmetics, toiletries and cleaning preparations",
    family: "Personal care",
    plain:
      "Preparations applied to a body or a surface to clean, scent or beautify it, as long as they carry no medical claim — soap, shampoo, hair oil, perfume, make-up, toothpaste, detergent, floor cleaner.",
    examples: [
      "A D2C skincare brand selling serums and cleansers",
      "An ayurvedic hair-oil brand sold through kirana distribution",
      "A perfume and attar house",
      "A home-care brand selling floor cleaner and dishwash",
      "A salon's own-label shampoo and conditioner range",
    ],
    notHere: [
      { what: "A cream or treatment sold for a medical purpose", goesIn: [5] },
      { what: "The salon or clinic that applies it", goesIn: [44] },
      { what: "Selling other brands' cosmetics in a shop or on a marketplace", goesIn: [35] },
      { what: "Toothbrushes, combs and sponges", goesIn: [21] },
    ],
    coFile: [
      {
        n: 5,
        why: "The line between a non-medicated cosmetic and a preparation sold for a medical purpose runs through the middle of most Indian personal-care ranges, so brands routinely file both sides of it.",
      },
      {
        n: 21,
        why: "The applicators, brushes, combs and containers the range ships with are class 21 goods.",
      },
      {
        n: 35,
        why: "A D2C brand that becomes a shop — stocking other labels, running a marketplace — is doing retail, which class 3 does not touch.",
      },
      {
        n: 44,
        why: "The salon or spa under the same name is a class 44 service; the bottle on its shelf is class 3.",
      },
    ],
    faqs: [
      {
        q: "My ayurvedic cream: class 3 or class 5?",
        a: "The headings draw the line at the claim. Class 3 is named for non-medicated cosmetics and toiletry preparations; class 5 is named for pharmaceutical, medical and veterinary preparations. A cream positioned as beauty care reads as class 3, one positioned as treatment reads as class 5, and a range doing both is normally filed in both. Where exactly your product sits is a question for an attorney, not for a website.",
      },
      {
        q: "I make soap and I also run a salon under the same name.",
        a: "Two classes: 3 for the soap, 44 for the salon. This is the commonest gap we see in personal care — the brand is registered on the bottle and left open on the signboard.",
      },
    ],
  },
  {
    n: 4,
    heading:
      "Industrial oils and greases, wax; lubricants; dust absorbing, wetting and binding compositions; fuels and illuminants; candles and wicks for lighting.",
    quoted: true,
    short: "Fuels, lubricants and candles",
    family: "Chemicals and materials",
    plain:
      "Things burnt for energy or light, and things used to reduce friction — engine oil, grease, industrial lubricants, fuels, wax and candles.",
    examples: [
      "A lubricant brand selling engine oil through garages and dealers",
      "An industrial grease and cutting-fluid manufacturer",
      "A biomass pellet or biodiesel producer",
      "A scented and decorative candle brand",
      "A wax supplier to the cosmetics and packaging trades",
    ],
    notHere: [
      { what: "Edible oils and cooking fats", goesIn: [29] },
      { what: "Essential oils and fragrance applied to a person", goesIn: [3] },
      { what: "Lamps, lighting apparatus and heaters", goesIn: [11] },
      { what: "The service centre that changes the oil", goesIn: [37] },
    ],
    coFile: [
      {
        n: 1,
        why: "Additives, coolants and the chemicals sold beside a lubricant range are class 1.",
      },
      {
        n: 35,
        why: "Lubricants live or die on a dealer network, and running that network is retail rather than manufacture.",
      },
      {
        n: 37,
        why: "Servicing, lubrication and maintenance done for a customer is a class 37 service under the same brand.",
      },
    ],
    faqs: [
      {
        q: "Is a scented candle class 4 or class 3?",
        a: "Candles and wicks for lighting are named in class 4. The fragrance oil is class 3. Home-fragrance brands that sell candles, reed diffusers and room sprays usually end up in both, because the range crosses the line the classification draws.",
      },
      {
        q: "Where does an EV charging business file?",
        a: "Not class 4. Fuels are goods; supplying electricity as a service is not, and the charger itself is apparatus in class 9. Class 4 is for the litre in the drum, not the current in the cable.",
      },
    ],
  },
  {
    n: 5,
    heading:
      "Pharmaceuticals, medical and veterinary preparations; sanitary preparations for medical purposes; dietetic food and substances adapted for medical or veterinary use, food for babies; dietary supplements for humans and animals; plasters, materials for dressings; material for stopping teeth, dental wax; disinfectants; preparations for destroying vermin; fungicides, herbicides.",
    quoted: true,
    short: "Pharmaceuticals and medical preparations",
    family: "Pharma and medical goods",
    plain:
      "Anything taken or applied for health — medicines, ayurvedic preparations, supplements, baby food, sanitary products, dressings, disinfectants — and, at the far end of the same heading, pesticides and weedkillers.",
    examples: [
      "A generic pharmaceutical manufacturer",
      "A D2C nutraceutical and supplement brand",
      "An ayurvedic or homoeopathic medicine maker",
      "A sanitary napkin and intimate-hygiene brand",
      "A baby-formula or medical-nutrition brand",
      "A pest-control chemicals manufacturer",
    ],
    notHere: [
      { what: "Non-medicated cosmetics and toiletries", goesIn: [3] },
      { what: "Instruments and devices used on a body", goesIn: [10] },
      { what: "The clinic, the doctor and the diagnostic lab", goesIn: [44] },
      { what: "The pharmacy counter or the online chemist", goesIn: [35] },
      { what: "Ordinary food and drink with no medical positioning", goesIn: [29, 30, 32] },
    ],
    coFile: [
      {
        n: 3,
        why: "Most Indian health-and-beauty ranges straddle medicated and non-medicated, and the classification splits them at exactly that seam.",
      },
      {
        n: 10,
        why: "A preparation and the device that delivers it — inhaler, syringe, test kit — are different classes under one brand.",
      },
      {
        n: 35,
        why: "Retail pharmacy, e-pharmacy and distribution are services in class 35; the medicine on the shelf is class 5.",
      },
      {
        n: 44,
        why: "A clinic, teleconsult or wellness service under the same name is class 44.",
      },
    ],
    faqs: [
      {
        q: "Which class is a health supplement?",
        a: "Dietary supplements for humans and animals are named in the class 5 heading. A food or drink sold without a dietary or medical positioning sits in class 29, 30 or 32 instead, and wellness brands that sell both a protein powder and a snack bar commonly file across the two sides.",
      },
      {
        q: "Is a pharmacy chain class 5?",
        a: "The medicines are class 5. Running the shop, the app and the delivery of other manufacturers' products is retail, class 35. A pharmacy that files only class 5 has protected a name it does not put on any product.",
      },
    ],
  },
  {
    n: 6,
    heading:
      "Common metals and their alloys, ores; metal materials for building and construction; transportable buildings of metal; non-electric cables and wires of common metal; small items of metal hardware; metal containers for storage or transport; safes.",
    quoted: true,
    short: "Common metals and metal hardware",
    family: "Metals and hardware",
    plain:
      "Metal as a material and the ordinary things made from it — steel sections and TMT bars, metal doors and window frames, locks, fasteners, drums, safes, prefabricated metal sheds.",
    examples: [
      "A TMT bar or steel re-rolling mill",
      "An aluminium door and window systems maker",
      "A lock, hinge and builders'-hardware brand",
      "A metal drum and industrial container manufacturer",
      "A fastener and fixings supplier",
    ],
    notHere: [
      { what: "The same building goods made of non-metal materials", goesIn: [19] },
      { what: "Machines and power tools", goesIn: [7] },
      { what: "Hand tools worked by hand", goesIn: [8] },
      { what: "Erecting the structure on site", goesIn: [37] },
    ],
    coFile: [
      {
        n: 19,
        why: "The classification splits building goods by material — metal in 6, everything else in 19 — so a builders'-merchant brand that sells both files both.",
      },
      {
        n: 37,
        why: "Fabrication and erection carried out for a customer is a class 37 service.",
      },
      {
        n: 35,
        why: "The dealer network and the trade counter are retail services.",
      },
    ],
    faqs: [
      {
        q: "Why are metal and non-metal versions of the same product in different classes?",
        a: "Because the classification splits a great deal of the building trade by material: class 6 for metal, class 19 for materials that are not of metal. It looks arbitrary until you file — a door brand that makes both steel and uPVC doors and registers only one class has left half its range uncovered.",
      },
      {
        q: "Is a smart lock class 6?",
        a: "A mechanical lock is small metal hardware, class 6. An electronic lock is apparatus, class 9. Brands that sell both usually file both rather than argue about where a particular model falls.",
      },
    ],
  },
  {
    n: 7,
    heading:
      "Machines, machine tools, power-operated tools; motors and engines, except for land vehicles; machine coupling and transmission components, except for land vehicles; agricultural implements, other than hand-operated hand tools; incubators for eggs; automatic vending machines.",
    quoted: true,
    short: "Machines and power tools",
    family: "Machines and tools",
    plain:
      "Powered machinery and its parts — factory machines, pumps, motors and engines other than for land vehicles, agricultural implements, vending machines, power tools.",
    examples: [
      "A textile or packaging machinery manufacturer",
      "An agricultural implement maker selling rotavators and threshers",
      "A pump and electric-motor brand",
      "A power-tool brand sold through hardware distribution",
      "A CNC or industrial-automation equipment builder",
    ],
    notHere: [
      { what: "Hand tools that are hand-operated", goesIn: [8] },
      { what: "Engines for land vehicles, and the vehicles themselves", goesIn: [12] },
      { what: "Household apparatus for cooking, heating and cooling", goesIn: [11] },
      { what: "Installation, servicing and repair of the machine", goesIn: [37] },
    ],
    coFile: [
      {
        n: 8,
        why: "Tool brands cross the powered/hand-operated line constantly, and that line is exactly where classes 7 and 8 divide.",
      },
      {
        n: 9,
        why: "The controllers, sensors and software that ship with modern machinery are class 9 apparatus.",
      },
      {
        n: 37,
        why: "Commissioning, annual maintenance contracts and repair are class 37 services — often the profitable half of a machinery business.",
      },
    ],
    faqs: [
      {
        q: "Is an electric drill class 7 or class 8?",
        a: "Power-operated tools are named in class 7. Class 8 is for hand tools and implements that are hand-operated. The power cord decides it, not the shape of the tool.",
      },
      {
        q: "Where does a mixer-grinder file?",
        a: "Food-preparation machines are class 7, while apparatus for cooking, heating and cooling is class 11. A kitchen-appliance brand with a mixer, an induction hob and a chimney normally files both classes.",
      },
    ],
  },
  {
    n: 8,
    heading: "Hand tools and implements, hand-operated; cutlery; side arms, except firearms; razors.",
    quoted: true,
    short: "Hand tools, cutlery and razors",
    family: "Machines and tools",
    plain:
      "Tools worked by the hand and nothing else — spanners, chisels, trowels, shears, agricultural hand implements — together with cutlery, razors and manicure implements.",
    examples: [
      "A hand-tool brand selling spanners and pliers through hardware shops",
      "An agricultural hand-implement maker — khurpi, sickle, spade",
      "A kitchen knife and cutlery brand",
      "A razor and shaving-blade brand",
      "A manicure and grooming implement maker",
    ],
    notHere: [
      { what: "Anything with a motor", goesIn: [7] },
      { what: "Kitchen utensils that are not cutlery — pans, ladles, containers", goesIn: [21] },
      { what: "Firearms", goesIn: [13] },
      { what: "Sharpening or repair carried out as a service", goesIn: [37] },
    ],
    coFile: [
      {
        n: 7,
        why: "A tool range that grows into cordless products crosses into class 7, and the brand has to follow it.",
      },
      {
        n: 21,
        why: "The class 21 heading covers cookware and tableware except forks, knives and spoons, so a kitchenware brand needs 8 and 21 together to cover its own catalogue.",
      },
      {
        n: 35,
        why: "Hardware retail and the online store are class 35 services.",
      },
    ],
    faqs: [
      {
        q: "Are kitchen knives class 8 or class 21?",
        a: "Cutlery, which includes knives, is named in class 8. Class 21 covers cookware and tableware but its heading expressly excludes forks, knives and spoons. A kitchenware brand that files only 21 has left its knife block unregistered.",
      },
      {
        q: "Is a cordless screwdriver class 8?",
        a: "No. Power-operated tools are class 7 however hand-sized they look. The classification follows how the tool is driven, not how it is held.",
      },
    ],
  },
  {
    n: 9,
    heading:
      "Scientific, research, navigation, surveying, photographic, cinematographic, audiovisual, optical, weighing, measuring, signalling, detecting, testing, inspecting, life-saving and teaching apparatus and instruments; apparatus and instruments for conducting, switching, transforming, accumulating, regulating or controlling the distribution or use of electricity; apparatus and instruments for recording, transmitting, reproducing or processing sound, images or data; recorded and downloadable media, computer software, blank digital or analogue recording and storage media; mechanisms for coin-operated apparatus; cash registers, calculating devices; computers and computer peripheral devices; diving suits, divers' masks, ear plugs for divers, nose clips for divers and swimmers, gloves for divers, breathing apparatus for underwater swimming; fire-extinguishing apparatus.",
    quoted: true,
    short: "Software, electronics and instruments",
    family: "Technology and instruments",
    plain:
      "Apparatus and recorded media — computers, phones, electrical and measuring instruments, safety equipment, eyewear, batteries — and, the part founders care about, downloadable software: an app a customer installs is a good in class 9, not a service.",
    examples: [
      "A mobile app customers download from the App Store or Play",
      "A consumer-electronics or audio brand",
      "An EV charger, battery or power-electronics maker",
      "A spectacles and eyewear brand",
      "An IoT device or smart-home hardware startup",
      "A safety-equipment brand selling helmets and protective gear",
    ],
    notHere: [
      { what: "Software provided online without a download (SaaS)", goesIn: [42] },
      { what: "The transmission of the data itself", goesIn: [38] },
      { what: "The teaching or entertainment the software delivers", goesIn: [41] },
      { what: "Instruments and devices for medical use", goesIn: [10] },
      { what: "Selling other manufacturers' electronics", goesIn: [35] },
    ],
    coFile: [
      {
        n: 42,
        why: "The commonest pair on the register for a software business: the downloadable app in 9, the hosted platform and its development in 42. Filing one and not the other is the single most frequent gap in startup portfolios.",
      },
      {
        n: 35,
        why: "If the product is also a store or a marketplace, that half is class 35.",
      },
      {
        n: 38,
        why: "A product that carries messages or calls between users is doing telecommunications as well as running software.",
      },
      {
        n: 41,
        why: "Courses, games and content delivered through the app are entertainment or education services.",
      },
    ],
    faqs: [
      {
        q: "My startup is an app. Is that class 9 or class 42?",
        a: "A downloadable app is a good, class 9. Software made available online without a download is a service, class 42. Almost every product with both a mobile app and a web platform is therefore in both, and most add a third class for what the software actually does — 36 for payments, 41 for courses, 35 for a marketplace.",
      },
      {
        q: "Is a router or a SIM card class 9?",
        a: "Apparatus for transmitting and processing data is class 9. Providing the connection over it is class 38. Hardware companies that also sell the service need both.",
      },
      {
        q: "Are e-books and recorded music in class 9?",
        a: "Recorded and downloadable media are named in the class 9 heading. A printed book is class 16 and the publishing service is class 41 — the same title can therefore involve three classes depending on the form it is sold in.",
      },
    ],
  },
  {
    n: 10,
    heading:
      "Surgical, medical, dental and veterinary apparatus and instruments; artificial limbs, eyes and teeth; orthopaedic articles; suture materials; therapeutic and assistive devices adapted for persons with disabilities; massage apparatus; apparatus, devices and articles for nursing infants; sexual activity apparatus, devices and articles.",
    quoted: true,
    short: "Medical and surgical devices",
    family: "Pharma and medical goods",
    plain:
      "Instruments and devices used on a body — surgical instruments, diagnostic devices, implants, orthopaedic supports, hearing aids, feeding bottles, massage apparatus.",
    examples: [
      "A surgical instrument manufacturer",
      "An orthopaedic brace and support brand",
      "A diagnostic-device maker selling glucometers or BP monitors",
      "A dental equipment and consumables supplier",
      "A baby feeding-bottle and nursing-articles brand",
      "A hearing-aid or assistive-device brand",
    ],
    notHere: [
      { what: "Medicines, dressings and dietetic preparations", goesIn: [5] },
      { what: "Scientific and measuring instruments not for medical use", goesIn: [9] },
      { what: "The hospital, clinic or diagnostic laboratory", goesIn: [44] },
      { what: "Gym and fitness equipment", goesIn: [28] },
    ],
    coFile: [
      {
        n: 5,
        why: "The device and the preparation it delivers are separate classes — a test kit and its reagents can land on either side.",
      },
      {
        n: 44,
        why: "Hospitals, clinics and teleconsult services under the same name are class 44.",
      },
      {
        n: 9,
        why: "A wearable that measures anything, and the software around a medical device, are class 9 apparatus.",
      },
      {
        n: 35,
        why: "Distribution and online sale of medical devices is retail, class 35.",
      },
    ],
    faqs: [
      {
        q: "Is a fitness tracker class 10?",
        a: "A general consumer wearable is class 9. A device intended for a medical purpose is class 10. Brands whose product does both — a watch that is also an ECG — commonly file both rather than bet on where the Registry draws the line.",
      },
      {
        q: "Where does a diagnostic lab chain file?",
        a: "The testing service is class 44. The analysers are class 10 and the reagents class 5. A lab that files only its device class has left the name on its signboard unprotected.",
      },
    ],
  },
  {
    n: 11,
    heading:
      "Apparatus and installations for lighting, heating, cooling, steam generating, cooking, drying, ventilating, water supply and sanitary purposes.",
    quoted: true,
    short: "Lighting, heating and sanitary apparatus",
    family: "Home and building",
    plain:
      "Apparatus for light, heat, cold, cooking, ventilation, water supply and sanitation — bulbs and fittings, fans, geysers, air conditioners, water purifiers, chimneys, taps and sanitaryware.",
    examples: [
      "An LED lighting and fittings brand",
      "A water-purifier brand",
      "A sanitaryware and CP-fittings manufacturer",
      "A kitchen chimney, hob and cooking-appliance brand",
      "An air-conditioner, cooler or ventilation brand",
      "A solar water-heater maker",
    ],
    notHere: [
      { what: "Cookware and utensils used on the appliance", goesIn: [21] },
      { what: "Furniture and cabinets built around the fittings", goesIn: [20] },
      { what: "Industrial machines", goesIn: [7] },
      { what: "Plumbing, wiring and installation as a service", goesIn: [37] },
    ],
    coFile: [
      {
        n: 21,
        why: "Kitchen and bathroom brands sell apparatus and utensils side by side, and the classification splits them.",
      },
      {
        n: 9,
        why: "Anything with a controller, a sensor or an app is class 9 apparatus as well.",
      },
      {
        n: 37,
        why: "Installation, AMC and repair are class 37 services, and in appliances they are usually where the customer relationship lives.",
      },
      {
        n: 35,
        why: "The showroom, dealer network and online store are class 35.",
      },
    ],
    faqs: [
      {
        q: "Is a water purifier class 11 or class 7?",
        a: "Apparatus for water supply and sanitary purposes is named in class 11, which is where purifiers sit. The chemicals used to treat water are class 1 or class 5, and the plumber who fits it is class 37.",
      },
      {
        q: "Where do smart lights go?",
        a: "The luminaire is class 11 and the control apparatus is class 9. A connected-lighting brand normally files both, because a competitor could otherwise take the name on the app while you hold it on the bulb.",
      },
    ],
  },
  {
    n: 12,
    heading: "Vehicles; apparatus for locomotion by land, air or water.",
    quoted: true,
    short: "Vehicles and their parts",
    family: "Vehicles",
    plain:
      "Anything that carries people or goods by land, air or water, and the parts made for them — cars, two-wheelers, EVs, cycles, tyres, seats, prams, trailers.",
    examples: [
      "An electric two-wheeler or three-wheeler manufacturer",
      "A bicycle brand",
      "An auto-component maker selling tyres, seats or mirrors",
      "A commercial-vehicle body builder",
      "A pram, stroller and baby-carrier brand",
    ],
    notHere: [
      { what: "Motors and engines that are not for land vehicles", goesIn: [7] },
      { what: "Vehicle servicing, repair and washing", goesIn: [37] },
      { what: "Taxi, fleet, logistics and transport services", goesIn: [39] },
      { what: "Toy and model vehicles", goesIn: [28] },
    ],
    coFile: [
      {
        n: 37,
        why: "Service networks, workshops and roadside assistance are class 37, and in vehicles the aftersales brand matters as much as the badge.",
      },
      {
        n: 39,
        why: "Fleet, rental, leasing and transport operations are class 39 services.",
      },
      {
        n: 35,
        why: "Dealerships, spare-part retail and online sale are class 35.",
      },
      {
        n: 9,
        why: "Batteries, chargers, telematics and the companion app are class 9 apparatus — the half of an EV brand that class 12 does not reach.",
      },
    ],
    faqs: [
      {
        q: "A cab or bike-taxi app — class 12 or class 39?",
        a: "Carrying passengers is a transport service, class 39. The vehicle itself is class 12. An aggregator that owns no vehicles usually files 39 for the transport, 42 for the platform and 9 for the downloadable app, and never needs 12 at all.",
      },
      {
        q: "Are tyres in class 12?",
        a: "Vehicle parts, tyres included, sit in class 12. The rubber they are made from is class 17, and fitting or retreading them is class 37.",
      },
    ],
  },
  {
    n: 13,
    heading: "Firearms; ammunition and projectiles; explosives; fireworks.",
    quoted: true,
    short: "Firearms, explosives and fireworks",
    family: "Arms and explosives",
    plain:
      "Weapons that fire, their ammunition, explosives and fireworks. One of the shortest headings in the classification and one of the least ambiguous.",
    examples: [
      "A licensed ammunition manufacturer",
      "A fireworks maker selling under its own brand",
      "An industrial explosives supplier to mining and quarrying",
      "An air-gun and sporting-arms brand",
      "A pyrotechnics company supplying events",
    ],
    notHere: [
      { what: "Knives and blades that are not firearms", goesIn: [8] },
      { what: "Toy guns and cap guns", goesIn: [28] },
      { what: "Security guarding and personal protection", goesIn: [45] },
      { what: "Blasting and drilling carried out as a service", goesIn: [37] },
    ],
    coFile: [
      {
        n: 8,
        why: "Side arms other than firearms sit in class 8, so an arms brand that also sells blades needs both.",
      },
      {
        n: 45,
        why: "Security services under the same name are class 45 — a common extension for this trade.",
      },
      {
        n: 35,
        why: "Retail and distribution of these goods is a class 35 service.",
      },
    ],
    faqs: [
      {
        q: "Are fireworks really in the same class as explosives?",
        a: "Yes — fireworks are named in the class 13 heading alongside explosives, ammunition and firearms. Selling them in a shop is class 35, and the display put on at an event is entertainment, class 41.",
      },
      {
        q: "Does registering the mark mean I can make and sell these goods?",
        a: "No, and this class is where that matters most. A trademark is a right in a name. Whether the goods may lawfully be manufactured, stored or sold is decided by licensing legislation that has nothing to do with the register.",
      },
    ],
  },
  {
    n: 14,
    heading:
      "Precious metals and their alloys; jewellery, precious and semi-precious stones; horological and chronometric instruments.",
    quoted: true,
    short: "Jewellery, precious metals and watches",
    family: "Jewellery and watches",
    plain:
      "Precious metal and what is made from it, jewellery of every kind including imitation, precious and semi-precious stones, watches and clocks.",
    examples: [
      "A gold jewellery house selling under its own brand",
      "A lab-grown diamond or solitaire brand",
      "A fashion and imitation jewellery label",
      "A silver gifting and articles brand",
      "A watch brand",
    ],
    notHere: [
      { what: "The jewellery showroom's retail service", goesIn: [35] },
      { what: "Hair ornaments, buttons and haberdashery", goesIn: [26] },
      { what: "Leather goods and bags", goesIn: [18] },
      { what: "Repair, polishing and valuation as a service", goesIn: [37] },
    ],
    coFile: [
      {
        n: 35,
        why: "A jewellery name is almost always a shop name too, and the shop is class 35 — the half most often left unfiled.",
      },
      {
        n: 26,
        why: "Hair ornaments and embellishments sit next door in class 26, and fashion-jewellery ranges cross into them.",
      },
      {
        n: 18,
        why: "Bags, clutches and small leather goods sold alongside the jewellery are class 18.",
      },
    ],
    faqs: [
      {
        q: "Is imitation jewellery in class 14?",
        a: "Class 14 is named for jewellery, and it does not turn on the metal being solid gold. A house selling both fine and fashion pieces files one goods class for the pieces and usually adds class 35 for the shop.",
      },
      {
        q: "Where does an online jewellery marketplace file?",
        a: "Bringing other sellers' jewellery together for customers to buy is retail, class 35, and the platform behind it is class 42. Class 14 covers only what you sell as your own goods.",
      },
    ],
  },
  {
    n: 15,
    heading:
      "Musical instruments; music stands and stands for musical instruments; conductors' batons.",
    quoted: true,
    short: "Musical instruments",
    family: "Music",
    plain:
      "Instruments themselves and the stands and batons that go with them — tabla, harmonium, sitar, guitars, keyboards, drums.",
    examples: [
      "A tabla and harmonium workshop selling under its own name",
      "A guitar or string-instrument brand",
      "A keyboard and synthesiser brand",
      "A percussion manufacturer supplying schools and studios",
      "A music-stand and instrument-accessory maker",
    ],
    notHere: [
      { what: "Amplifiers, microphones and recorded music", goesIn: [9] },
      { what: "Music teaching, performances and studios", goesIn: [41] },
      { what: "Cases and gig bags", goesIn: [18] },
      { what: "Instrument retail", goesIn: [35] },
    ],
    coFile: [
      {
        n: 9,
        why: "Amplification, pickups, recordings and apps are class 9 apparatus and media, not instruments.",
      },
      {
        n: 41,
        why: "Music schools, performances and content under the same name are class 41 services.",
      },
      {
        n: 35,
        why: "The instrument shop and its online store are class 35.",
      },
    ],
    faqs: [
      {
        q: "My music school also sells instruments under the same name.",
        a: "Two registrations: class 15 for the instruments, class 41 for the teaching. Schools that file only the service class find nothing stops a manufacturer using the name on a product.",
      },
      {
        q: "Are amplifiers class 15?",
        a: "No. Apparatus for reproducing sound is class 9. Class 15 is the instrument; almost everything you plug it into is class 9.",
      },
    ],
  },
  {
    n: 16,
    heading:
      "Paper and cardboard; printed matter; bookbinding material; photographs; stationery and office requisites, except furniture; adhesives for stationery or household purposes; drawing materials and materials for artists; paintbrushes; instructional and teaching materials; plastic sheets, films and bags for wrapping and packaging; printers' type, printing blocks.",
    quoted: true,
    short: "Paper, printed matter and stationery",
    family: "Paper and print",
    plain:
      "Paper and what is made of it, printed matter and books as physical objects, stationery, packaging films and bags, teaching materials, artists' supplies and paintbrushes.",
    examples: [
      "A notebook and stationery brand",
      "A book publisher's imprint, for the printed books themselves",
      "A carton and flexible-packaging manufacturer",
      "A greeting card and gifting brand",
      "An art-supplies brand selling sketchbooks and brushes",
    ],
    notHere: [
      { what: "Publishing, editorial and online content as services", goesIn: [41] },
      { what: "Printing carried out for other people", goesIn: [40] },
      { what: "E-books and downloadable files", goesIn: [9] },
      { what: "Rigid containers for storage or transport", goesIn: [20, 6] },
    ],
    coFile: [
      {
        n: 41,
        why: "The printed book is class 16 and publishing it is class 41; a publisher that files one has half a name.",
      },
      {
        n: 40,
        why: "A press that prints to customers' orders is providing a class 40 service as well as selling class 16 goods.",
      },
      {
        n: 35,
        why: "Stationery retail, and the advertising work a print business often grows into, are class 35.",
      },
      {
        n: 9,
        why: "Downloadable and recorded versions of the same content are class 9 goods.",
      },
    ],
    faqs: [
      {
        q: "Is a publishing house class 16 or class 41?",
        a: "The printed books are goods, class 16. Publishing is a service, class 41. Downloadable e-books are class 9. A publisher with one imprint across all three formats is looking at three classes, and the register treats them as three separate rights.",
      },
      {
        q: "Where does a printing press file?",
        a: "Printing for customers is class 40. The stationery, cards and packaging it sells under its own name are class 16. Most presses do both and need both.",
      },
    ],
  },
  {
    n: 17,
    heading:
      "Unprocessed and semi-processed rubber, gutta-percha, gum, asbestos, mica and substitutes for all these materials; plastics and resins in extruded form for use in manufacture; packing, stopping and insulating materials; flexible pipes, tubes and hoses, not of metal.",
    quoted: true,
    short: "Rubber, plastics and insulation",
    family: "Chemicals and materials",
    plain:
      "Materials in a half-made state — rubber and plastics in sheet, rod or extruded form, insulation, gaskets and seals, packing materials, and flexible non-metal pipes and hoses.",
    examples: [
      "A PVC pipe and garden-hose manufacturer",
      "A rubber sheet and gasket maker supplying industry",
      "A thermal and acoustic insulation materials brand",
      "A packaging-film extruder",
      "An industrial adhesive-tape manufacturer",
    ],
    notHere: [
      { what: "Rigid pipes for building", goesIn: [19] },
      { what: "Finished rubber goods such as tyres", goesIn: [12] },
      { what: "Raw chemicals and unprocessed resins", goesIn: [1] },
      { what: "Laying, lining or installing the material", goesIn: [37] },
    ],
    coFile: [
      {
        n: 1,
        why: "The unprocessed resins and compounds an extruder buys and sometimes resells are class 1.",
      },
      {
        n: 19,
        why: "Rigid non-metal pipes for building sit in class 19, so a pipe brand making both rigid and flexible ranges files both.",
      },
      {
        n: 37,
        why: "Insulation and piping work carried out on site is a class 37 service.",
      },
    ],
    faqs: [
      {
        q: "PVC pipes: class 17 or class 19?",
        a: "Flexible pipes, tubes and hoses not of metal are named in class 17. Rigid pipes for building are named in class 19. A pipe manufacturer with both a plumbing range and a garden range genuinely needs both, which surprises most of them.",
      },
      {
        q: "Is my packaging film class 16 or class 17?",
        a: "Plastic sheets, films and bags for wrapping and packaging are named in class 16; plastics in extruded form for use in manufacture are named in class 17. The distinction is who uses it next — a packer, or a factory that will shape it further.",
      },
    ],
  },
  {
    n: 18,
    heading:
      "Leather and imitations of leather; animal skins and hides; luggage and carrying bags; umbrellas and parasols; walking sticks; whips, harness and saddlery; collars, leashes and clothing for animals.",
    quoted: true,
    short: "Leather goods, bags and luggage",
    family: "Leather and bags",
    plain:
      "Leather and imitation leather as materials, and the things carried rather than worn — handbags, backpacks, luggage, wallets, belts, umbrellas — plus collars, leads and clothing for animals.",
    examples: [
      "A leather handbag or tote label",
      "A luggage and backpack brand",
      "A wallet, belt and small-leather-goods label",
      "A pet-accessory brand selling collars and leads",
      "A vegan or imitation-leather goods label",
    ],
    notHere: [
      { what: "Clothing, footwear and headwear, leather ones included", goesIn: [25] },
      { what: "Tanning chemicals", goesIn: [1] },
      { what: "Pet food and treats", goesIn: [31] },
      { what: "Retail of bags and accessories", goesIn: [35] },
    ],
    coFile: [
      {
        n: 25,
        why: "The single most common pair in fashion: bags in 18, garments and shoes in 25. A leather brand that files one and stocks the other is exposed on half its shelf.",
      },
      {
        n: 35,
        why: "The store, the website and the marketplace listing are class 35.",
      },
      {
        n: 14,
        why: "Accessory ranges drift into jewellery and watches, which are class 14.",
      },
    ],
    faqs: [
      {
        q: "A leather jacket: class 18 or class 25?",
        a: "Clothing is class 25 whatever it is made of. Class 18 covers leather as a material and the bags made from it. This is why accessory labels almost always register both — the jacket and the bag are in different classes even when they are the same hide.",
      },
      {
        q: "Why are pet collars in the same class as handbags?",
        a: "Collars, leashes and clothing for animals are named in the class 18 heading. Pet food is class 31 and veterinary care is class 44, so a pet brand is usually looking at three classes rather than one.",
      },
    ],
  },
  {
    n: 19,
    heading:
      "Materials, not of metal, for building and construction; rigid pipes, not of metal, for building; asphalt, pitch, tar and bitumen; transportable buildings, not of metal; monuments, not of metal.",
    quoted: true,
    short: "Non-metal building materials",
    family: "Home and building",
    plain:
      "What a building is made of when it is not metal — cement, bricks and blocks, tiles, sand and aggregate, timber and plywood, glass for building, rigid non-metal pipes, bitumen.",
    examples: [
      "A cement brand",
      "A ceramic and vitrified tile manufacturer",
      "An AAC block or fly-ash brick maker",
      "A plywood, laminate and MDF brand",
      "A uPVC window-profile or door manufacturer",
      "A ready-mix concrete supplier",
    ],
    notHere: [
      { what: "The same goods made of metal", goesIn: [6] },
      { what: "The construction work itself", goesIn: [37] },
      { what: "Paints, coatings and waterproofing compounds", goesIn: [2] },
      { what: "Furniture and fitted cabinets", goesIn: [20] },
    ],
    coFile: [
      {
        n: 6,
        why: "The metal half of the same catalogue — frames, sections, hardware — is class 6.",
      },
      {
        n: 37,
        why: "Contracting, laying and installation is class 37, and building-material brands that also take on projects need it.",
      },
      {
        n: 35,
        why: "Dealer networks, trade counters and online sale are class 35 services.",
      },
    ],
    faqs: [
      {
        q: "Which class is cement in?",
        a: "Building materials that are not of metal are class 19, which is where cement sits. The construction service that uses it is class 37, and the dealer network that sells it is class 35 — three classes for one brand on one bag.",
      },
      {
        q: "Tiles: class 19 or class 21?",
        a: "Tiles for building are class 19. Class 21 covers glassware, porcelain and earthenware as household articles. The same clay ends up in different classes depending on whether it goes on a wall or on a table.",
      },
    ],
  },
  {
    n: 20,
    heading:
      "Furniture, mirrors, picture frames; containers, not of metal, for storage or transport; unworked or semi-worked bone, horn, whalebone or mother-of-pearl; shells; meerschaum; yellow amber.",
    quoted: true,
    short: "Furniture, mirrors and non-metal containers",
    family: "Home and building",
    plain:
      "Furniture of any material, mirrors, picture frames, mattresses, and containers that are not made of metal — crates, bins, plastic drums.",
    examples: [
      "A furniture brand selling online or through showrooms",
      "A mattress brand",
      "A modular kitchen and wardrobe manufacturer",
      "A moulded plastic furniture and crate maker",
      "A home-decor brand selling mirrors and frames",
    ],
    notHere: [
      { what: "Bed linen, curtains and soft furnishing", goesIn: [24] },
      { what: "Metal containers and safes", goesIn: [6] },
      { what: "Lighting and sanitary fittings", goesIn: [11] },
      { what: "Interior design, and the furniture showroom", goesIn: [42, 35] },
    ],
    coFile: [
      {
        n: 24,
        why: "Furniture and furnishing travel together under one brand and sit in two classes.",
      },
      {
        n: 11,
        why: "Fitted kitchens and bathrooms cross into apparatus — hobs, chimneys, taps — which is class 11.",
      },
      {
        n: 35,
        why: "The showroom and the marketplace listing are retail services.",
      },
      {
        n: 42,
        why: "Interior and product design offered to customers is a class 42 service.",
      },
    ],
    faqs: [
      {
        q: "Furniture brand that also does interiors — how many classes?",
        a: "The furniture is class 20, the design work is class 42, the linen is class 24, and the shop that sells other brands is class 35. Which of those you need depends on what you actually offer, and it is worth deciding with an attorney before filing rather than after.",
      },
      {
        q: "Is a mattress class 20 or class 24?",
        a: "Mattresses are class 20. The sheets and protectors that go on them are class 24. Sleep brands that sell a bundle are in both.",
      },
    ],
  },
  {
    n: 21,
    heading:
      "Household or kitchen utensils and containers; cookware and tableware, except forks, knives and spoons; combs and sponges; brushes, except paintbrushes; brush-making materials; articles for cleaning purposes; unworked or semi-worked glass, except building glass; glassware, porcelain and earthenware.",
    quoted: true,
    short: "Kitchenware, glassware and brushes",
    family: "Home and building",
    plain:
      "Utensils and containers for a kitchen or a house, cookware, crockery, glassware, bottles, brushes, combs and cleaning articles — the objects themselves, never the machines and never the cleaning fluid.",
    examples: [
      "A stainless-steel cookware brand",
      "A melamine and ceramic crockery brand",
      "A glassware and water-bottle brand",
      "A cleaning brush, mop and duster brand",
      "A copper-vessel or traditional-utensil maker",
      "A lunchbox and tiffin manufacturer",
    ],
    notHere: [
      { what: "Forks, knives and spoons", goesIn: [8] },
      { what: "Electrical appliances for cooking or heating", goesIn: [11, 7] },
      { what: "The detergent poured into the bucket", goesIn: [3] },
      { what: "Homeware retail", goesIn: [35] },
    ],
    coFile: [
      {
        n: 8,
        why: "The class 21 heading expressly excludes forks, knives and spoons — they are cutlery, class 8 — so a kitchenware catalogue routinely needs both.",
      },
      {
        n: 11,
        why: "The hob, the chimney and the purifier beside the utensils are class 11 apparatus.",
      },
      {
        n: 3,
        why: "Cleaning articles are class 21 and cleaning preparations are class 3; a home-care brand selling both files both.",
      },
      {
        n: 35,
        why: "The store and the online catalogue are class 35 services.",
      },
    ],
    faqs: [
      {
        q: "Why are spoons in a different class from pans?",
        a: "The heading of class 21 covers cookware and tableware but takes forks, knives and spoons out and leaves them in class 8 with cutlery. It is the single most-missed split in kitchenware filings.",
      },
      {
        q: "Is an insulated flask class 21?",
        a: "A flask or bottle as a container is class 21. Something that heats, cools or purifies is apparatus, class 11. The dividing question is whether it does anything or merely holds something.",
      },
    ],
  },
  {
    n: 22,
    heading:
      "Ropes and string; nets; tents and tarpaulins; awnings of textile or synthetic materials; sails; sacks for the transport and storage of materials in bulk; padding, cushioning and stuffing materials, except of paper, cardboard, rubber or plastics; raw fibrous textile materials and substitutes therefor.",
    quoted: true,
    short: "Ropes, tents, sacks and raw fibres",
    family: "Textiles and soft goods",
    plain:
      "Rope, twine and netting, tents, tarpaulins and awnings, bulk sacks, stuffing materials, and raw textile fibre before it is spun into yarn.",
    examples: [
      "An HDPE or PP woven-sack manufacturer",
      "A tarpaulin and awning maker",
      "A rope and twine manufacturer",
      "A tent and shelter maker supplying events and camping",
      "A fishing-net manufacturer",
    ],
    notHere: [
      { what: "Yarn and thread once the fibre is spun", goesIn: [23] },
      { what: "Finished fabric and household linen", goesIn: [24] },
      { what: "Fashion bags and totes", goesIn: [18] },
      { what: "Camping trips and events as an experience", goesIn: [41, 39] },
    ],
    coFile: [
      {
        n: 23,
        why: "The next step up the textile chain: raw fibre in 22, spun yarn in 23. Mills that do both need both.",
      },
      {
        n: 24,
        why: "Woven fabric and linen are class 24, and packaging-textile businesses often extend into them.",
      },
      {
        n: 35,
        why: "Trading and distribution of packaging materials is a class 35 service.",
      },
    ],
    faqs: [
      {
        q: "Where does a jute-bag brand file?",
        a: "Sacks for the transport and storage of materials in bulk are class 22. A jute tote sold as a fashion accessory is a carrying bag, class 18. A jute business selling both files both, because the two products are in different classes despite being the same fibre.",
      },
      {
        q: "Is a tent class 22 or class 28?",
        a: "Tents and tarpaulins are named in class 22. Gymnastic and sporting articles are class 28. Outdoor brands with a range that spans both usually register in both.",
      },
    ],
  },
  {
    n: 23,
    heading: "Yarns and threads for textile use.",
    quoted: true,
    short: "Yarns and threads",
    family: "Textiles and soft goods",
    plain:
      "Spun yarn and sewing thread, and nothing else. It is the shortest heading in the classification and one of the narrowest classes in it.",
    examples: [
      "A spinning mill selling cotton yarn under its own brand",
      "A sewing-thread manufacturer",
      "A knitting-wool brand sold to home knitters",
      "An embroidery and zari thread maker",
      "A technical or specialty yarn producer",
    ],
    notHere: [
      { what: "Fabric woven or knitted from the yarn", goesIn: [24] },
      { what: "Raw fibre before it is spun", goesIn: [22] },
      { what: "Needles, buttons and haberdashery", goesIn: [26] },
      { what: "Garments", goesIn: [25] },
    ],
    coFile: [
      {
        n: 24,
        why: "Integrated mills spin and weave, and the two outputs are separate classes.",
      },
      {
        n: 26,
        why: "Craft brands sell yarn beside needles, buttons and trims, which are class 26.",
      },
      {
        n: 35,
        why: "Yarn trading and the craft store are class 35 services.",
      },
    ],
    faqs: [
      {
        q: "Is knitting wool class 23?",
        a: "Yarns and threads for textile use are class 23 whether they are sold by the tonne to a mill or by the ball to a hobbyist. The needles are class 26 and the pattern book is class 16.",
      },
      {
        q: "Do I need class 23 if I sell garments?",
        a: "Only if you sell the yarn itself under the mark. Garments are class 25. Class 23 protects the thread, not the shirt sewn with it.",
      },
    ],
  },
  {
    n: 24,
    heading: "Textiles and substitutes for textiles; household linen; curtains of textile or plastic.",
    quoted: true,
    short: "Fabrics and household linen",
    family: "Textiles and soft goods",
    plain:
      "Cloth by the metre and what is made of cloth for the home — bedsheets, towels, curtains, table linen, upholstery fabric.",
    examples: [
      "A bedsheet and home-linen brand",
      "A mill selling shirting and suiting fabric",
      "A towel manufacturer",
      "A curtain and upholstery fabric brand",
      "A handloom textile label selling fabric by the metre",
    ],
    notHere: [
      { what: "Clothing made from the fabric", goesIn: [25] },
      { what: "Carpets, rugs and floor coverings", goesIn: [27] },
      { what: "Yarn and thread", goesIn: [23] },
      { what: "Home-furnishing retail", goesIn: [35] },
    ],
    coFile: [
      {
        n: 25,
        why: "Fabric in 24 and garments in 25 is the split that decides most Indian textile filings, and brands that sell both need both.",
      },
      {
        n: 27,
        why: "Rugs and floor coverings are class 27 — the other half of a home-furnishing catalogue.",
      },
      {
        n: 35,
        why: "The furnishing store, the exporter's trading arm and the website are class 35.",
      },
    ],
    faqs: [
      {
        q: "Is a saree class 24 or class 25?",
        a: "A finished garment is class 25 and fabric sold by the length is class 24. Where a particular saree falls has been argued both ways, and it is exactly the kind of question to put to a trademark attorney; brands that sell both stitched and unstitched normally file both classes and stop worrying about it.",
      },
      {
        q: "A home-furnishing brand — which classes?",
        a: "Linen and fabric in 24, rugs and floor coverings in 27, furniture in 20, and the shop that sells all three in 35. One brand, four registrations, and the register treats each as a separate right.",
      },
    ],
  },
  {
    n: 25,
    heading: "Clothing, footwear, headwear.",
    quoted: true,
    short: "Clothing, footwear and headwear",
    family: "Textiles and soft goods",
    plain:
      "Everything worn — shirts, kurtas, sarees, denim, innerwear, shoes, chappals, caps and turbans. Three words long, which makes class 25 easy to read and easy to get wrong: every mistake is at its edges.",
    examples: [
      "A D2C apparel label selling kurtas and co-ord sets",
      "A footwear brand",
      "An innerwear or loungewear brand",
      "A sportswear and activewear label",
      "A uniform manufacturer supplying schools and hotels",
      "An ethnic-wear or saree label selling stitched garments",
    ],
    notHere: [
      { what: "Selling other labels' clothing in a shop or on a marketplace", goesIn: [35] },
      { what: "Stitching or manufacturing to another brand's order", goesIn: [40] },
      { what: "Fabric sold by the metre", goesIn: [24] },
      { what: "Bags, belts and wallets", goesIn: [18] },
      { what: "Protective helmets and safety gear", goesIn: [9] },
    ],
    coFile: [
      {
        n: 35,
        why: "Class 25 covers the garment; class 35 covers the shop. The moment your website stocks another label, or the name is read as the name of a store rather than of a shirt, class 35 is the class doing the work.",
      },
      {
        n: 18,
        why: "Bags, belts and wallets under the same label are class 18 — the accessory wall of the same shop, in a different class.",
      },
      {
        n: 24,
        why: "Fabric by the metre is class 24, which matters to any label that also sells unstitched material.",
      },
      {
        n: 40,
        why: "If you stitch or manufacture to other brands' orders as well as selling your own, that half is a class 40 service.",
      },
    ],
    faqs: [
      {
        q: "I sell my own clothing online. Do I need class 35 as well as class 25?",
        a: "Class 25 protects the garments. Class 35 protects retail — the service of bringing goods together for others to buy — which is what a shop, a website stocking other labels, or a marketplace does. A label selling only its own goods often starts with 25 alone and adds 35 as the store becomes a business in its own right. It is a judgement about your actual trade, so put it to an attorney rather than filing on a rule of thumb.",
      },
      {
        q: "Is a helmet class 25?",
        a: "Headwear in class 25 is headwear worn as clothing. Protective headgear is safety apparatus, class 9. A cricket cap and a cricket helmet are in different classes, which catches out a lot of sports labels.",
      },
      {
        q: "Does class 25 cover footwear separately?",
        a: "No — footwear sits inside class 25 along with clothing and headwear, so one filing covers shirts and shoes together. It does not cover the bag, and that is the boundary most often crossed by accident.",
      },
      {
        q: "My clothes are made by a third-party unit. Does that change my class?",
        a: "No. Manufacturing to order for others is class 40, and it is the unit's class, not yours. You are selling garments under your name, which is class 25.",
      },
    ],
  },
  {
    n: 26,
    heading:
      "Lace, braid and embroidery, and haberdashery ribbons and bows; buttons, hooks and eyes, pins and needles; artificial flowers; hair decorations; false hair.",
    quoted: true,
    short: "Lace, buttons and hair accessories",
    family: "Textiles and soft goods",
    plain:
      "The small things attached to clothing and to hair — lace, braid, embroidery, ribbon, buttons, hooks, zips, pins and needles, artificial flowers, hair clips and bands, wigs and extensions.",
    examples: [
      "A button, hook and zip manufacturer",
      "A lace, braid and garment-trim supplier",
      "A hair-accessory brand selling clips and bands",
      "An artificial-flower and event-decor maker",
      "A wig and hair-extension brand",
    ],
    notHere: [
      { what: "The garments the trim is sewn onto", goesIn: [25] },
      { what: "Jewellery", goesIn: [14] },
      { what: "Yarn and sewing thread", goesIn: [23] },
      { what: "The salon that fits the extensions", goesIn: [44] },
    ],
    coFile: [
      {
        n: 25,
        why: "Trim suppliers and the labels that use them share customers, and accessory brands cross the 25/26 line constantly.",
      },
      {
        n: 23,
        why: "Thread and yarn sit in class 23 and are sold from the same counter as buttons and needles.",
      },
      {
        n: 35,
        why: "The haberdashery shop and the craft marketplace are class 35 services.",
      },
    ],
    faqs: [
      {
        q: "Are hair extensions class 26?",
        a: "False hair and hair decorations are named in the class 26 heading. The shampoo is class 3 and the salon that fits them is class 44 — three classes for one hair business.",
      },
      {
        q: "Buttons are metal. Should they be class 6?",
        a: "No. Haberdashery goes to class 26 by function even when it is made of metal; class 6 is for metal as hardware and as a material. The classification asks what a thing is for before it asks what it is made of — except in building materials, where it asks the opposite.",
      },
    ],
  },
  {
    n: 27,
    heading:
      "Carpets, rugs, mats and matting, linoleum and other materials for covering existing floors; wall hangings, not of textile.",
    quoted: true,
    short: "Carpets, rugs and floor coverings",
    family: "Textiles and soft goods",
    plain:
      "What covers a floor or a wall that already exists — carpets, rugs, dhurries, mats and matting, vinyl and linoleum flooring, wallpaper.",
    examples: [
      "A handmade carpet and dhurrie exporter",
      "A vinyl and laminate flooring brand",
      "A doormat, coir-mat and yoga-mat maker",
      "A wallpaper brand",
      "An artificial-grass and outdoor-matting supplier",
    ],
    notHere: [
      { what: "Textiles, curtains and wall hangings of textile", goesIn: [24] },
      { what: "Tiles, stone and materials the floor is built from", goesIn: [19] },
      { what: "Fitting and laying the floor", goesIn: [37] },
      { what: "Flooring retail", goesIn: [35] },
    ],
    coFile: [
      {
        n: 24,
        why: "Rugs and linen come out of the same home-furnishing catalogue and sit in classes 27 and 24.",
      },
      {
        n: 19,
        why: "Flooring brands that sell both tiles and vinyl are in 19 and 27 at once.",
      },
      {
        n: 35,
        why: "The showroom and the online store are class 35.",
      },
    ],
    faqs: [
      {
        q: "Wooden flooring: class 19 or class 27?",
        a: "The class 27 heading covers materials for covering existing floors; class 19 covers materials the building is made from. Which side a particular product falls on depends on the product, and it is a good example of a question worth an attorney's ten minutes before you file.",
      },
      {
        q: "Is wallpaper class 27?",
        a: "Wall hangings that are not of textile are named in class 27. Textile wall hangings are class 24, and the paint you would have used instead is class 2.",
      },
    ],
  },
  {
    n: 28,
    heading:
      "Games, toys and playthings; video game apparatus; gymnastic and sporting articles; decorations for Christmas trees.",
    quoted: true,
    short: "Toys, games and sporting goods",
    family: "Toys and sport",
    plain:
      "Toys, board games, apparatus for playing video games, gym and sporting articles, and festive decorations. The physical objects of play, not the play itself and not the software.",
    examples: [
      "A wooden or educational toy brand",
      "A board-game publisher",
      "A cricket-gear brand selling bats and pads",
      "A gym and home-fitness equipment maker",
      "A yoga and fitness accessory brand",
      "A puzzle and STEM-kit brand",
    ],
    notHere: [
      { what: "Downloadable games and apps", goesIn: [9] },
      { what: "Running tournaments, coaching or online play", goesIn: [41] },
      { what: "Sportswear, shoes and jerseys", goesIn: [25] },
      { what: "Toy and sports retail", goesIn: [35] },
    ],
    coFile: [
      {
        n: 9,
        why: "A downloadable game or a companion app is class 9, and almost every games business now has one.",
      },
      {
        n: 41,
        why: "Providing games online, running leagues and coaching are class 41 entertainment and sporting services.",
      },
      {
        n: 25,
        why: "Sports brands sell equipment and apparel together, and those are classes 28 and 25.",
      },
    ],
    faqs: [
      {
        q: "A mobile game: class 28, class 9 or class 41?",
        a: "The downloadable game file is class 9, apparatus for playing games is class 28, and providing games online as entertainment is class 41. Studios commonly file 9 and 41 and add 42 for the platform; class 28 matters if you sell physical goods.",
      },
      {
        q: "Is a cricket bat class 28 and the jersey class 25?",
        a: "Yes. Sporting articles and clothing are different classes, and a sports brand that registers only one of them has left half its catalogue open.",
      },
    ],
  },
  {
    n: 29,
    heading:
      "Meat, fish, poultry and game; meat extracts; preserved, frozen, dried and cooked fruits and vegetables; jellies, jams, compotes; eggs; milk, cheese, butter, yoghurt and other milk products; oils and fats for food.",
    quoted: true,
    short: "Meat, dairy and processed foods",
    family: "Food and drink",
    plain:
      "Foods of animal origin and processed fruit and vegetables — milk, paneer, ghee, curd, eggs, meat and fish, pickles and jams, dry fruit, edible oils, and snacks made from potato or vegetables.",
    examples: [
      "A dairy brand selling milk, paneer and ghee",
      "A pickle, jam and preserve brand",
      "A frozen and ready-to-cook food brand",
      "An edible-oil brand",
      "A dry-fruit and nut brand",
      "A plant-based dairy-alternative brand",
    ],
    notHere: [
      { what: "Flour, rice, spices, tea, biscuits and confectionery", goesIn: [30] },
      { what: "Fresh unprocessed produce and live animals", goesIn: [31] },
      { what: "Drinks", goesIn: [32, 33] },
      { what: "Restaurants, cafés and cloud kitchens", goesIn: [43] },
    ],
    coFile: [
      {
        n: 30,
        why: "The food classes split by what the food is made of, not by where it sits in the shop, so almost every packaged-food brand needs 29 and 30 together.",
      },
      {
        n: 43,
        why: "Serving food is class 43 — the class a food brand needs the day it opens an outlet.",
      },
      {
        n: 35,
        why: "The D2C store, the distribution arm and the marketplace listing are class 35.",
      },
      {
        n: 32,
        why: "Any drink in the range is class 32 or 33, not class 29.",
      },
    ],
    faqs: [
      {
        q: "Which class is a snack brand?",
        a: "It depends on what the snack is made of. Potato chips and processed vegetables sit in class 29; namkeen made from flour, gram or cereals sits in class 30. Most snack brands file both rather than defend a line drawn through their own shelf.",
      },
      {
        q: "Is a milk-based drink class 29 or class 32?",
        a: "Milk products are named in class 29 and fruit beverages in class 32. A dairy brand with both a lassi and a fruit drink is in both, and a brand that files only one has protected half its fridge.",
      },
    ],
  },
  {
    n: 30,
    heading:
      "Coffee, tea, cocoa and substitutes therefor; rice, pasta and noodles; tapioca and sago; flour and preparations made from cereals; bread, pastries and confectionery; chocolate; ice cream, sorbets and other edible ices; sugar, honey, treacle; yeast, baking-powder; salt, seasonings, spices, preserved herbs; vinegar, sauces and other condiments; ice (frozen water).",
    quoted: true,
    short: "Staples, spices, bakery and beverages as goods",
    family: "Food and drink",
    plain:
      "Prepared foods of plant origin — atta, rice, pasta, bread, biscuits, chocolate, ice cream, sugar, honey, tea and coffee as packets, salt, spices, sauces and condiments.",
    examples: [
      "A masala and spice brand",
      "A tea or coffee brand selling packets",
      "An atta, rice and staples brand",
      "A bakery selling packaged breads and cookies",
      "A chocolate and confectionery brand",
      "A sauces, chutney and condiment brand",
    ],
    notHere: [
      { what: "Fresh produce, unmilled grain and seeds", goesIn: [31] },
      { what: "Dairy, meat and processed vegetables", goesIn: [29] },
      { what: "The café that brews the coffee", goesIn: [43] },
      { what: "Supplements and foods for medical use", goesIn: [5] },
    ],
    coFile: [
      {
        n: 29,
        why: "The other half of the packaged-food shelf. Brands that file one of 29 and 30 usually discover they needed both.",
      },
      {
        n: 43,
        why: "A tea brand that opens a tea shop, or a bakery that puts out tables, is providing food and drink — class 43.",
      },
      {
        n: 35,
        why: "Retail, distribution and the D2C website are class 35 services.",
      },
      {
        n: 32,
        why: "Bottled and ready-to-drink versions of the same product are class 32.",
      },
    ],
    faqs: [
      {
        q: "Tea brand: class 30 or class 43?",
        a: "Tea as a packet is class 30. A tea shop serving cups is class 43. A brand that does both files both — and in food and drink, the outlet and the packet are attacked by copycats in different ways.",
      },
      {
        q: "Where does ice cream sit?",
        a: "Ice cream, sorbets and other edible ices are named in class 30. A dairy-based dessert can also touch class 29, which is one reason food brands commonly file 29, 30 and 32 as a set.",
      },
    ],
  },
  {
    n: 31,
    heading:
      "Raw and unprocessed agricultural, aquacultural, horticultural and forestry products; raw and unprocessed grains and seeds; fresh fruits and vegetables, fresh herbs; natural plants and flowers; bulbs, seedlings and seeds for planting; live animals; foodstuffs and beverages for animals; malt.",
    quoted: true,
    short: "Fresh produce, seeds and animal feed",
    family: "Food and drink",
    plain:
      "Farm output before anybody processes it — fresh fruit and vegetables, unmilled grain, seeds for planting, plants and flowers, live animals — plus food for animals.",
    examples: [
      "A fresh-produce brand or farmer-producer company",
      "A seed company",
      "A plant nursery selling under its own name",
      "A pet-food brand",
      "A cattle-feed or poultry-feed manufacturer",
      "An organic farm brand selling unprocessed produce",
    ],
    notHere: [
      { what: "Anything cooked, milled, dried or processed", goesIn: [29, 30] },
      { what: "Fertilisers and soil treatments", goesIn: [1] },
      { what: "Veterinary medicines and supplements", goesIn: [5] },
      { what: "Farming, landscaping and gardening as services", goesIn: [44] },
    ],
    coFile: [
      {
        n: 29,
        why: "The moment produce is processed it crosses into class 29 or 30, and most agri brands cross it within a year of launching.",
      },
      {
        n: 1,
        why: "Fertilisers and soil conditioners sold under the same name are class 1.",
      },
      {
        n: 35,
        why: "Aggregation, mandi trading and the D2C store are class 35 services.",
      },
      {
        n: 44,
        why: "Agronomy advice, landscaping and horticultural services are class 44.",
      },
    ],
    faqs: [
      {
        q: "Is pet food class 31?",
        a: "Foodstuffs and beverages for animals are named in the class 31 heading. Pet accessories such as collars and leads are class 18, and veterinary care is class 44 — a pet brand is usually a three-class filing.",
      },
      {
        q: "Fresh or processed — where is the line?",
        a: "A mango is class 31. Mango pulp and jam are class 29. A mango drink is class 32. The line is processing, not the fruit, and a brand that grows along that chain has to file along it too.",
      },
    ],
  },
  {
    n: 32,
    // NOT a quotation. The closing clause of the class 32 heading — the wording
    // about preparations for making beverages — was reworded between recent
    // editions and we could not verify which text is current, so the page
    // prints this as our scope summary rather than as WIPO's sentence.
    heading:
      "Beers; non-alcoholic beverages; mineral and aerated waters; fruit beverages and fruit juices; syrups and other preparations for making non-alcoholic beverages.",
    quoted: false,
    short: "Beers, water and soft drinks",
    family: "Food and drink",
    plain:
      "Drinks with no alcohol in them, and beer — packaged water, juices, sodas, energy and functional drinks, and the syrups and concentrates used to make them.",
    examples: [
      "A packaged drinking-water brand",
      "A cold-pressed juice brand",
      "An energy or functional-drink brand",
      "A craft brewery",
      "A soda, tonic and mixer brand",
      "A beverage-concentrate and syrup maker",
    ],
    notHere: [
      { what: "Wine, spirits and everything alcoholic other than beer", goesIn: [33] },
      { what: "Tea and coffee sold as packets", goesIn: [30] },
      { what: "Milk-based drinks", goesIn: [29] },
      { what: "Bars, cafés and serving drinks", goesIn: [43] },
    ],
    coFile: [
      {
        n: 33,
        why: "Beer sits in class 32 and every other alcoholic drink in class 33, so a brewery that makes a spirit or a cidery that makes wine needs both.",
      },
      {
        n: 43,
        why: "A taproom, café or bar under the same name is a class 43 service.",
      },
      {
        n: 35,
        why: "Distribution, retail and the D2C store are class 35.",
      },
      {
        n: 30,
        why: "The powder, syrup or tea version of the same brand is class 30.",
      },
    ],
    faqs: [
      {
        q: "Why is beer in a different class from whisky?",
        a: "Beer is named in class 32 alongside non-alcoholic drinks; the rest of the alcoholic drinks are in class 33. It is a quirk of the classification with a real consequence: a brewery that launches a gin has entered a class it does not own.",
      },
      {
        q: "Is a lassi or milkshake class 32?",
        a: "Milk products are class 29 and fruit beverages class 32. A beverage brand with a dairy line and a juice line is in both.",
      },
    ],
  },
  {
    n: 33,
    heading: "Alcoholic beverages, except beers; alcoholic preparations for making beverages.",
    quoted: true,
    short: "Wines and spirits",
    family: "Food and drink",
    plain:
      "Alcoholic drinks other than beer, and preparations for making them — whisky, rum, gin, vodka, wine, liqueurs, ready-to-drink cocktails.",
    examples: [
      "A craft gin or rum distillery",
      "A winery",
      "An IMFL whisky brand",
      "A ready-to-drink cocktail maker",
      "A liqueur or aperitif brand",
    ],
    notHere: [
      { what: "Beer", goesIn: [32] },
      { what: "Non-alcoholic and zero-proof versions", goesIn: [32] },
      { what: "Bars, pubs and serving drinks", goesIn: [43] },
      { what: "Retail and distribution of liquor", goesIn: [35] },
    ],
    coFile: [
      {
        n: 32,
        why: "Beer and every non-alcoholic drink in the range are class 32, including the zero-proof version of your own spirit.",
      },
      {
        n: 43,
        why: "The tasting room, bar or restaurant under the same name is class 43.",
      },
      {
        n: 35,
        why: "Import, distribution and retail are class 35 services.",
      },
    ],
    faqs: [
      {
        q: "My distillery also makes a zero-proof spirit.",
        a: "The alcoholic range is class 33 and the non-alcoholic one is class 32. They are separate registrations even under one brand, and the zero-proof line is precisely where a copycat will start.",
      },
      {
        q: "Does a class 33 registration let me sell alcohol?",
        a: "No. A trademark is a right in a name. Whether you may manufacture, transport or sell alcohol is an excise and licensing question decided entirely outside the trademark register.",
      },
    ],
  },
  {
    n: 34,
    // NOT a quotation. The class 34 heading was revised across recent editions
    // — the tobacco-substitutes and vaporiser clauses in particular — and we
    // could not verify the current wording, so this is our scope summary.
    heading:
      "Tobacco and tobacco substitutes; cigarettes and cigars; electronic cigarettes and oral vaporisers for smokers; smokers' articles; matches.",
    quoted: false,
    short: "Tobacco, vaporisers and smokers' articles",
    family: "Tobacco",
    plain:
      "Tobacco and its substitutes, cigarettes and cigars, electronic cigarettes and vaporisers, smokers' articles such as lighters and ashtrays, and matches.",
    examples: [
      "A tobacco or cigarette manufacturer",
      "A lighter and matchbox brand",
      "A hookah and shisha accessory brand",
      "A herbal or tobacco-free cigarette maker",
      "A smokers'-articles brand selling cases and ashtrays",
    ],
    notHere: [
      { what: "Nicotine preparations sold for a medical purpose", goesIn: [5] },
      { what: "Retail and distribution", goesIn: [35] },
      { what: "Smoking-cessation clinics and counselling", goesIn: [44] },
      { what: "Packaging and printed matter", goesIn: [16] },
    ],
    coFile: [
      {
        n: 5,
        why: "A nicotine product positioned as a medical preparation is class 5, not class 34 — the two sit either side of the claim being made.",
      },
      {
        n: 35,
        why: "Wholesale, retail and distribution are class 35 services.",
      },
      {
        n: 44,
        why: "Cessation services under a related name are class 44.",
      },
    ],
    faqs: [
      {
        q: "Are e-cigarettes in class 34?",
        a: "Electronic cigarettes and vaporisers for smokers are classified here rather than with electronics. A nicotine preparation sold for a medical purpose is class 5 instead.",
      },
      {
        q: "Does registering the mark mean the goods can be sold?",
        a: "No. Several goods in this class are restricted or prohibited for sale in India under legislation that has nothing to do with the trademark register. A class tells you where a name sits in a filing system; it never grants permission to trade.",
      },
    ],
  },
  {
    n: 35,
    // NOT a quotation. The class 35 heading was reworded between editions —
    // the business management and administration clause in particular — and we
    // could not verify which text is current, so this is our scope summary.
    heading:
      "Advertising; business management, organisation and administration; office functions.",
    quoted: false,
    short: "Advertising, retail and business services",
    family: "Business and trade services",
    plain:
      "The class founders underestimate. It covers advertising and marketing, running or administering a business for somebody, office functions — and retail: the service of bringing goods together so that other people can buy them. If your name is the name of a shop, a website or a marketplace, this is the class that covers that half of it.",
    examples: [
      "A marketplace, aggregator or quick-commerce platform",
      "A D2C brand's own store, where the name is the shop's name too",
      "A digital marketing or advertising agency",
      "A recruitment and staffing firm",
      "A business or management consulting firm",
      "An accounting, payroll and bookkeeping service",
      "A franchise operator",
    ],
    notHere: [
      { what: "The goods you actually sell", goesIn: [25, 30, 9] },
      { what: "Financial, payment and lending services", goesIn: [36] },
      { what: "The software platform the marketplace runs on", goesIn: [42] },
      { what: "Delivering the parcel", goesIn: [39] },
      { what: "Training courses run for businesses", goesIn: [41] },
    ],
    coFile: [
      {
        n: 42,
        why: "Every marketplace is a retail service in 35 sitting on a software platform in 42, and the two are separate rights.",
      },
      {
        n: 9,
        why: "The downloadable app the customers shop on is a class 9 good.",
      },
      {
        n: 39,
        why: "If you also move the goods, that is transport and storage, class 39.",
      },
      {
        n: 36,
        why: "Payments, wallets and credit inside the platform are class 36 financial services.",
      },
    ],
    faqs: [
      {
        q: "Everybody tells me to file class 35. Why?",
        a: "Because it covers retail — the service of bringing goods together for others to buy — and most modern businesses do retail whether or not they think of themselves that way. It is not a catch-all, though, and that is the half people get wrong: class 35 covers the shop, not the goods on its shelves.",
      },
      {
        q: "Does class 35 protect my product?",
        a: "No. Retail services in 35 and the goods in their own class are separate registrations. A brand registered only in 35 has protected the name of its store and left the name on its product open to anyone.",
      },
      {
        q: "Is running ads for myself a class 35 service?",
        a: "Class 35 covers advertising provided as a service to others. Marketing your own goods is not a service you supply to anybody, and it does not by itself put you in class 35 — selling other people's goods, or running a shop under the name, is what does.",
      },
    ],
  },
  {
    n: 36,
    heading: "Financial, monetary and banking services; insurance services; real estate services.",
    quoted: true,
    short: "Financial, insurance and property services",
    family: "Business and trade services",
    plain:
      "Money and property — banking, lending, payments, insurance, broking, funds, and real-estate agency, leasing and property management.",
    examples: [
      "An NBFC or digital lending platform",
      "A payments or UPI product",
      "An insurance broker or aggregator",
      "A wealth-management or mutual-fund distribution business",
      "A real-estate brokerage or property-management firm",
    ],
    notHere: [
      { what: "The app customers download", goesIn: [9] },
      { what: "The software platform provided online", goesIn: [42] },
      { what: "Accounting, bookkeeping and business administration", goesIn: [35] },
      { what: "Construction and development of the property", goesIn: [37] },
    ],
    coFile: [
      {
        n: 42,
        why: "A fintech is a financial service in 36 running on software in 42 — the register treats those as two different things and so do competitors.",
      },
      {
        n: 9,
        why: "The downloadable app is a class 9 good.",
      },
      {
        n: 35,
        why: "Marketplace, distribution and business-administration work sits in 35.",
      },
      {
        n: 45,
        why: "Legal and compliance services offered alongside are class 45.",
      },
    ],
    faqs: [
      {
        q: "Fintech: class 36, 42 or 9?",
        a: "The financial service is 36, software provided online is 42, and the downloadable app is 9. Most fintechs file all three, because a name held in only one of them can be taken by somebody else in the other two.",
      },
      {
        q: "Is a real-estate developer class 36 or class 37?",
        a: "Building is class 37; selling, leasing and managing the finished property is class 36. Developers who do both file both, and the architectural work adds class 42.",
      },
    ],
  },
  {
    n: 37,
    heading:
      "Construction services; installation and repair services; mining extraction, oil and gas drilling.",
    quoted: true,
    short: "Construction, installation and repair",
    family: "Construction and utility services",
    plain:
      "Work done on physical things — civil construction, fit-outs, installation, maintenance and repair, cleaning of buildings, pest control, mining and drilling.",
    examples: [
      "A civil-construction or infrastructure contractor",
      "An interior fit-out and turnkey projects firm",
      "An appliance or vehicle service network",
      "A solar installation business",
      "A pest-control service",
      "A facility-maintenance and building-cleaning company",
    ],
    notHere: [
      { what: "The materials used on the job", goesIn: [19, 6] },
      { what: "Architecture, engineering design and drawings", goesIn: [42] },
      { what: "Selling or leasing the finished property", goesIn: [36] },
      { what: "Laundry and treatment of materials", goesIn: [40] },
    ],
    coFile: [
      {
        n: 19,
        why: "Contractors that sell materials under the same name need the goods class as well as the service class.",
      },
      {
        n: 42,
        why: "Design and engineering supplied to the client is class 42, and most construction brands do both.",
      },
      {
        n: 36,
        why: "Development, sale and property management are class 36.",
      },
      {
        n: 35,
        why: "Dealer networks and the trade counter are class 35.",
      },
    ],
    faqs: [
      {
        q: "Builder or developer — which class?",
        a: "Construction is class 37 and selling or leasing what you built is class 36, so most developers file both; the design work is class 42. A developer registered only in 37 has protected the site work and not the sales office.",
      },
      {
        q: "Is a service centre class 37?",
        a: "Repair, maintenance and installation are class 37. The spare parts sold under the same name belong in whichever goods class covers the part.",
      },
    ],
  },
  {
    n: 38,
    heading: "Telecommunications services.",
    quoted: true,
    short: "Telecommunications",
    family: "Communications and transport",
    plain:
      "Carrying signals and messages — telecom operators, internet providers, messaging and calling services, broadcast transmission. It is the pipe, not what flows through it.",
    examples: [
      "An internet service provider",
      "A telecom operator or virtual network operator",
      "A messaging or calling service, for its transmission half",
      "A video-conferencing service",
      "A bulk-SMS or communications-platform provider",
      "A broadcaster's transmission arm",
    ],
    notHere: [
      { what: "The content that is broadcast or streamed", goesIn: [41] },
      { what: "The software platform itself", goesIn: [42] },
      { what: "Handsets, routers and network hardware", goesIn: [9] },
      { what: "Advertising sold around the content", goesIn: [35] },
    ],
    coFile: [
      {
        n: 42,
        why: "The platform behind the transmission is class 42, and almost nothing in this space is only a pipe.",
      },
      {
        n: 41,
        why: "Programmes, courses and entertainment carried over the network are class 41.",
      },
      {
        n: 9,
        why: "Devices, SIMs and downloadable clients are class 9 goods.",
      },
    ],
    faqs: [
      {
        q: "Does a social or messaging app need class 38?",
        a: "Transmitting messages between users is class 38, the platform is class 42, and content offered as entertainment is class 41. Which of the three apply depends on what the product really does — worth an attorney's view rather than a default answer.",
      },
      {
        q: "Is a streaming service class 38?",
        a: "The transmission touches class 38; the programmes themselves are class 41. Streaming brands usually hold both, because a competitor taking the name in 41 would be using it on the thing viewers actually watch.",
      },
    ],
  },
  {
    n: 39,
    heading: "Transport; packaging and storage of goods; travel arrangement.",
    quoted: true,
    short: "Transport, storage and travel",
    family: "Communications and transport",
    plain:
      "Moving and keeping things or people — logistics and courier, taxi and fleet operations, warehousing, packing goods for transport, travel booking and tours.",
    examples: [
      "A courier and last-mile delivery company",
      "A cab or bike-taxi operator",
      "A third-party logistics and warehousing provider",
      "A travel agency or tour operator",
      "A cold-chain and transport company",
      "A bus or fleet operator",
    ],
    notHere: [
      { what: "The vehicles themselves", goesIn: [12] },
      { what: "Vehicle repair and servicing", goesIn: [37] },
      { what: "Hotels and places to stay", goesIn: [43] },
      { what: "The booking app and the platform", goesIn: [9, 42] },
    ],
    coFile: [
      {
        n: 43,
        why: "Travel businesses cross from moving people to housing them, and that is the 39/43 line.",
      },
      {
        n: 42,
        why: "The booking or dispatch platform is class 42.",
      },
      {
        n: 12,
        why: "A fleet operator that puts its own name on the vehicle needs class 12 as well.",
      },
      {
        n: 35,
        why: "If you also sell the goods you deliver, that is retail in class 35.",
      },
    ],
    faqs: [
      {
        q: "A delivery startup: class 39 or class 35?",
        a: "Carrying the parcel is class 39. Running the marketplace that sells what is in it is class 35. Quick-commerce brands usually need both, plus 42 for the platform and 9 for the app.",
      },
      {
        q: "Is warehousing class 39?",
        a: "Storage of goods is named in the class 39 heading, alongside transport and packaging. The warehouse building itself is not a trademark question at all.",
      },
    ],
  },
  {
    n: 40,
    heading:
      "Treatment of materials; recycling of waste and trash; air purification and treatment of water; printing services; food and drink preservation.",
    quoted: true,
    short: "Manufacturing to order and material treatment",
    family: "Construction and utility services",
    plain:
      "Doing something to somebody else's material, or making goods to their order — job work and contract manufacturing, printing, dyeing, tailoring, recycling, water and air treatment, food preservation.",
    examples: [
      "A garment unit doing job work for other brands",
      "A commercial printing press",
      "A dyeing, washing and fabric-finishing house",
      "A recycling and waste-processing company",
      "A laundry and dry-cleaning chain",
      "A 3D-printing or precision-fabrication service",
    ],
    notHere: [
      { what: "The finished goods you sell under your own name", goesIn: [25, 16] },
      { what: "Repair and maintenance of something that already exists", goesIn: [37] },
      { what: "Designing the thing being made", goesIn: [42] },
      { what: "Selling the output to the public", goesIn: [35] },
    ],
    coFile: [
      {
        n: 42,
        why: "Design and development supplied alongside the manufacturing is class 42.",
      },
      {
        n: 37,
        why: "The 37/40 line — repairing an existing object versus working on material — catches out most industrial-service businesses.",
      },
      {
        n: 35,
        why: "Trading, sourcing and distribution under the same name are class 35.",
      },
      {
        n: 25,
        why: "A contract manufacturer that launches its own label needs the goods class too.",
      },
    ],
    faqs: [
      {
        q: "Contract manufacturer or private-label unit — which class?",
        a: "Making goods to another party's order is a service, class 40. If you also sell under your own label, that label needs the goods class as well; the two rights protect different halves of the same factory.",
      },
      {
        q: "Is printing class 16 or class 40?",
        a: "Printing done for customers is class 40. Printed matter and stationery sold under your own name are class 16. A press usually does both and needs both.",
      },
    ],
  },
  {
    n: 41,
    heading: "Education; providing of training; entertainment; sporting and cultural activities.",
    quoted: true,
    short: "Education, entertainment and events",
    family: "Education and entertainment",
    plain:
      "Teaching, training, entertaining, publishing online, and organising sport and culture — schools and coaching, edtech courses, studios and content, events, leagues, gyms as training.",
    examples: [
      "An edtech running courses online",
      "A coaching institute or school",
      "A film, music or content studio",
      "An event, festival or conference organiser",
      "An esports league or gaming community",
      "A yoga studio or fitness-training brand",
    ],
    notHere: [
      { what: "The downloadable app or course file", goesIn: [9] },
      { what: "The platform the course runs on", goesIn: [42] },
      { what: "Printed books and workbooks", goesIn: [16] },
      { what: "Hostel, canteen and accommodation", goesIn: [43] },
    ],
    coFile: [
      {
        n: 42,
        why: "Teaching is class 41 and the software it is delivered through is class 42 — an edtech needs both or it has protected only one of them.",
      },
      {
        n: 9,
        why: "Downloadable courses, apps and recorded content are class 9 goods.",
      },
      {
        n: 16,
        why: "Printed study material under the same name is class 16.",
      },
      {
        n: 35,
        why: "A platform that also sells other people's courses is doing retail, class 35.",
      },
    ],
    faqs: [
      {
        q: "Edtech: class 41 or class 42?",
        a: "Teaching and training are class 41; the software platform is class 42; the downloadable app is class 9. An edtech that files only 42 has protected its software and left the name of its school unregistered.",
      },
      {
        q: "Is a gym class 41 or class 44?",
        a: "Training and sporting activities are class 41. Medical, therapeutic and beauty treatment is class 44. Studios that offer physiotherapy alongside classes are usually in both.",
      },
    ],
  },
  {
    n: 42,
    heading:
      "Scientific and technological services and research and design relating thereto; industrial analysis, industrial research and industrial design services; quality control and authentication services; design and development of computer hardware and software.",
    quoted: true,
    short: "Software, IT and design services",
    family: "Technology services",
    plain:
      "Scientific and technological services, research, design, and the whole of software as a service — SaaS, hosted platforms, app development, industrial and product design, architecture, testing and certification.",
    examples: [
      "A SaaS product sold by subscription",
      "A software development or IT services firm",
      "An AI product delivered over the web",
      "An architecture, product or UI design studio",
      "A testing, inspection and certification lab",
      "A cloud hosting or infrastructure provider",
    ],
    notHere: [
      { what: "Downloadable apps and installed software", goesIn: [9] },
      { what: "Marketplaces, business consulting and advertising", goesIn: [35] },
      { what: "Transmission of the data", goesIn: [38] },
      { what: "Teaching people to use or build the software", goesIn: [41] },
      { what: "The financial service the software delivers", goesIn: [36] },
    ],
    coFile: [
      {
        n: 9,
        why: "The most-filed pair on the register for software businesses: hosted software in 42, downloadable app in 9. Products with both a web app and a mobile app need both.",
      },
      {
        n: 35,
        why: "If the platform brings other people's goods or services together for sale, that half is retail in class 35.",
      },
      {
        n: 36,
        why: "Payments, lending and insurance delivered through the software are class 36.",
      },
      {
        n: 41,
        why: "Courses, content and community around the product are class 41.",
      },
    ],
    faqs: [
      {
        q: "Class 42 or class 9 for software?",
        a: "The split is delivery. Software provided online without a download is a service, class 42. Software supplied as a file the customer installs is a good, class 9. A product with a website and an app is normally both.",
      },
      {
        q: "Is my SaaS fully covered by class 42 alone?",
        a: "Class 42 covers the software and its development. It does not cover the marketplace (35), the payment (36), the content (41) or the downloadable app (9). Which of those you need is a question about what your product actually does, and it is worth putting to an attorney before you file rather than after somebody else has.",
      },
    ],
  },
  {
    n: 43,
    heading: "Services for providing food and drink; temporary accommodation.",
    quoted: true,
    short: "Restaurants, cafés and hotels",
    family: "Hospitality",
    plain:
      "Serving food and drink, and putting people up — restaurants, cafés, cloud kitchens, catering, hotels, homestays, hostels and co-living.",
    examples: [
      "A restaurant or QSR chain",
      "A cloud kitchen brand",
      "A café and bakery outlet, for the serving half",
      "A hotel, resort or homestay brand",
      "A catering company",
      "A hostel or co-living operator",
    ],
    notHere: [
      { what: "Packaged food sold under the same name", goesIn: [29, 30] },
      { what: "Bottled drinks", goesIn: [32, 33] },
      { what: "Delivery as a transport service", goesIn: [39] },
      { what: "The ordering app and the platform", goesIn: [9, 42] },
    ],
    coFile: [
      {
        n: 30,
        why: "The day a restaurant sells its own masala, sauce or coffee, that packet is class 30 and class 43 does not reach it.",
      },
      {
        n: 29,
        why: "Frozen, ready-to-cook and dairy products under the same name are class 29.",
      },
      {
        n: 39,
        why: "Running your own delivery fleet is a class 39 transport service.",
      },
      {
        n: 42,
        why: "The ordering platform and the app behind it are class 42 and class 9.",
      },
    ],
    faqs: [
      {
        q: "My restaurant also sells its own masala packs.",
        a: "Serving the food is class 43 and the packet is class 30. The packet is the half a copycat can put on a shelf next to yours, and it is the half a class 43 registration does not protect.",
      },
      {
        q: "Cloud kitchen: class 43 or class 39?",
        a: "Cooking and providing the food is class 43. The delivery leg is class 39. If you also run the aggregator, add 35 for the marketplace and 42 for the platform.",
      },
    ],
  },
  {
    n: 44,
    heading:
      "Medical services; veterinary services; hygienic and beauty care for human beings or animals; agriculture, aquaculture, horticulture and forestry services.",
    quoted: true,
    short: "Medical, beauty and agricultural services",
    family: "Health and personal services",
    plain:
      "Services performed on people, animals or plants — hospitals and clinics, telemedicine, dentistry, diagnostics, salons and spas, veterinary care, landscaping and agronomy.",
    examples: [
      "A hospital or clinic chain",
      "A telemedicine or online-consultation service",
      "A diagnostic laboratory chain",
      "A salon, spa or aesthetics brand",
      "A veterinary clinic or pet-care service",
      "A landscaping, nursery or agronomy service",
    ],
    notHere: [
      { what: "Medicines and health preparations", goesIn: [5] },
      { what: "Devices and instruments", goesIn: [10] },
      { what: "The pharmacy shop and the online chemist", goesIn: [35] },
      { what: "Fitness training and yoga classes", goesIn: [41] },
      { what: "The teleconsult app and platform", goesIn: [9, 42] },
    ],
    coFile: [
      {
        n: 5,
        why: "Clinics and salons that sell their own preparations need class 5 or class 3 for the bottle.",
      },
      {
        n: 42,
        why: "Healthtech platforms are class 42 software carrying a class 44 service.",
      },
      {
        n: 35,
        why: "E-pharmacy, distribution and retail are class 35.",
      },
      {
        n: 10,
        why: "Devices used or sold under the same name are class 10 goods.",
      },
    ],
    faqs: [
      {
        q: "Healthtech: which classes?",
        a: "The care is class 44, the platform class 42, the app class 9, and anything you sell is class 5 or class 10. A healthtech registered only in 42 has protected its software and left the clinical name open.",
      },
      {
        q: "A salon that sells its own products.",
        a: "The salon is class 44 and the products are class 3, or class 5 if they carry a medical claim. Two rights, one brand — and the product is the one that travels.",
      },
    ],
  },
  {
    n: 45,
    heading:
      "Legal services; security services for the physical protection of tangible property and individuals; personal and social services rendered by others to meet the needs of individuals.",
    quoted: true,
    short: "Legal, security and personal services",
    family: "Health and personal services",
    plain:
      "Legal work, physical security, and personal or social services performed for individuals — including matrimonial and dating services, background verification and funeral services.",
    examples: [
      "A law firm or legal-services business",
      "A security guarding and protection agency",
      "A matrimonial or matchmaking service",
      "A background-verification firm",
      "A funeral-services business",
      "A personal concierge or social-services organisation",
    ],
    notHere: [
      { what: "Business consulting and company administration", goesIn: [35] },
      { what: "Cyber security and software-delivered protection", goesIn: [42] },
      { what: "The app the service runs on", goesIn: [9] },
      { what: "Insurance", goesIn: [36] },
    ],
    coFile: [
      {
        n: 42,
        why: "Legal-tech and matrimonial platforms are class 42 software carrying a class 45 service.",
      },
      {
        n: 35,
        why: "Company administration, compliance filings and business support are class 35.",
      },
      {
        n: 9,
        why: "The downloadable app is a class 9 good.",
      },
    ],
    faqs: [
      {
        q: "Is cyber security class 45?",
        a: "Class 45 security is the physical protection of property and people. Security delivered as software — monitoring, threat detection, encryption — is class 42, which is where most security startups actually sit.",
      },
      {
        q: "A matrimonial or dating app — which class?",
        a: "The matchmaking service is class 45, the platform is class 42, and the downloadable app is class 9. Filing only 42 protects the code and not the service people know the name for.",
      },
    ],
  },
];

// ── Shape of the cluster ─────────────────────────────────────────────

/** Goods run 1–34, services 35–45. The one structural fact in the system. */
const GOODS_MAX = 34;
const TOTAL_CLASSES = 45;

const classPath = (n: number) => `/trademark-class/${n}.html`;
const HUB_PATH = "/trademark-class/index.html";

/**
 * Mirrors the path scheme in seo/domains.ts, which publishes one page per
 * priced ending in TLDS. That cluster has no index page of its own, so a link
 * to /domains/ would be a 404 — these pages link the ending pages themselves.
 */
const domainPath = (tld: string) => `/domains/${seoSlug(tld)}.html`;

/** The published name corpus. Unconditional — every corpus name has a page. */
const NAME_INDEX = "/n/";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Endings shown in the cross-cluster block, and how far each page rotates the
 *  window. Fourteen endings and a stride of five means no two consecutive class
 *  pages open that block with the same list. */
const DOMAIN_ROWS = 5;
const DOMAIN_STRIDE = 5;

const listJoin = (parts: string[], conjunction: "and" | "or" = "and") =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} ${conjunction} ${parts[parts.length - 1]}`;

/** table.data does not style links, so cell links carry the accent inline. */
const cellLink = (href: string, text: string) =>
  `<a href="${href}" style="color:var(--accent);text-decoration:none">${esc(text)}</a>`;

const bullets = (items: string[]) =>
  `<ul style="margin:9px 0 0;padding-left:18px;font-size:14px;color:var(--ink-2)">${items
    .map((i) => `<li style="margin-bottom:5px">${esc(i)}</li>`)
    .join("")}</ul>`;

/** Lower-cases a label for the middle of a sentence, leaving internal capitals
 *  alone so "Advertising, retail and business services" does not become a
 *  sentence and "SaaS" does not become "saas". */
function softLower(label: string): string {
  const sentenceCased = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  return label === sentenceCased ? label.toLowerCase() : label;
}

const sideOf = (n: number): Side => (n <= GOODS_MAX ? "goods" : "services");

/** Visible answers and FAQPage markup render from one array, so they cannot
 *  end up saying different things. */
const faqHtml = (faqs: Faq[]) =>
  faqs
    .map(
      (f) => `    <h3 style="font-family:Fraunces,serif;font-size:18px;font-weight:500;margin:22px 0 2px">${esc(f.q)}</h3>
    <p>${esc(f.a)}</p>`,
    )
    .join("\n");

const faqLd = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

/**
 * The legal note, in one place because it must read identically on all 46
 * pages. Filing fees are absent from this cluster on purpose: the Registry
 * sets them, they are revised, and we have no verified source — printing a
 * number we cannot stand behind would break the one rule this product sells.
 */
const LEGAL_NOTE = `    <p class="note"><strong>General information, not legal advice.</strong> This page explains how the classification system is organised. It is not advice about your filing: which class or classes a mark belongs in depends on the goods and services you actually supply, and the specification is drafted word by word, not chosen off a list. Have a trademark attorney confirm the classes and the wording before you file. We publish no filing fees anywhere on this site — they are set by the Registry and revised from time to time, and we have no verified source for them, so take them from the Registry's own schedule.</p>`;

interface Cluster {
  /** Published classes, ascending. */
  all: NiceClass[];
  byN: Map<number, NiceClass>;
  /** For each class, the classes that name it in their own coFile list. */
  namedBy: Map<number, number[]>;
  byFamily: Map<string, number[]>;
  ctx: SeoCtx;
}

/** A link to a class page, or its plain label when that class did not publish
 *  — the cluster must never link a file the build did not write. */
function classLink(n: number, cl: Cluster, label?: string): string {
  const target = cl.byN.get(n);
  const text = label ?? `class ${n}`;
  return target ? cellLink(classPath(n), text) : esc(text);
}

/** The 45-row index table every page carries. Shared boilerplate by design:
 *  the reader who lands on class 25 from a search should be able to find their
 *  own class without a second query. */
function indexTable(cl: Cluster, here: number | null): string {
  const rows = cl.all
    .map((c) => {
      const isHere = c.n === here;
      const label = isHere
        ? `<strong>Class ${c.n}</strong>`
        : cellLink(classPath(c.n), `Class ${c.n}`);
      const what = isHere ? `<strong>${esc(c.short)}</strong>` : esc(c.short);
      return `          <tr${isHere ? ` style="background:var(--paper-2)"` : ""}>
            <td class="num">${label}</td>
            <td>${what}</td>
            <td>${sideOf(c.n) === "goods" ? "Goods" : "Services"}</td>
          </tr>`;
    })
    .join("\n");

  return `    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Class</th><th>What it covers</th><th>Side</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>`;
}

/**
 * The cross-cluster block. A founder who has worked out their class still has
 * to find an address, and the domain pages carry the prices — so this links to
 * them with the real figures from TLDS rather than describing them.
 *
 * The opening line names the class; the two paragraphs after it are identical
 * on every page on purpose. They state what a trademark registration and a
 * domain registration each do and do not reserve, and forty-five reworded
 * versions of a factual statement is how a factual statement drifts into
 * forty-five slightly different claims. The unique half of this block is the
 * price window, which rotates by class.
 */
function domainBlock(n: number, subject?: string): string {
  const byPrice = [...TLDS].sort((a, b) => a.priceInr - b.priceInr);
  const cheapest = byPrice[0];
  const dearest = byPrice[byPrice.length - 1];
  // n is always >= 1 here — the hub passes TOTAL_CLASSES + 1 — so the offset
  // never goes negative and the modulo stays in range.
  const shown = Array.from(
    { length: Math.min(DOMAIN_ROWS, byPrice.length) },
    (_, k) => byPrice[((n - 1) * DOMAIN_STRIDE + k) % byPrice.length],
  );

  const rows = shown
    .map(
      (t) => `          <tr>
            <td>${cellLink(domainPath(t.tld), `.${t.tld}`)}</td>
            <td class="num">${inr(t.priceInr)}</td>
          </tr>`,
    )
    .join("\n");

  return `  <section>
    <h2>The name has to clear more than one register</h2>
    <p class="sub">A class is one queue. The address is another, and it is the one that goes on the packaging.</p>
    <div class="prose">
      <p>${
        subject
          ? esc(
              `A registration in class ${n} covers ${softLower(subject)} on the register. It reserves no address, no handle and no listing — those are first-come queues run by people who have never heard of the Nice Classification.`,
            )
          : "A class number settles what a name covers on the register. It settles nothing at all about the address, the handle or the marketplace listing, which are first-come queues run by people who have never heard of the Nice Classification."
      }</p>
      <p>A trademark class and a domain name have nothing to do with each other, and each is regularly mistaken for the other. Registering a domain creates no trademark right of any kind — the registrar sells you a rental on an address and makes no enquiry into who else uses the name. A trademark registration, equally, reserves nothing at any registry: the matching address can be bought by anyone while your application sits in the queue.</p>
      <p>Which is why the practical order is to check both before printing anything. ${esc(
        `Across the ${byPrice.length} endings we price, the range runs from .${cheapest?.tld ?? ""} at ${inr(
          cheapest?.priceInr ?? 0,
        )} to .${dearest?.tld ?? ""} at ${inr(dearest?.priceInr ?? 0)}.`,
      )} Five of them, and what each costs for a first year:</p>
    </div>
    <div class="table-scroll" style="margin-top:14px">
      <table class="data">
        <thead><tr><th>Ending</th><th>First year</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p class="note">Indicative first-year prices from our own table, not a registrar quote, and not an availability answer — whether a particular name is free is a question only a live lookup can settle. Each ending has its own page with who it suits and how the check works.</p>
  </section>`;
}

// ── One class page ───────────────────────────────────────────────────

function renderClassPage(c: NiceClass, cl: Cluster): SeoDoc {
  const side = sideOf(c.n);
  const isGoods = side === "goods";
  const path = classPath(c.n);

  // Position and neighbours, both computed. A class page that asserted "class
  // 25 is the 25th goods class" by hand would drift the moment the list moved.
  const position = isGoods ? c.n : c.n - GOODS_MAX;
  const sideTotal = isGoods ? GOODS_MAX : TOTAL_CLASSES - GOODS_MAX;
  const neighbours = [c.n - 1, c.n + 1].filter(
    (n) => n >= 1 && n <= TOTAL_CLASSES && sideOf(n) === side && cl.byN.has(n),
  );

  const family = cl.byFamily.get(c.family) ?? [];
  const familySiblings = family.filter((n) => n !== c.n);

  const coFiled = c.coFile.filter((f) => cl.byN.has(f.n));
  const coFiledRows = coFiled
    .map((f) => {
      const target = cl.byN.get(f.n);
      return `          <tr>
            <td class="num">${cellLink(classPath(f.n), `Class ${f.n}`)}</td>
            <td>${esc(target?.short ?? "")}</td>
            <td>${esc(f.why)}</td>
          </tr>`;
    })
    .join("\n");

  // The reverse edge: classes that name this one as a companion. Computed, so
  // the graph is symmetrical without anybody maintaining it twice, and no page
  // in the cluster is reachable from only one direction.
  const namedBy = (cl.namedBy.get(c.n) ?? []).filter(
    (n) => !coFiled.some((f) => f.n === n),
  );

  const notHereRows = c.notHere
    .map(
      (x) => `          <tr>
            <td>${esc(x.what)}</td>
            <td>${x.goesIn.map((g) => classLink(g, cl)).join(", ")}</td>
          </tr>`,
    )
    .join("\n");

  const faqs: Faq[] = [
    {
      q: `What does trademark class ${c.n} cover?`,
      a: `${c.plain} ${
        c.quoted
          ? `The Nice Classification heading for class ${c.n} reads: ${c.heading}`
          : `We have written that scope ourselves rather than quote a heading we could not verify against the current edition.`
      }`,
    },
    {
      q: `Is class ${c.n} a goods class or a services class?`,
      a: `${
        isGoods ? "Goods" : "Services"
      }. Classes 1 to 34 cover goods and classes 35 to 45 cover services, and class ${c.n} is the ${position}${ordinalSuffix(
        position,
      )} of the ${sideTotal} ${side} classes. The distinction matters more than it looks: the thing you sell and the service you perform around it are different classes even when they carry the same name, which is why a manufacturer that also runs a shop, or a studio that also sells a product, ends up on both sides of the line.`,
    },
    {
      q: `Does registering in class ${c.n} protect my name in the other 44 classes?`,
      a: `No. A registration is a right in the classes it names and nowhere else, so a mark registered in class ${c.n} leaves the same name available to somebody else in the remaining ${
        TOTAL_CLASSES - 1
      }. The rule read the other way is the useful half: a mark somebody else holds in a class unrelated to yours generally cannot stop you, which is how identical names co-exist across unrelated industries. Well-known marks are the exception the system carves out for itself, and whether a mark is well known is decided by the Registry rather than by the class list.`,
    },
    ...c.faqs,
    {
      q: `Can this page tell me whether a name is already registered in class ${c.n}?`,
      a: `No, and no static page can. This file was built ahead of time and serves the same bytes to everyone, while applications and registrations move daily. The register is maintained by the Office of the Controller General of Patents, Designs and Trade Marks, and its public search is free to use — this page is for working out which class to search in, which is the question that has to be answered first.`,
    },
  ];

  const title = `Trademark class ${c.n} in India — ${c.short}: what files in it and what does not | Naam Dekho`;

  const metaDesc = `Trademark class ${c.n} covers ${softLower(
    c.short,
  )} — a ${side} class. What businesses actually file in class ${c.n}, what belongs in a different class instead, the ${
    coFiled.length
  } classes usually filed alongside it, and all 45 classes in one table. General information, not legal advice.`;

  const body = `
  <h1>Trademark class ${c.n} — ${esc(c.short)}</h1>
  <p class="lede">${esc(c.plain)}</p>
  <p class="lede">Below: ${
    c.quoted ? "the official class heading" : "what the class covers"
  }, ${c.examples.length} kinds of business that file here, ${
    c.notHere.length
  } things that get filed here by mistake and where each actually belongs, the ${
    coFiled.length
  } classes usually filed alongside class ${c.n}, and all ${TOTAL_CLASSES} classes in one table.</p>

  <div class="tags">
    <span class="tag">Class ${c.n}</span>
    <span class="tag">${isGoods ? "Goods" : "Services"}</span>
    <span class="tag">${position} of ${sideTotal} ${side} classes</span>
    <span class="tag">${esc(c.family)}</span>
  </div>

  <section>
    <h2>${c.quoted ? `The class ${c.n} heading` : `What class ${c.n} covers`}</h2>
    <p class="sub">${
      c.quoted
        ? "As published in the Nice Classification, the WIPO list the Indian register is organised on."
        : "Our own scope summary — see the note below for why this one is not a quotation."
    }</p>
    <div class="card" style="border-left:3px solid var(--accent)">
      <div class="k">${c.quoted ? `Nice Classification — class ${c.n}` : `Class ${c.n} — scope, in our words`}</div>
      <p style="margin:8px 0 0;font-size:15px;color:var(--ink-2)">${esc(c.heading)}</p>
    </div>
    <p class="note">${
      c.quoted
        ? `Transcribed from the Nice Classification (11th edition). WIPO revises these headings between editions, and a heading describes a class rather than closing the list of what falls in it — the Registry's own list of goods and services is what governs a filing.`
        : `This is not a quotation. The official wording of the class ${c.n} heading was materially reworded between recent editions and we could not verify which text is current, so rather than present a sentence of ours as WIPO's we have written the scope plainly and labelled it as ours. Take the current heading from WIPO's own published list.`
    }</p>
  </section>

  <section>
    <h2>Who files in class ${c.n}</h2>
    <p class="sub">Concrete enough to recognise yourself in, or to rule yourself out. These are our judgements, not the Registry's.</p>
    <div class="cards">
      <div class="card">
        <div class="k">Files here</div>
        ${bullets(c.examples)}
      </div>
      <div class="card">
        <div class="k">Does not file here</div>
        ${bullets(c.notHere.map((x) => `${x.what} — ${x.goesIn.map((g) => `class ${g}`).join(" or ")}`))}
      </div>
    </div>
  </section>

  <section>
    <h2>What people file in class ${c.n} by mistake</h2>
    <p class="sub">Each of these belongs in a class of its own, linked. Getting it wrong is not fatal, but it is slow and it is paid for twice.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Not in class ${c.n}</th><th>Where it goes</th></tr></thead>
        <tbody>
${notHereRows}
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>Goods or services — and which side class ${c.n} is on</h2>
    <p class="sub">The first cut in the whole system, and the one that decides half of all misfilings.</p>
    <div class="cards">
      <div class="card">
        <div class="k">Side</div>
        <div class="v" style="font-size:26px">${isGoods ? "Goods" : "Services"}</div>
        <div class="n">Classes ${isGoods ? "1 to 34" : "35 to 45"}</div>
      </div>
      <div class="card">
        <div class="k">Position</div>
        <div class="v" style="font-size:26px">${position} of ${sideTotal}</div>
        <div class="n">${isGoods ? `${GOODS_MAX} goods classes in all` : `${TOTAL_CLASSES - GOODS_MAX} service classes in all`}</div>
      </div>
      <div class="card">
        <div class="k">Neighbours</div>
        <div class="v" style="font-size:22px">${
          neighbours.length ? neighbours.map((n) => classLink(n, cl, `${n}`)).join(" · ") : "—"
        }</div>
        <div class="n">${neighbours.length ? `Classes ${listJoin(neighbours.map(String))}` : `At the edge of the ${side} classes`}</div>
      </div>
    </div>
    <div class="prose" style="margin-top:16px">
      <p>Classes 1 to 34 are goods — things somebody makes and somebody else owns afterwards. Classes 35 to 45 are services — things somebody does. Class ${c.n} is on the ${side} side, which means a registration here covers ${
        isGoods
          ? "the article you sell and not the service you perform around it. Selling it in your own shop, making it to somebody else's order, delivering it, teaching people to use it — those are separate classes on the other side of the line."
          : "the service you perform and not the goods you sell while performing it. The moment the same name goes onto a product, a packet or a downloadable file, it needs a goods class as well."
      }</p>
      <p>Neighbouring numbers are not neighbouring businesses. The classification was assembled over decades and its order is historical, so class ${c.n} sits beside ${
        neighbours.length ? listJoin(neighbours.map((n) => `class ${n}`)) : "the edge of its side"
      } for reasons that have nothing to do with what a modern company sells. Read down the table at the foot of this page rather than around a number.</p>
    </div>
  </section>

  <section>
    <h2>Filing in class ${c.n} protects class ${c.n}</h2>
    <p class="sub">The single most expensive misunderstanding in Indian trademark filing.</p>
    <div class="prose">
      <p>A trademark registration is a right in the classes named on it. Registering in class ${c.n} gives you nothing in the other ${
        TOTAL_CLASSES - 1
      }: the identical name remains available to somebody else in every class you did not file, and they can register it there. This is not a loophole — it is the design. The classification exists precisely so that the same word can belong to a shoe company and to a software company at once.</p>
      <p>Read the other way it is the reassuring half. A mark already registered in a class unrelated to yours generally cannot stop you using the name in yours, which is why a search that comes back with hits is not automatically a dead end — what matters is whether the hits are in your class and near your goods. Well-known marks are the exception the system writes for itself, and whether a mark is well known is a finding the Registry makes, not something read off a list.</p>
      <p>The practical consequence is that the classes you file describe the business you intend to be, not only the one you are. Extending into a class later means filing later — at that day's queue, and against whatever has been registered in the meantime by somebody who read this page sooner.</p>
    </div>
${LEGAL_NOTE}
  </section>

  <section>
    <h2>Classes usually filed with class ${c.n}</h2>
    <p class="sub">Why each one comes up. Our judgement, from the way these businesses are actually built.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Class</th><th>Covers</th><th>Why it comes up with class ${c.n}</th></tr></thead>
        <tbody>
${coFiledRows}
        </tbody>
      </table>
    </div>
${
  namedBy.length
    ? `    <p class="sub" style="margin-top:18px">Classes that name class ${c.n} as their companion</p>
    <div class="related">
      ${namedBy
        .map((n) => `<a href="${classPath(n)}">Class ${n} — ${esc(cl.byN.get(n)?.short ?? "")}</a>`)
        .join("\n      ")}
    </div>`
    : ""
}
  </section>

${
  familySiblings.length
    ? `  <section>
    <h2>The rest of ${esc(softLower(c.family))}</h2>
    <p class="sub">Classes that sit in the same part of the classification as class ${c.n}.</p>
    <div class="grid-links">
      ${familySiblings
        .map(
          (n) =>
            `<a href="${classPath(n)}">Class ${n} — ${esc(cl.byN.get(n)?.short ?? "")}</a>`,
        )
        .join("\n      ")}
    </div>
  </section>
`
    : ""
}
${domainBlock(c.n, c.short)}

  <section class="prose">
    <h2>Questions about class ${c.n}</h2>
${faqHtml(faqs)}
  </section>

  <section>
    <h2>All ${TOTAL_CLASSES} classes</h2>
    <p class="sub">The whole classification, goods first. The same table appears on every class page, so whichever one you landed on carries the full picture.</p>
${indexTable(cl, c.n)}
  </section>

${ctaBlock(
  `Check the name before you file in class ${c.n}`,
  `One search runs the domain endings, the social handles and the marketplace listings together, so you find out the name is gone before the specification is drafted rather than after.`,
)}

  <section class="hub-sec">
    <p class="sub">More</p>
    <div class="related">
      <a href="${HUB_PATH}">Which class is my business in?</a>
      ${neighbours.map((n) => `<a href="${classPath(n)}">Class ${n}</a>`).join("\n      ")}
      <a href="${domainPath("in")}">.in domain prices</a>
      <a href="${NAME_INDEX}">The published name corpus</a>
      <a href="/how-it-works">What the check actually does</a>
    </div>
  </section>
`;

  return {
    path,
    html: renderSeoPage({
      title,
      metaDesc,
      path,
      siteOrigin: cl.ctx.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Trademark classes", href: HUB_PATH },
        { label: `Class ${c.n}` },
      ],
      // FAQPage only. The 45-row index table is a listing, but marking it up as
      // an ItemList on all 45 pages would publish the same 45 items 45 times,
      // and structured data that looks like duplication is the kind that gets
      // ignored site-wide. The hub carries the ItemList once instead.
      jsonLd: [faqLd(faqs)],
      body,
    }),
    priority: "0.8",
    changefreq: "monthly",
  };
}

function ordinalSuffix(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
}

// ── The hub ──────────────────────────────────────────────────────────

/**
 * The hub answers a different query from its children. A class page answers
 * "what is trademark class 25"; this one answers "which class is my business
 * in", which is the question somebody types before they know a number exists.
 * So its substance is the router below — every business we name across all 45
 * profiles, in one alphabetical table pointing at its class — and that table
 * exists on no other page.
 */
function renderHub(cl: Cluster): SeoDoc {
  const goods = cl.all.filter((c) => sideOf(c.n) === "goods");
  const services = cl.all.filter((c) => sideOf(c.n) === "services");

  // Every example from every profile, alphabetised. Generated, so a class that
  // gains an example gains a row here in the same build.
  const sortKey = (s: string) => s.replace(/^(a|an|the)\s+/i, "").toLowerCase();
  const router = cl.all
    .flatMap((c) => c.examples.map((ex) => ({ ex, c })))
    .sort((a, b) => sortKey(a.ex).localeCompare(sortKey(b.ex)));

  const routerRows = router
    .map(
      (r) => `          <tr>
            <td>${esc(r.ex)}</td>
            <td class="num">${cellLink(classPath(r.c.n), `Class ${r.c.n}`)}</td>
            <td>${esc(r.c.short)}</td>
          </tr>`,
    )
    .join("\n");

  // Which classes the profiles name as companions most often. A real count
  // over the graph rather than an assertion about what founders file.
  const degree = cl.all
    .map((c) => ({ c, count: (cl.namedBy.get(c.n) ?? []).length }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count || a.c.n - b.c.n)
    .slice(0, 8);

  const degreeRows = degree
    .map(
      (d) => `          <tr>
            <td class="num">${cellLink(classPath(d.c.n), `Class ${d.c.n}`)}</td>
            <td>${esc(d.c.short)}</td>
            <td class="num">${d.count}</td>
          </tr>`,
    )
    .join("\n");

  const faqs: Faq[] = [
    {
      q: "How do I work out which trademark class my business is in?",
      a: `Start from what you supply rather than from what industry you are in. If you sell a thing somebody takes away, you are looking at the goods classes, 1 to 34. If you do something for somebody, you are looking at the services classes, 35 to 45. Most businesses supply both — a clothing label that also runs a shop, a software product that is also an app, a restaurant that also sells a masala packet — and those are separate classes even under one name. The table on this page lists ${
        router.length
      } kinds of business against the class each falls in, which is a faster route in than reading 45 headings.`,
    },
    {
      q: "How many classes do I need to file in?",
      a: "As many as describe what you actually supply, and each one is a separate right that is applied for and paid for separately. There is no combined filing that covers everything, and no discount for breadth. The usual advice runs the other way from what founders expect: file the classes your business genuinely occupies today plus the ones it will occupy shortly, rather than a defensive spread you cannot show use in. Where that line falls for you is a question for a trademark attorney.",
    },
    {
      q: "Is there one class that covers all 45?",
      a: `No. There is no omnibus class and no registration that reaches beyond the classes it names. A mark registered in one class leaves the same name available to somebody else in the other ${
        TOTAL_CLASSES - 1
      }, which is exactly how identical names co-exist across unrelated industries.`,
    },
    {
      q: "Which class is software in — 9 or 42?",
      a: "Both, usually, and the split is delivery rather than technology. Software supplied as a file the customer downloads and installs is a good, class 9. Software made available online without a download is a service, class 42. A product with a web app and a mobile app is in both, and most software businesses add a third class for what the software does — 35 for a marketplace, 36 for payments, 41 for courses, 44 for care.",
    },
    {
      q: "What is the difference between the goods classes and the services classes?",
      a: `Classes 1 to ${GOODS_MAX} cover goods — things that are made and then owned by somebody else. Classes ${
        GOODS_MAX + 1
      } to ${TOTAL_CLASSES} cover services — things that are done. The line runs through the middle of most modern businesses, and crossing it without noticing is the commonest gap we see: the manufacturer who never registered the shop, the platform that never registered the service it delivers.`,
    },
    {
      q: "Do these 45 classes mean the same thing outside India?",
      a: "The class numbers come from the Nice Classification, an international list published by WIPO, so class 25 covers broadly the same territory of goods wherever it is used. What does not travel is everything around it: filing, examination, opposition and the rights that follow are national, and a registration in one country is not a registration in another.",
    },
    {
      q: "Where do I search what is already registered?",
      a: "On the register itself. The trademark register is maintained by the Office of the Controller General of Patents, Designs and Trade Marks, and its public search is free to use. These pages are for working out which class to search in — the question that has to be answered before a search means anything — and they cannot tell you what is registered today, because a static file cannot know.",
    },
  ];

  const title = `All 45 trademark classes in India — which class is my business in? | Naam Dekho`;

  const metaDesc = `The 45 Nice classes with what each covers, ${router.length} kinds of business matched to the class they file in, the goods-versus-services split, and why a registration in one class protects only that class. General information, not legal advice.`;

  const body = `
  <h1>Which trademark class is my business in?</h1>
  <p class="lede">There are 45 classes. Goods are 1 to ${GOODS_MAX}, services are ${
    GOODS_MAX + 1
  } to ${TOTAL_CLASSES}, and a registration covers only the classes it names. Most businesses sit in two or three of them and file one, which is the gap this page exists to close.</p>
  <p class="lede">Below: ${router.length} kinds of business against the class each falls in, the full ${TOTAL_CLASSES}-class table, and which classes get filed together most often.</p>

  <div class="tags">
    <span class="tag">${TOTAL_CLASSES} classes</span>
    <span class="tag">${goods.length} goods · ${services.length} services</span>
    <span class="tag">${router.length} businesses mapped</span>
    <span class="tag">No filing fees quoted</span>
  </div>

  <section>
    <h2>Goods or services first</h2>
    <p class="sub">The first cut in the system, and the one that decides half of all misfilings.</p>
    <div class="cards">
      <div class="card">
        <div class="k">Goods</div>
        <div class="v">1–${GOODS_MAX}</div>
        <div class="n">Things somebody makes and somebody else owns afterwards</div>
      </div>
      <div class="card">
        <div class="k">Services</div>
        <div class="v">${GOODS_MAX + 1}–${TOTAL_CLASSES}</div>
        <div class="n">Things somebody does for somebody else</div>
      </div>
      <div class="card">
        <div class="k">Classes in all</div>
        <div class="v">${TOTAL_CLASSES}</div>
        <div class="n">Each one a separate registration</div>
      </div>
    </div>
    <div class="prose" style="margin-top:16px">
      <p>Almost every business a founder starts today crosses the line. A clothing label sells garments in class 25 and runs a shop in class 35. A software product is a downloadable app in class 9 and a hosted platform in class 42. A restaurant serves food in class 43 and puts its own masala on a shelf in class 30. The name is one word to the customer and several separate rights on the register, and the halves that get left unfiled are the halves a copycat can take without doing anything unlawful.</p>
      <p>The order that works: decide what you actually supply, find each of those in the table below, then have an attorney draft the specification. The specification — the exact wording of the goods and services inside the class — does more work than the class number, and it is not something to copy off a website.</p>
    </div>
  </section>

  <section>
    <h2>${router.length} businesses and the class they file in</h2>
    <p class="sub">Every business named across the ${cl.all.length} class pages, alphabetically. Ours, not the Registry's — a starting point for the search, not a substitute for advice.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>If this is your business</th><th>Class</th><th>Which covers</th></tr></thead>
        <tbody>
${routerRows}
        </tbody>
      </table>
    </div>
    <p class="note">One row is rarely the whole answer. Most of these businesses need a second class for the other half of what they do — the shop, the platform, the app, the packet — and each class page says which.</p>
  </section>

  <section>
    <h2>All ${TOTAL_CLASSES} classes</h2>
    <p class="sub">Goods first, then services. Every row links to what falls in that class and what does not.</p>
${indexTable(cl, null)}
  </section>

${
  degreeRows
    ? `  <section>
    <h2>The classes that come up alongside everything else</h2>
    <p class="sub">Counted across all ${cl.all.length} profiles: how many other classes name each of these as a companion.</p>
    <div class="table-scroll">
      <table class="data">
        <thead><tr><th>Class</th><th>Covers</th><th>Named by</th></tr></thead>
        <tbody>
${degreeRows}
        </tbody>
      </table>
    </div>
    <p class="note">This is a count over our own profiles, not a statistic about the register. It says which classes we found ourselves pointing at again and again while writing the other 44 — which is a fair description of where the gaps in a founder's filing usually are, and no more than that.</p>
  </section>
`
    : ""
}
  <section>
    <h2>One class protects one class</h2>
    <p class="sub">The most expensive misunderstanding in Indian trademark filing.</p>
    <div class="prose">
      <p>A registration is a right in the classes named on it and nowhere else. Filing class 25 gives you nothing in class 35; filing class 42 gives you nothing in class 9. The identical name stays available to somebody else in every class you did not file, and they can register it there — not as a loophole, but because the classification is built to let one word belong to a shoe company and a software company at the same time.</p>
      <p>Read the other way it is the reassuring half: a mark held by somebody else in a class unrelated to yours generally cannot stop you in yours. A search that returns hits is not automatically a dead end. What matters is whether the hits sit in your class and near your goods, and that is a judgement rather than a lookup.</p>
    </div>
${LEGAL_NOTE}
  </section>

${domainBlock(TOTAL_CLASSES + 1)}

  <section class="prose">
    <h2>Questions founders ask about the classes</h2>
${faqHtml(faqs)}
  </section>

${ctaBlock(
  "Check the name before you pick the class",
  "One search runs the domain endings, the social handles and the marketplace listings together — so a name that is already gone costs you an afternoon rather than a filing.",
)}

  <section class="hub-sec">
    <p class="sub">More</p>
    <div class="related">
      <a href="${domainPath("in")}">.in domain prices</a>
      <a href="${domainPath("com")}">.com domain prices</a>
      <a href="${NAME_INDEX}">The published name corpus — ${inr(cl.ctx.corpus.length)} names</a>
      <a href="/how-it-works">What the check actually does</a>
    </div>
  </section>
`;

  return {
    path: HUB_PATH,
    html: renderSeoPage({
      title,
      metaDesc,
      path: HUB_PATH,
      siteOrigin: cl.ctx.siteOrigin,
      crumbs: [
        { label: "Home", href: "/" },
        { label: "Trademark classes" },
      ],
      jsonLd: [
        faqLd(faqs),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Trademark classes, Nice Classification 1 to 45",
          numberOfItems: cl.all.length,
          itemListElement: cl.all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `Trademark class ${c.n} — ${c.short}`,
            url: `${cl.ctx.siteOrigin}${classPath(c.n)}`,
          })),
        },
      ],
      body,
    }),
    // Below the class pages deliberately. "Trademark class 25 India" is
    // answered by a class page; this one is how a reader who does not yet know
    // their number gets to it, and how the crawler reaches all 45.
    priority: "0.7",
    changefreq: "monthly",
  };
}

/**
 * Builds the trademark cluster: one page per publishable Nice class, plus the
 * hub.
 *
 * The co-filing graph is built before anything renders because the pages need
 * each other — a class page prints the classes that name it as a companion,
 * which cannot be known from its own profile — and because every cross-link is
 * filtered against what actually published. A class thinned below the rule 2
 * threshold disappears from the cluster and from every sibling's links in the
 * same build, rather than leaving 44 pages pointing at a file nobody wrote.
 *
 * The hub ships whenever any class page does, never conditionally: all 45 name
 * it as their breadcrumb parent, seo/domains.ts has been linking to it from
 * fourteen published pages since before this file existed, and it is the only
 * page in the cluster that answers "which class is my business in".
 */
export function buildTrademarkPages(ctx: SeoCtx): SeoDoc[] {
  const all = NICE_CLASSES.filter(isPublishable).sort((a, b) => a.n - b.n);
  if (all.length === 0) return [];

  const byN = new Map<number, NiceClass>(all.map((c) => [c.n, c]));

  const namedBy = new Map<number, number[]>();
  const byFamily = new Map<string, number[]>();
  for (const c of all) {
    byFamily.set(c.family, [...(byFamily.get(c.family) ?? []), c.n]);
    for (const f of c.coFile) {
      if (!byN.has(f.n) || f.n === c.n) continue;
      namedBy.set(f.n, [...(namedBy.get(f.n) ?? []), c.n]);
    }
  }

  const cluster: Cluster = { all, byN, namedBy, byFamily, ctx };

  return [...all.map((c) => renderClassPage(c, cluster)), renderHub(cluster)];
}
