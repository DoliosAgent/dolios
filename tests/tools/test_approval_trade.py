"""Dolios trade guard: money-moving gmgn-cli commands are detected; read-only ones are not."""

import pytest

from tools.approval_trade import detect_trade_command, trade_pattern_key


@pytest.mark.parametrize("cmd", [
    "gmgn-cli swap --chain sol --from W --input-token So111 --output-token ABC --amount 0.2",
    "npx gmgn-cli multi-swap --chain bsc --wallets a,b --amount 1",
    "gmgn-cli order strategy create --chain sol --order-type limit_order --sub-order-type buy_low",
    "gmgn-cli order strategy cancel --chain sol --order-id 42",
    "gmgn-cli cooking create --chain sol --launchpad pump",
    "cd x && GMGN_DEBUG=1 gmgn-cli.cmd swap --chain base --percent 50",
])
def test_trades_detected(cmd):
    assert detect_trade_command(cmd)


@pytest.mark.parametrize("cmd", [
    "gmgn-cli order quote --chain sol --input-token A --output-token B --amount 1",
    "gmgn-cli order get --chain sol --order-id 1",
    "gmgn-cli order strategy list --chain sol",
    "gmgn-cli token info --chain sol --address abc",
    "gmgn-cli swap --help",
    "gmgn-cli cooking stats",
    "echo swap",
    "git log --grep swap",
])
def test_reads_not_detected(cmd):
    assert detect_trade_command(cmd) is None


def test_pattern_key_is_per_command():
    a = trade_pattern_key("gmgn-cli swap --amount 0.2")
    assert a == trade_pattern_key("gmgn-cli  swap   --amount 0.2")
    assert a != trade_pattern_key("gmgn-cli swap --amount 2")
