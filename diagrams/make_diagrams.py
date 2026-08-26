"""Generate the four flow diagrams for the Naam Dekho copyright filing."""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
from matplotlib.lines import Line2D
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# Brand palette
INK = "#0F1419"
INK2 = "#3D4751"
INK3 = "#6B7480"
BG = "#FAF8F3"
BG2 = "#F3EFE5"
LINE = "#D8D0BC"
ACCENT = "#B8501C"
OK = "#1B5E20"
NO = "#880E4F"
WARN = "#8A5A00"
GOLD = "#E8C76A"


def styled_box(ax, x, y, w, h, text, fill=BG2, edge=INK, fontsize=9, fontweight="normal", textcolor=INK, radius=0.04):
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad=0.02,rounding_size={radius}",
                         linewidth=1.2, edgecolor=edge, facecolor=fill)
    ax.add_patch(box)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fontsize, fontweight=fontweight, color=textcolor,
            wrap=True)


def arrow(ax, x1, y1, x2, y2, color=INK2, style="-|>", lw=1.4):
    a = FancyArrowPatch((x1, y1), (x2, y2),
                        arrowstyle=style, mutation_scale=14,
                        color=color, linewidth=lw,
                        connectionstyle="arc3,rad=0")
    ax.add_patch(a)


# ───────────────────────────────────────────────────────────────────
# DIAGRAM 1 — HIGH-LEVEL SYSTEM ARCHITECTURE
# ───────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(11, 7.5), dpi=170)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 12)
ax.set_ylim(0, 8.5)
ax.axis("off")

ax.text(6, 8.05, "Naam Dekho — System Architecture",
        ha="center", fontsize=15, fontweight="bold", color=INK,
        family="serif")
ax.text(6, 7.65, "End-to-end data flow from user query to consolidated verdict",
        ha="center", fontsize=10, color=INK3, style="italic")

# Layer labels (left side)
for ly, txt in [(6.6, "PRESENTATION"), (5.0, "ORCHESTRATION"),
                (3.0, "DATA ACQUISITION"), (1.1, "EXTERNAL SOURCES")]:
    ax.text(0.15, ly + 0.35, txt, fontsize=7.5, color=INK3, fontweight="bold",
            rotation=90, ha="center", va="center")

# Presentation layer
styled_box(ax, 2.0, 6.5, 3.5, 0.9, "Web App (Responsive UI)\nDesktop · Mobile · PWA", fill="#FFFFFF", edge=INK)
styled_box(ax, 6.5, 6.5, 3.5, 0.9, "User Input\nName + Optional Category", fill=BG2, edge=INK)
arrow(ax, 6.5, 6.95, 5.5, 6.95)

# Orchestration layer
styled_box(ax, 2.0, 4.7, 3.5, 0.9, "Query Orchestrator\nNormalise · Tokenise · Dispatch", fill="#FFF4D9", edge=WARN)
styled_box(ax, 6.5, 4.7, 3.5, 0.9, "Real-time Results Bus\n(WebSocket Stream)", fill="#FFF4D9", edge=WARN)
arrow(ax, 5.5, 5.15, 6.5, 5.15)
arrow(ax, 3.75, 6.5, 3.75, 5.6)
arrow(ax, 8.25, 5.6, 8.25, 6.5)

# Data acquisition layer
modules = [
    (0.4, "Legal\nScanner"),
    (2.4, "Domain\nProbe"),
    (4.4, "Social\nHandle Bot"),
    (6.4, "Marketplace\nCrawler"),
    (8.4, "Brand &\nSEO Engine"),
    (10.4, "Linguistic +\nNumerology"),
]
for mx, label in modules:
    styled_box(ax, mx, 2.7, 1.5, 0.9, label, fill="#E7F2E9", edge=OK, fontsize=8)
    arrow(ax, mx + 0.75, 3.6, mx + 0.75, 4.7, color=INK3)

# Orchestrator → all modules (single arrow down)
arrow(ax, 3.75, 4.7, 3.75, 3.6, color=INK3)

# External sources
ext = [
    (0.4, "MCA · IP India\nCopyright · GST\nFSSAI · DPIIT"),
    (2.4, "WHOIS · Registrars\nGoDaddy · INRegistry"),
    (4.4, "X · IG · YT · LI\nFB · Threads · Tg"),
    (6.4, "Play · App Store\nPH · GitHub\nAmazon · Flipkart"),
    (8.4, "Google SERP\nTrends · Wikipedia"),
    (10.4, "Indic-NLP corpora\nChaldean tables"),
]
for ex, label in ext:
    styled_box(ax, ex, 0.6, 1.5, 1.6, label, fill="#FCE4EC", edge=NO, fontsize=7.2)
    arrow(ax, ex + 0.75, 2.7, ex + 0.75, 2.2, color=NO)

# Side annotations
ax.text(11.7, 4.7, "PDF Report\n→ User\n(Deep Scan)", fontsize=7.5, color=ACCENT,
        ha="center", va="center", style="italic",
        bbox=dict(boxstyle="round,pad=0.3", fc="#FFF4D9", ec=WARN, lw=1))
arrow(ax, 10.0, 5.15, 11.2, 5.15, color=ACCENT)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "01_architecture.png"), dpi=170, bbox_inches="tight",
            facecolor=BG)
plt.close()


# ───────────────────────────────────────────────────────────────────
# DIAGRAM 2 — SEARCH PIPELINE FLOW (62 PLATFORMS)
# ───────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(11, 9), dpi=170)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 12)
ax.set_ylim(0, 10.5)
ax.axis("off")

ax.text(6, 10.05, "Naam Dekho — Search & Verdict Pipeline",
        ha="center", fontsize=15, fontweight="bold", color=INK, family="serif")
ax.text(6, 9.65, "12-step process from a single name query to a consolidated legal-grade verdict",
        ha="center", fontsize=10, color=INK3, style="italic")

steps = [
    ("01", "User submits name + optional industry/category", "#FFFFFF"),
    ("02", "Input normalisation: trim · lowercase · phonetic key · Devanagari transliteration", BG2),
    ("03", "Tokenisation into 62 parallel platform-specific queries", BG2),
    ("04", "Dispatch via async task queue with rate-limit + warmed proxy pool", "#FFF4D9"),
    ("05", "Legal & Regulatory scan (MCA · IP India · Copyright · GST · DPIIT · FSSAI · others) — 11 checks", "#E7F2E9"),
    ("06", "Domain availability + price across 10 TLDs (.com .in .co.in .io .ai .app .net .org .store .tech)", "#E7F2E9"),
    ("07", "Social handle scan (IG · X · YT · LinkedIn · FB · Threads · Telegram · WhatsApp · Pinterest)", "#E7F2E9"),
    ("08", "Marketplace & Store scan (Play · App Store · Product Hunt · GitHub · Shopify · Amazon · Flipkart)", "#E7F2E9"),
    ("09", "Brand collision & SEO analysis (Google page 1 · Trends · Wikipedia · Flipkart Brand Registry)", "#E7F2E9"),
    ("10", "Linguistic & cultural check across 7+ Indian languages + Sanskrit root analysis", "#E7F2E9"),
    ("11", "Chaldean numerology computation (letter → digit → compound → ruling planet)", "#E7F2E9"),
    ("12", "Result aggregation → verdict scoring → live UI stream + PDF report (deep tier)", "#FCE4EC"),
]
top = 9.0
h = 0.55
for i, (n, t, fill) in enumerate(steps):
    y = top - i * (h + 0.12)
    styled_box(ax, 0.8, y, 0.7, h, n, fill=INK, edge=INK, textcolor="#FAF8F3",
               fontsize=10, fontweight="bold")
    styled_box(ax, 1.7, y, 10.1, h, t, fill=fill, edge=LINE,
               fontsize=8.5)
    if i < len(steps) - 1:
        arrow(ax, 1.15, y, 1.15, y - 0.12, color=INK3, lw=1.0)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "02_pipeline.png"), dpi=170, bbox_inches="tight",
            facecolor=BG)
plt.close()


# ───────────────────────────────────────────────────────────────────
# DIAGRAM 3 — CHALDEAN NUMEROLOGY ALGORITHM
# ───────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(11, 7), dpi=170)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 12)
ax.set_ylim(0, 8)
ax.axis("off")

ax.text(6, 7.55, "Proprietary Algorithm — Chaldean Numerology Engine",
        ha="center", fontsize=15, fontweight="bold", color=INK, family="serif")
ax.text(6, 7.18, "Worked example: name = \"Vyana\" → root = 5 (Mercury, favourable)",
        ha="center", fontsize=10, color=INK3, style="italic")

# Letter to digit table (Chaldean)
table_data = [
    ("1", "A I J Q Y"),
    ("2", "B K R"),
    ("3", "C G L S"),
    ("4", "D M T"),
    ("5", "E H N X"),
    ("6", "U V W"),
    ("7", "O Z"),
    ("8", "F P"),
]
ax.text(0.6, 6.55, "STEP 1 — Letter-to-digit (Chaldean)", fontsize=9.5,
        color=INK, fontweight="bold")
for i, (d, letters) in enumerate(table_data):
    x = 0.6
    y = 6.15 - i * 0.4
    styled_box(ax, x, y, 0.5, 0.35, d, fill=GOLD, edge=ACCENT,
               fontsize=10, fontweight="bold", textcolor="#1A1410")
    styled_box(ax, x + 0.6, y, 1.9, 0.35, letters, fill="#FFFFFF", edge=LINE,
               fontsize=9)

# Worked calc box
ax.text(4.0, 6.55, "STEP 2 — Worked example (V·Y·A·N·A)", fontsize=9.5,
        color=INK, fontweight="bold")
calc_letters = [("V", "6"), ("Y", "1"), ("A", "1"), ("N", "5"), ("A", "1")]
xs = 4.0
for i, (l, d) in enumerate(calc_letters):
    styled_box(ax, xs + i * 1.0, 5.8, 0.85, 0.55, l, fill="#FFFFFF", edge=INK,
               fontsize=12, fontweight="bold")
    ax.text(xs + i * 1.0 + 0.42, 5.55, "↓", ha="center", fontsize=10, color=INK3)
    styled_box(ax, xs + i * 1.0, 4.9, 0.85, 0.45, d, fill=GOLD, edge=ACCENT,
               fontsize=11, fontweight="bold", textcolor="#1A1410")

ax.text(4.0, 4.35, "Sum: 6 + 1 + 1 + 5 + 1 = 14   (compound number)",
        fontsize=10, color=INK, fontweight="bold")
ax.text(4.0, 4.0, "Reduce: 1 + 4 = 5   ←  root number",
        fontsize=10, color=ACCENT, fontweight="bold")

# Step 3 — interpretation lookup
ax.text(0.6, 3.4, "STEP 3 — Compound → meaning lookup", fontsize=9.5,
        color=INK, fontweight="bold")
styled_box(ax, 0.6, 2.5, 5.4, 0.75,
           "14: \"Movement & combinations of people\"\nFavourable: media · communication · transport · trade",
           fill="#FFF4D9", edge=WARN, fontsize=8.5)

# Step 4 — root → planet & industry fit
ax.text(6.4, 3.4, "STEP 4 — Root → planet → industry fit", fontsize=9.5,
        color=INK, fontweight="bold")
styled_box(ax, 6.4, 2.5, 5.0, 0.75,
           "Root 5 → Mercury (☿)\nFit: Media · SaaS · Tech · Mobility · Education\nAvoid: Banking · Insurance · Real estate",
           fill="#E7F2E9", edge=OK, fontsize=8.5)

# Step 5 — final verdict
styled_box(ax, 2.5, 1.0, 7.0, 1.0,
           "STEP 5 — VERDICT\nCompound 14 + Root 5 + Industry SaaS → FAVOURABLE\nLucky pairing: founder DOB sum ∈ {1, 3, 5}",
           fill="#1A1410", edge=GOLD, textcolor=GOLD, fontsize=10, fontweight="bold")
arrow(ax, 4.0, 2.5, 5.0, 2.0, color=ACCENT, lw=1.6)
arrow(ax, 8.5, 2.5, 7.5, 2.0, color=ACCENT, lw=1.6)

plt.tight_layout()
plt.savefig(os.path.join(OUT, "03_numerology.png"), dpi=170, bbox_inches="tight",
            facecolor=BG)
plt.close()


# ───────────────────────────────────────────────────────────────────
# DIAGRAM 4 — USER JOURNEY & TIER FLOW
# ───────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(11, 7), dpi=170)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 12)
ax.set_ylim(0, 8)
ax.axis("off")

ax.text(6, 7.55, "User Journey & Service Tier Flow",
        ha="center", fontsize=15, fontweight="bold", color=INK, family="serif")
ax.text(6, 7.18, "Three commercial tiers · clear conversion path from anonymous visit to paid scan",
        ha="center", fontsize=10, color=INK3, style="italic")

# Step boxes
styled_box(ax, 0.4, 5.4, 2.2, 1.0,
           "Visitor lands\non Naam Dekho",
           fill="#FFFFFF", edge=INK, fontsize=9, fontweight="bold")
styled_box(ax, 3.2, 5.4, 2.2, 1.0,
           "Types startup\nname & submits",
           fill="#FFFFFF", edge=INK, fontsize=9, fontweight="bold")
styled_box(ax, 6.0, 5.4, 2.2, 1.0,
           "Instant Tier\n(Free)\n62 surface checks",
           fill="#E7F2E9", edge=OK, fontsize=9, fontweight="bold")
styled_box(ax, 8.8, 5.4, 2.8, 1.0,
           "Sees verdict +\nrisk summary",
           fill="#E7F2E9", edge=OK, fontsize=9, fontweight="bold")
arrow(ax, 2.6, 5.9, 3.2, 5.9)
arrow(ax, 5.4, 5.9, 6.0, 5.9)
arrow(ax, 8.2, 5.9, 8.8, 5.9)

# Decision diamond
ax.add_patch(mpatches.Polygon([(5.6, 3.6), (6.8, 4.2), (8.0, 3.6), (6.8, 3.0)],
                              closed=True, facecolor="#FFF4D9", edgecolor=WARN, lw=1.4))
ax.text(6.8, 3.6, "Wants legal-\ngrade proof?", ha="center", va="center",
        fontsize=9, fontweight="bold", color=INK)
arrow(ax, 9.6, 5.4, 7.4, 4.2)

# Two outcomes
styled_box(ax, 0.4, 1.6, 3.0, 1.4,
           "TIER 1 — FREE\nInstant check.\nSurface signals only.\nNo PDF, no class-wise TM,\nno proxy-warmed deep scan.",
           fill="#FFFFFF", edge=INK3, fontsize=8.5)
styled_box(ax, 4.0, 1.6, 3.6, 1.4,
           "TIER 2 — ONE-TIME ₹49\nDeep legal scan via warmed\nproxy sessions + CAPTCHA solver.\nFull TM class-wise breakdown.\nDownloadable PDF for CA/lawyer.",
           fill=BG2, edge=ACCENT, fontsize=8.5, fontweight="bold")
styled_box(ax, 8.2, 1.6, 3.4, 1.4,
           "TIER 3 — AGENCY ₹999/mo\nUnlimited deep scans.\nBulk upload (CSV).\nWhite-label PDF.\nAPI access for naming firms.",
           fill="#1A1410", edge=GOLD, textcolor=GOLD, fontsize=8.5, fontweight="bold")

# Arrows from decision
arrow(ax, 5.6, 3.6, 2.0, 3.0, color=INK3)
arrow(ax, 8.0, 3.6, 5.8, 3.0, color=ACCENT)
arrow(ax, 7.4, 3.0, 9.6, 3.0, color=GOLD)
ax.text(3.6, 3.5, "No / later", fontsize=7.5, color=INK3, style="italic")
ax.text(5.0, 3.6, "Yes — single name", fontsize=7.5, color=ACCENT, style="italic")
ax.text(8.3, 3.4, "Yes — many names", fontsize=7.5, color=GOLD, style="italic")

plt.tight_layout()
plt.savefig(os.path.join(OUT, "04_user_journey.png"), dpi=170, bbox_inches="tight",
            facecolor=BG)
plt.close()

print("Generated 4 diagrams in:", OUT)
for f in sorted(os.listdir(OUT)):
    if f.endswith(".png"):
        print(" ·", f)
