"""Dolios trade guard: money-moving GMGN commands always need a human, even under yolo.

A trading agent with yolo / ``approvals.mode: off`` would otherwise be able to spend the
user's wallet unattended. Commands that submit or change orders (``gmgn-cli swap``,
``multi-swap``, ``order strategy create|cancel``, ``cooking create``) are therefore checked
BEFORE the yolo bypass. The only opt-out is an explicit ``approvals.trade_autopilot: true``
in config.yaml. Each approval covers exactly one command text (the pattern key hashes it), so
"approve for session" can never silently cover a different trade.
"""

import hashlib
import logging
import re

from tools import approval_context as _ctx

logger = logging.getLogger("tools.approval")

_TRADE_RE = re.compile(
    r"\bgmgn-cli(?:\.cmd|\.js)?\b[^\n;|&]*?\s"
    r"(?P<verb>multi-swap|swap|cooking\s+create|order\s+strategy\s+(?:create|cancel))\b",
    re.IGNORECASE,
)
_HELP_RE = re.compile(r"(?:^|\s)(?:--help|-h)(?:\s|$)")


def detect_trade_command(command: str) -> str | None:
    """Return a short description when ``command`` moves funds through GMGN, else None."""
    m = _TRADE_RE.search(command or "")
    if not m or _HELP_RE.search(command):
        return None
    verb = " ".join(m.group("verb").lower().split())
    return f"GMGN trade: {verb} (moves funds from your wallet)"


def trade_autopilot_enabled() -> bool:
    try:
        return bool(_ctx._get_approval_config().get("trade_autopilot", False))
    except Exception:
        return False


def trade_pattern_key(command: str) -> str:
    return "trade:" + hashlib.sha256(" ".join(command.split()).encode("utf-8")).hexdigest()[:16]


def check_trade_guard(command: str, approval_callback=None) -> dict | None:
    """None when the command is not a trade (caller continues its normal flow); otherwise the
    final approval decision for it."""
    description = detect_trade_command(command)
    if description is None:
        return None
    from tools import approval as _approval

    if trade_autopilot_enabled():
        logger.warning("Trade autopilot ON — executing without approval: %s", command[:200])
        return _approval._approved()
    pattern_key = trade_pattern_key(command)
    session_key = _approval.get_current_session_key()
    approval_callback, is_cli, is_gateway, is_ask = _approval._presence(approval_callback)
    if not is_cli and not is_gateway and not is_ask:
        return _approval._blocked(
            "BLOCKED: this command places a real trade and no human is present to approve it. "
            "Ask the user to confirm in an interactive session, or they can opt in to unattended "
            "trading with `approvals.trade_autopilot: true` in config.yaml.",
            pattern_key=pattern_key, description=description)
    return _approval._human_decision(
        _approval._COMMAND_GATE, command=command, description=description,
        pattern_key=pattern_key, pattern_keys=[pattern_key], session_key=session_key,
        approval_callback=approval_callback, is_cli=is_cli, is_gateway=is_gateway, is_ask=is_ask,
    )
