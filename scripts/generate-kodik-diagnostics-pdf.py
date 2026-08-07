from __future__ import annotations

import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "reports" / "kodik-integration-diagnostics.md"
OUTPUT = ROOT / "reports" / "kodik-integration-diagnostics.pdf"
FONT = Path(r"C:\Windows\Fonts\arial.ttf")

PAGE_W, PAGE_H = 595.28, 841.89
LEFT, RIGHT, TOP, BOTTOM = 46, 46, 55, 48


def u16(data: bytes, offset: int) -> int:
    return struct.unpack_from(">H", data, offset)[0]


def i16(data: bytes, offset: int) -> int:
    return struct.unpack_from(">h", data, offset)[0]


def u32(data: bytes, offset: int) -> int:
    return struct.unpack_from(">I", data, offset)[0]


def font_metrics(font_data: bytes):
    table_count = u16(font_data, 4)
    tables: dict[str, tuple[int, int]] = {}
    for index in range(table_count):
        pos = 12 + index * 16
        tag = font_data[pos : pos + 4].decode("latin1")
        tables[tag] = (u32(font_data, pos + 8), u32(font_data, pos + 12))

    head = tables["head"][0]
    units_per_em = u16(font_data, head + 18)
    bbox = tuple(i16(font_data, head + value) for value in (36, 38, 40, 42))
    hhea = tables["hhea"][0]
    ascent, descent = i16(font_data, hhea + 4), i16(font_data, hhea + 6)
    number_h_metrics = u16(font_data, hhea + 34)
    maxp = tables["maxp"][0]
    glyph_count = u16(font_data, maxp + 4)
    hmtx = tables["hmtx"][0]
    widths = [u16(font_data, hmtx + index * 4) for index in range(number_h_metrics)]
    widths.extend([widths[-1]] * (glyph_count - len(widths)))

    cmap_offset = tables["cmap"][0]
    cmap_count = u16(font_data, cmap_offset + 2)
    chosen = None
    for index in range(cmap_count):
        record = cmap_offset + 4 + index * 8
        platform, encoding = u16(font_data, record), u16(font_data, record + 2)
        subtable = cmap_offset + u32(font_data, record + 4)
        fmt = u16(font_data, subtable)
        if fmt == 4 and (platform == 3 and encoding in (1, 10) or platform == 0):
            chosen = subtable
            if platform == 3 and encoding == 1:
                break
    if chosen is None:
        raise RuntimeError("Arial cmap format 4 was not found")

    seg_count = u16(font_data, chosen + 6) // 2
    end_codes = chosen + 14
    start_codes = end_codes + seg_count * 2 + 2
    id_deltas = start_codes + seg_count * 2
    id_range_offsets = id_deltas + seg_count * 2

    def glyph_id(codepoint: int) -> int:
        for segment in range(seg_count):
            end_code = u16(font_data, end_codes + segment * 2)
            if codepoint > end_code:
                continue
            start_code = u16(font_data, start_codes + segment * 2)
            if codepoint < start_code:
                return 0
            delta = i16(font_data, id_deltas + segment * 2)
            range_offset = u16(font_data, id_range_offsets + segment * 2)
            if range_offset == 0:
                return (codepoint + delta) & 0xFFFF
            address = id_range_offsets + segment * 2 + range_offset + 2 * (codepoint - start_code)
            glyph = u16(font_data, address)
            return 0 if glyph == 0 else (glyph + delta) & 0xFFFF
        return 0

    scale = 1000 / units_per_em
    return {
        "units_per_em": units_per_em,
        "bbox": [round(value * scale) for value in bbox],
        "ascent": round(ascent * scale),
        "descent": round(descent * scale),
        "glyph_id": glyph_id,
        "widths": [round(value * scale) for value in widths],
    }


def sanitize_markdown_line(line: str) -> str:
    line = re.sub(r"`([^`]*)`", r"\1", line)
    line = re.sub(r"\*\*([^*]+)\*\*", r"\1", line)
    line = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", line)
    if line.strip().startswith("|"):
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            return ""
        return "  |  ".join(cells)
    return line.replace("---", "")


def wrap_text(text: str, max_chars: int) -> list[str]:
    if not text:
        return [""]
    words = text.split()
    result: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                result.append(current)
            while len(word) > max_chars:
                result.append(word[:max_chars])
                word = word[max_chars:]
            current = word
    if current:
        result.append(current)
    return result or [""]


def layout(markdown: str):
    pages: list[list[tuple[str, float, float, tuple[float, float, float]]]] = []
    page: list[tuple[str, float, float, tuple[float, float, float]]] = []
    y = PAGE_H - TOP

    def new_page():
        nonlocal page, y
        if page:
            pages.append(page)
        page = []
        y = PAGE_H - TOP

    def add(text: str, size: float, leading: float, color=(0.09, 0.14, 0.29), indent=0):
        nonlocal y
        max_chars = max(28, int((PAGE_W - LEFT - RIGHT - indent) / (size * 0.52)))
        lines = wrap_text(text, max_chars)
        required = len(lines) * leading + 2
        if y - required < BOTTOM:
            new_page()
        for value in lines:
            page.append((value, LEFT + indent, y, color, size))
            y -= leading
        y -= 2

    lines = markdown.splitlines()
    first_section = True
    in_code = False
    for raw in lines:
        stripped = raw.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            y -= 3
            continue
        if stripped.startswith("# "):
            continue
        if stripped.startswith("## "):
            if first_section:
                first_section = False
            else:
                new_page()
            add(stripped[3:], 17, 22, (0.12, 0.16, 0.38))
            y -= 5
            continue
        if stripped.startswith("### "):
            add(stripped[4:], 12, 16, (0.20, 0.19, 0.46))
            continue
        text = sanitize_markdown_line(raw)
        if not text.strip():
            y -= 5
            continue
        indent = 10 if stripped.startswith(("- ", "* ", "1.", "2.", "3.", "4.", "5.")) else 0
        size = 8 if in_code or stripped.startswith("|") else 9
        color = (0.16, 0.20, 0.31) if not in_code else (0.18, 0.25, 0.38)
        add(text, size, 12 if size == 9 else 10.5, color, indent)
    if page:
        pages.append(page)
    return pages


class PdfBuilder:
    def __init__(self):
        self.objects: list[bytes] = []

    def add(self, value: bytes) -> int:
        self.objects.append(value)
        return len(self.objects)

    def stream(self, data: bytes, extra: str = "") -> int:
        compressed = zlib.compress(data, 9)
        dictionary = f"<< /Length {len(compressed)} /Filter /FlateDecode {extra} >>\n".encode()
        return self.add(dictionary + b"stream\n" + compressed + b"\nendstream")

    def write(self, path: Path, root_id: int, info_id: int):
        output = bytearray(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for index, value in enumerate(self.objects, 1):
            offsets.append(len(output))
            output.extend(f"{index} 0 obj\n".encode())
            output.extend(value)
            output.extend(b"\nendobj\n")
        xref = len(output)
        output.extend(f"xref\n0 {len(self.objects) + 1}\n".encode())
        output.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            output.extend(f"{offset:010d} 00000 n \n".encode())
        output.extend(
            f"trailer\n<< /Size {len(self.objects) + 1} /Root {root_id} 0 R /Info {info_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
        )
        path.write_bytes(output)


def pdf_text(text: str) -> str:
    return text.encode("utf-16-be").hex().upper()


def main():
    font_data = FONT.read_bytes()
    metrics = font_metrics(font_data)
    markdown = SOURCE.read_text(encoding="utf-8")
    pages = layout(markdown)
    builder = PdfBuilder()

    font_file_id = builder.stream(font_data, f"/Length1 {len(font_data)}")
    bbox = " ".join(map(str, metrics["bbox"]))
    descriptor_id = builder.add(
        (
            f"<< /Type /FontDescriptor /FontName /ArialKairo /Flags 32 /FontBBox [{bbox}] "
            f"/ItalicAngle 0 /Ascent {metrics['ascent']} /Descent {metrics['descent']} "
            f"/CapHeight {metrics['ascent']} /StemV 80 /FontFile2 {font_file_id} 0 R >>"
        ).encode()
    )

    used = sorted({ord(char) for char in markdown if ord(char) <= 0xFFFF})
    cid_map = bytearray(131072)
    width_parts: list[str] = []
    cmap_lines: list[str] = []
    for codepoint in used:
        glyph = metrics["glyph_id"](codepoint)
        struct.pack_into(">H", cid_map, codepoint * 2, glyph)
        width = metrics["widths"][glyph] if glyph < len(metrics["widths"]) else 500
        width_parts.append(f"{codepoint} [{width}]")
        cmap_lines.append(f"<{codepoint:04X}> <{codepoint:04X}>")
    cid_map_id = builder.stream(bytes(cid_map))

    to_unicode = (
        "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n"
        "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n"
        "/CMapName /KairoUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n"
    )
    for start in range(0, len(cmap_lines), 100):
        chunk = cmap_lines[start : start + 100]
        to_unicode += f"{len(chunk)} beginbfchar\n" + "\n".join(chunk) + "\nendbfchar\n"
    to_unicode += "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n"
    to_unicode_id = builder.stream(to_unicode.encode())

    cid_font_id = builder.add(
        (
            "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ArialKairo "
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> "
            f"/FontDescriptor {descriptor_id} 0 R /CIDToGIDMap {cid_map_id} 0 R "
            f"/DW 500 /W [{' '.join(width_parts)}] >>"
        ).encode()
    )
    type0_id = builder.add(
        (
            f"<< /Type /Font /Subtype /Type0 /BaseFont /ArialKairo /Encoding /Identity-H "
            f"/DescendantFonts [{cid_font_id} 0 R] /ToUnicode {to_unicode_id} 0 R >>"
        ).encode()
    )

    page_ids: list[int] = []
    pages_id = builder.add(b"PAGES_PLACEHOLDER")
    total = len(pages) + 1

    cover_commands = [
        "0.95 0.94 1 rg 0 0 595.28 841.89 re f",
        "0.45 0.38 0.85 rg 46 690 8 95 re f",
        f"BT /F1 14 Tf 0.35 0.29 0.76 rg 70 760 Td <{pdf_text('KAIRO')}> Tj ET",
        f"BT /F1 28 Tf 0.09 0.14 0.29 rg 70 700 Td <{pdf_text('Диагностика интеграции Kodik')}> Tj ET",
        f"BT /F1 13 Tf 0.24 0.30 0.43 rg 70 660 Td <{pdf_text('Технический аудит серверного провайдера')}> Tj ET",
    ]
    cover_details = [
        "Дата: 5 августа 2026 года",
        "Проект: Kairo 0.1.0",
        "Среда: Windows 11, AMD64",
        "Node.js 24.15.0 | Next.js 16.2.12 | Prisma 6.19.2",
        "Read-only диагностика БД и безопасные сетевые проверки",
    ]
    for index, value in enumerate(cover_details):
        cover_commands.append(
            f"BT /F1 10 Tf 0.20 0.25 0.36 rg 70 {575 - index * 26} Td <{pdf_text(value)}> Tj ET"
        )
    cover_commands.append(
        f"BT /F1 8 Tf 0.35 0.40 0.50 rg 260 25 Td <{pdf_text(f'Страница 1 из {total}')}> Tj ET"
    )
    content_id = builder.stream("\n".join(cover_commands).encode())
    page_ids.append(
        builder.add(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] /Resources << /Font << /F1 {type0_id} 0 R >> >> /Contents {content_id} 0 R >>".encode()
        )
    )

    for page_index, page in enumerate(pages, 2):
        commands = ["0.45 0.38 0.85 rg 0 817 595.28 25 re f"]
        for item in page:
            text, x, y, color, size = item
            r, g, b = color
            commands.append(
                f"BT /F1 {size:g} Tf {r:.3f} {g:.3f} {b:.3f} rg {x:.2f} {y:.2f} Td <{pdf_text(text)}> Tj ET"
            )
        commands.append(
            f"BT /F1 8 Tf 0.35 0.40 0.50 rg 46 24 Td <{pdf_text('Kairo | Kodik diagnostics')}> Tj ET"
        )
        commands.append(
            f"BT /F1 8 Tf 0.35 0.40 0.50 rg 470 24 Td <{pdf_text(f'Страница {page_index} из {total}')}> Tj ET"
        )
        content_id = builder.stream("\n".join(commands).encode())
        page_ids.append(
            builder.add(
                f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] /Resources << /Font << /F1 {type0_id} 0 R >> >> /Contents {content_id} 0 R >>".encode()
            )
        )

    builder.objects[pages_id - 1] = (
        f"<< /Type /Pages /Count {len(page_ids)} /Kids [{' '.join(f'{page_id} 0 R' for page_id in page_ids)}] >>"
    ).encode()
    catalog_id = builder.add(f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode())
    info_id = builder.add(
        b"<< /Title (Kairo Kodik Integration Diagnostics) /Author (Kairo Engineering) /Creator (Codex) >>"
    )
    builder.write(OUTPUT, catalog_id, info_id)
    print(f"created={OUTPUT} pages={len(page_ids)} bytes={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    main()
