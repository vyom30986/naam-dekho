"""Generate two additional diagrams for the developer documentation."""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os

OUT = os.path.dirname(os.path.abspath(__file__))

INK = "#0F1419"; INK2 = "#3D4751"; INK3 = "#6B7480"
BG = "#FAF8F3"; BG2 = "#F3EFE5"; LINE = "#D8D0BC"
ACCENT = "#B8501C"; OK = "#1B5E20"; NO = "#880E4F"
WARN = "#8A5A00"; GOLD = "#E8C76A"


def styled_box(ax, x, y, w, h, text, fill=BG2, edge=INK, fontsize=9, fontweight="normal", textcolor=INK, radius=0.04):
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad=0.02,rounding_size={radius}",
                         linewidth=1.2, edgecolor=edge, facecolor=fill)
    ax.add_patch(box)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fontsize, fontweight=fontweight, color=textcolor, wrap=True)


def arrow(ax, x1, y1, x2, y2, color=INK2, lw=1.4, style="-|>"):
    a = FancyArrowPatch((x1, y1), (x2, y2),
                        arrowstyle=style, mutation_scale=14,
                        color=color, linewidth=lw,
                        connectionstyle="arc3,rad=0")
    ax.add_patch(a)


# ───────────────────────────────────────────────────────────────────
# DIAGRAM 5 — API & WEBSOCKET ARCHITECTURE
# ───────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(13, 9), dpi=170)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14)
ax.set_ylim(0, 10)
ax.axis("off")

ax.text(7, 9.55, "Naam Dekho — API, WebSocket & Worker Architecture",
        ha="center", fontsize=15, fontweight="bold", color=INK, family="serif")
ax.text(7, 9.18, "Production-grade data flow: HTTPS request in, scanner workers fan out, WebSocket streams results back",
        ha="center", fontsize=10, color=INK3, style="italic")

# CLIENT (top)
styled_box(ax, 5.5, 8.0, 3.0, 0.85, "BROWSER / MOBILE\nReact PWA + WebSocket client",
           fill="#FFFFFF", edge=INK, fontsize=10, fontweight="bold")

# API GATEWAY
styled_box(ax, 5.5, 6.7, 3.0, 0.7,
           "API GATEWAY (TLS · WAF · CORS)\nNginx → Cloudflare",
           fill="#E7F2E9", edge=OK, fontsize=9, fontweight="bold")
arrow(ax, 7.0, 8.0, 7.0, 7.4, color=INK)
arrow(ax, 7.0, 6.7, 7.0, 6.3, color=INK)
ax.text(7.5, 7.9, "POST /v1/scan\n+ WS /v1/stream/{id}", fontsize=7.5, color=INK3, style="italic")

# APP SERVERS
styled_box(ax, 1.0, 5.5, 2.5, 0.7, "REST API\nFastAPI · uvicorn", fill="#FFF4D9", edge=WARN, fontsize=9, fontweight="bold")
styled_box(ax, 4.0, 5.5, 2.5, 0.7, "Auth Service\nFirebase Auth · OTP", fill="#FFF4D9", edge=WARN, fontsize=9, fontweight="bold")
styled_box(ax, 7.0, 5.5, 2.5, 0.7, "Orchestrator\nQuery normaliser + dispatcher", fill="#FFF4D9", edge=WARN, fontsize=9, fontweight="bold")
styled_box(ax, 10.0, 5.5, 2.5, 0.7, "WS Server\nSocket.IO · Redis adapter", fill="#FFF4D9", edge=WARN, fontsize=9, fontweight="bold")
arrow(ax, 7.0, 6.3, 5.25, 6.2, color=INK3)
arrow(ax, 7.0, 6.3, 8.25, 6.2, color=INK3)
arrow(ax, 7.0, 6.3, 2.25, 6.2, color=INK3)
arrow(ax, 7.0, 6.3, 11.25, 6.2, color=INK3)

# Queue layer
styled_box(ax, 4.5, 4.2, 5.0, 0.7, "TASK QUEUE — Redis · BullMQ\nPriority lanes · rate limits · retries",
           fill="#FCE4EC", edge=NO, fontsize=9, fontweight="bold")
arrow(ax, 8.25, 5.5, 7.5, 4.9, color=INK)
arrow(ax, 7.0, 4.2, 7.0, 3.85, color=INK)

# Scanner workers (6 modules)
workers = [
    (0.3, "Legal Scanner\n(MCA · IP · GST)", "#E7F2E9", OK),
    (2.55, "Domain Probe\n(WHOIS · RDAP)", "#E7F2E9", OK),
    (4.8, "Social Bot\n(IG · X · YT · LI)", "#E7F2E9", OK),
    (7.05, "Marketplace\n(Play · Apple · GH)", "#E7F2E9", OK),
    (9.3, "Brand & SEO\n(SERP · Trends)", "#E7F2E9", OK),
    (11.55, "Lingo + Numero\n(Bhashini · Chaldean)", "#E7F2E9", OK),
]
for wx, label, fill, edge in workers:
    styled_box(ax, wx, 2.9, 2.0, 0.9, label, fill=fill, edge=edge, fontsize=8, fontweight="bold")
    arrow(ax, wx + 1.0, 3.8, wx + 1.0, 4.2, color=INK3, style="<|-")

# Data stores
styled_box(ax, 0.5, 1.5, 2.5, 0.7, "Postgres\nUsers · scans · billing", fill="#FFFFFF", edge=INK, fontsize=8)
styled_box(ax, 3.5, 1.5, 2.5, 0.7, "Redis\nCache · pub-sub · queues", fill="#FFFFFF", edge=INK, fontsize=8)
styled_box(ax, 6.5, 1.5, 2.5, 0.7, "S3 / R2\nPDF reports", fill="#FFFFFF", edge=INK, fontsize=8)
styled_box(ax, 9.5, 1.5, 2.5, 0.7, "Object cache\nWHOIS · SERP results (TTL)", fill="#FFFFFF", edge=INK, fontsize=8)

for wx in [1.3, 3.55, 5.8, 8.05, 10.3, 12.55]:
    arrow(ax, wx, 2.9, wx, 2.2, color=INK3, lw=1.0)

# External APIs
styled_box(ax, 0.3, 0.2, 13.4, 0.85,
           "EXTERNAL DATA SOURCES — see Connector Knowledge Base (Annex A) for full list, URLs, free/paid status\n"
           "MCA21 · IPIndia · Copyright · GST · DPIIT · WHOIS · GoDaddy · Namecheap · Instagram Graph · X API · YouTube Data API · LinkedIn · "
           "GitHub · Play Scraper · iTunes · Wikipedia · SerpAPI · Google Trends · Bhashini · 2Captcha · BrightData",
           fill="#FFF4D9", edge=ACCENT, fontsize=7.5)
for wx in [1.3, 3.55, 5.8, 8.05, 10.3, 12.55]:
    arrow(ax, wx, 1.5, wx, 1.05, color=ACCENT, lw=1.0)

# WS streaming arrow (right side)
arrow(ax, 11.0, 5.5, 11.0, 7.5, color=GOLD, lw=2.0)
arrow(ax, 11.0, 7.5, 8.5, 8.3, color=GOLD, lw=2.0)
ax.text(11.4, 6.5, "Live results\nstream back\nover WebSocket", fontsize=8, color=ACCENT,
        style="italic",
        bbox=dict(boxstyle="round,pad=0.3", fc="#FFF4D9", ec=GOLD, lw=1))

plt.tight_layout()
plt.savefig(os.path.join(OUT, "05_api_architecture.png"), dpi=170, bbox_inches="tight", facecolor=BG)
plt.close()


# ───────────────────────────────────────────────────────────────────
# DIAGRAM 6 — WEBSOCKET MESSAGE LIFECYCLE (sequence-style)
# ───────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(13, 8.5), dpi=170)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, 14)
ax.set_ylim(0, 9.5)
ax.axis("off")

ax.text(7, 9.10, "WebSocket Message Lifecycle — single scan request",
        ha="center", fontsize=15, fontweight="bold", color=INK, family="serif")
ax.text(7, 8.75, "Sequence diagram: how one /v1/scan request becomes 62 streamed result events",
        ha="center", fontsize=10, color=INK3, style="italic")

# Actor lanes
actors = [
    (1.5, "Browser"),
    (4.0, "API Gateway"),
    (6.5, "Orchestrator"),
    (9.0, "Workers (×6)"),
    (11.5, "WS Server"),
]
for ax_x, name in actors:
    styled_box(ax, ax_x - 0.85, 7.95, 1.7, 0.5, name, fill=INK, edge=INK, textcolor=BG, fontsize=10, fontweight="bold")
    # Lifeline
    ax.add_artist(plt.Line2D([ax_x, ax_x], [7.85, 0.5], color=LINE, linewidth=1, linestyle=":"))

def msg(y, x1, x2, label, color=INK2, lw=1.4):
    arrow(ax, x1, y, x2, y, color=color, lw=lw)
    midx = (x1 + x2) / 2
    ax.text(midx, y + 0.12, label, ha="center", fontsize=8, color=INK2)

def self_loop(x, y_top, y_bot, label, color=INK3):
    arrow(ax, x, y_top, x + 0.55, y_top, color=color, lw=1.0)
    ax.add_artist(plt.Line2D([x + 0.55, x + 0.55], [y_top, y_bot], color=color, linewidth=1.0))
    arrow(ax, x + 0.55, y_bot, x, y_bot, color=color, lw=1.0)
    ax.text(x + 0.75, (y_top + y_bot) / 2, label, ha="left", va="center", fontsize=7.5, color=INK3, style="italic")

# Messages
msg(7.4, 1.5, 4.0, "POST /v1/scan  { name, mode, industry }")
msg(7.0, 4.0, 6.5, "validated payload")
self_loop(6.5, 6.7, 6.3, "normalise + tokenise")
msg(6.0, 6.5, 11.5, "open scan_id channel")
msg(5.6, 11.5, 1.5, "WS upgrade  { scan_id, eta_seconds }")
msg(5.2, 6.5, 9.0, "dispatch 62 platform queries (parallel)")
self_loop(9.0, 4.9, 4.4, "fetch · parse · score")
msg(4.0, 9.0, 11.5, "result_event  { tile_id, status, payload }", color=ACCENT)
msg(3.5, 11.5, 1.5, "ws.emit  result_event  ×62 (streamed)", color=ACCENT)
ax.text(7, 3.0, "(repeated up to 62 times, ~2-4 seconds total)", ha="center", fontsize=8, color=INK3, style="italic")
msg(2.4, 9.0, 11.5, "verdict_complete  { score, conflicts, summary }", color=GOLD)
msg(2.0, 11.5, 1.5, "ws.emit  verdict_complete", color=GOLD)
msg(1.4, 1.5, 4.0, "GET /v1/scans/{id}/pdf  (deep tier only)")
msg(1.0, 4.0, 1.5, "PDF stream  (S3 pre-signed URL)")

plt.tight_layout()
plt.savefig(os.path.join(OUT, "06_websocket_sequence.png"), dpi=170, bbox_inches="tight", facecolor=BG)
plt.close()

print("Generated 2 dev diagrams.")
for f in sorted(os.listdir(OUT)):
    if f.endswith(".png"):
        print(" ·", f)
