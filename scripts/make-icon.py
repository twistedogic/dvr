#!/usr/bin/env python3
"""Generate the dvr PWA icons.

Draws a flat-design videotape at any size and writes an opaque PNG.
Pure stdlib: zlib, struct, math. No Pillow, no image editor.

Layout (all positions are fractions of the canvas size `n`):
  body:        x = 0.13 n, y = 0.30 n, w = 0.74 n, h = 0.40 n
  window:      inside body, top 55%
  reels:       two circles inside window, at 30% and 70% of window width
  label:       bottom 15% of body
  accent:      thin red bar under the label
"""

import math
import struct
import sys
import zlib

# Flat-design palette. Five colors plus the canvas background.
BG = (0x0A, 0x0A, 0x0A, 0xFF)        # matches the app's --bg
BODY = (0xB4, 0xB2, 0xAF, 0xFF)      # warm gray, the cassette shell
WINDOW = (0x28, 0x28, 0x28, 0xFF)    # dark recess where the reels sit
REEL = (0xDC, 0xDC, 0xDC, 0xFF)      # the visible reel hub
LABEL = (0xFA, 0xFA, 0xFA, 0xFF)     # the paper label
ACCENT = (0xDC, 0x32, 0x32, 0xFF)    # VHS warning-stripe red


def in_rect(x, y, rx, ry, rw, rh):
    return rx <= x < rx + rw and ry <= y < ry + rh


def in_circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def pixel(x, y, n, geom):
    # Body
    if in_rect(x, y, geom["body_x"], geom["body_y"], geom["body_w"], geom["body_h"]):
        # Window (top portion of body)
        if in_rect(x, y, geom["win_x"], geom["win_y"], geom["win_w"], geom["win_h"]):
            # Reel hubs
            for cx, cy in geom["reel_centers"]:
                if in_circle(x, y, cx, cy, geom["reel_r"]):
                    # Inner darker hub (the spindle hole)
                    if in_circle(x, y, cx, cy, geom["hub_r"]):
                        return BODY
                    return REEL
            return WINDOW
        # Label
        if in_rect(x, y, geom["lbl_x"], geom["lbl_y"], geom["lbl_w"], geom["lbl_h"]):
            return LABEL
        # Accent stripe just under the label
        if in_rect(
            x, y,
            geom["lbl_x"], geom["lbl_y"] + geom["lbl_h"],
            int(geom["lbl_w"] * 0.45), geom["stripe_h"],
        ):
            return ACCENT
        return BODY
    return BG


def make_png(n):
    geom = {
        "body_x": int(0.13 * n),
        "body_y": int(0.30 * n),
        "body_w": int(0.74 * n),
        "body_h": int(0.40 * n),
    }
    geom["win_x"] = geom["body_x"] + int(geom["body_w"] * 0.10)
    geom["win_y"] = geom["body_y"] + int(geom["body_h"] * 0.15)
    geom["win_w"] = geom["body_w"] - int(geom["body_w"] * 0.20)
    geom["win_h"] = int(geom["body_h"] * 0.55)
    geom["reel_r"] = int(geom["win_h"] * 0.30)
    geom["hub_r"] = int(geom["reel_r"] * 0.35)
    cy = geom["win_y"] + geom["win_h"] // 2
    geom["reel_centers"] = [
        (geom["win_x"] + int(geom["win_w"] * 0.30), cy),
        (geom["win_x"] + int(geom["win_w"] * 0.70), cy),
    ]
    geom["lbl_x"] = geom["body_x"] + int(geom["body_w"] * 0.10)
    geom["lbl_y"] = geom["body_y"] + int(geom["body_h"] * 0.78)
    geom["lbl_w"] = geom["body_w"] - int(geom["body_w"] * 0.20)
    geom["lbl_h"] = int(geom["body_h"] * 0.15)
    geom["stripe_h"] = max(2, int(geom["lbl_h"] * 0.30))

    raw = bytearray()
    for y in range(n):
        raw.append(0)  # PNG filter byte: None
        for x in range(n):
            r, g, b, a = pixel(x, y, n, geom)
            raw.extend((r, g, b, a))

    def chunk(typ, data):
        return (
            struct.pack(">I", len(data))
            + typ
            + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
        )

    # color type 6 = RGBA, 8-bit depth
    ihdr = struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main():
    targets = [
        (192, "site/icons/icon-192.png"),
        (512, "site/icons/icon-512.png"),
    ]
    for size, path in targets:
        with open(path, "wb") as f:
            f.write(make_png(size))
        print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    main()
