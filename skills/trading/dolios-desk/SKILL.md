---
name: dolios-desk
description: "Onboarding, trade workflow and risk rules for GMGN."
version: 1.0.0
author: Dolios
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [GMGN, Trading, Onboarding, Risk]
    category: trading
    related_skills: [gmgn-token-buy, gmgn-swap, gmgn-token, gmgn-market, gmgn-track, gmgn-portfolio]
---

# Dolios Desk Skill

The desk manual for Dolios: how to get a user connected to GMGN, which GMGN skill to reach for, and the
risk rules every trade follows. It does not place trades itself — execution always ends in `gmgn-swap`.

## When to Use

- First run, or any `gmgn-cli` error about a missing API key / private key.
- The user asks what Dolios can do, or gives a vague trading goal ("find me something", "manage my bags").
- Before any buy, sell or order, to apply the risk rules below.

## Prerequisites

- Node.js 18+ and `gmgn-cli` on PATH. Check with `terminal`: `gmgn-cli --version`.
  Missing → `npm install -g gmgn-cli` (ask before installing).
- A GMGN account with a trading wallet. IPv4 network (GMGN OpenAPI rejects IPv6).

## How to Run

Connect GMGN (once per machine):
1. `terminal`: `gmgn-cli config --check` — exit 0 means configured, skip the rest.
2. `terminal`: `gmgn-cli config` — generates a local Ed25519 signing key in `~/.config/gmgn/` and prints
   a link. Show the link; the user opens it, binds their GMGN wallet and creates an API key.
3. When the user sends the API key: `gmgn-cli config --apply <KEY>` and show the result.
The signing key never leaves the machine. Never ask for a wallet private key or seed phrase — GMGN
does not need one, and anyone asking for it is a scam.

## Quick Reference

| User wants | Skill |
|---|---|
| What's hot / new launches / charts | `gmgn-heat-rank`, `gmgn-market` |
| Is this token safe? | `gmgn-token`, `gmgn-contract-dd`, `gmgn-holder-analysis` |
| Who created it, will the dev dump? | `gmgn-dev-score` |
| Story / socials | `gmgn-narrative`, `gmgn-callout` |
| Buy by name or "should I buy" | `gmgn-token-buy` → then `gmgn-swap` |
| Sell, limit, TP/SL, trailing | `gmgn-swap` |
| Smart money / KOL flow | `gmgn-track` |
| Follow / copy a wallet? | `gmgn-wallet-analysis`, `gmgn-wallet-score`, `gmgn-wallet-style` |
| My holdings and P&L | `gmgn-portfolio` |
| Launch a token | `gmgn-cooking` |

Longer playbooks (daily brief, early screening, deep report, risk warning, smart money profile):
`references/workflow-*.md` — read the matching one with `read_file` before running a multi-step brief.

## Procedure — every trade

1. **Resolve the contract.** Names are ambiguous; copycats share tickers. Buys by name go through
   `gmgn-token-buy`. Never trade a contract you have not shown the user.
2. **Vet before buying.** Liquidity, honeypot, rug ratio, top-10 concentration, bundler / insider /
   sniper share, dev history. State the red flags in plain words, worst first.
3. **Size it.** Ask for the size if not given. Default suggestion: at most 1–2% of the wallet per
   meme position; warn above 5%. Suggest a stop-loss for new launches.
4. **Confirm in one line**, e.g. `BUY 0.5 SOL of $XYZ (7xKX…pump) on sol, slippage 15%, SL -35%`.
   Then run the `gmgn-swap` command. Dolios' trade guard will also ask the user to approve the
   exact command — that prompt is expected, never try to route around it.
5. **Report** the result: tx/order id, filled amount, average price, and any TP/SL created.
6. **Journal** (optional, when the user wants one): append to `trades.md` in the working directory —
   date, chain, token, side, size, price, thesis, exit plan.

## Pitfalls

- Unattended runs (cron, gateway without a human) cannot trade unless the user set
  `approvals.trade_autopilot: true`. Explain that rather than retrying.
- Condition orders made by automation need `GMGN_ALLOW_AUTOMATED_TRADES=1` (GMGN's own switch).
- 401/403 with a correct key: check IPv6 first (see `gmgn-swap`).
- Prices move while you talk: re-quote (`gmgn-cli order quote`) if more than a minute passed.
- Never present analysis as a guarantee. Meme tokens can go to zero in minutes.

## Verification

After a trade: `gmgn-cli order get --chain <chain> --order-id <id>` shows a filled status, and
`gmgn-portfolio` shows the new balance.
