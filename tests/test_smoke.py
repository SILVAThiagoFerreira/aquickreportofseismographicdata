from __future__ import annotations

import json
import math
from pathlib import Path
import unittest


class SmokeTests(unittest.TestCase):
    def test_config_exists_and_has_required_sections(self) -> None:
        config_path = Path(__file__).resolve().parents[1] / "config.json"
        data = json.loads(config_path.read_text(encoding="utf-8"))

        self.assertIn("paths", data)
        self.assertIn("execution", data)
        self.assertIn("report", data)
        self.assertEqual(data["execution"]["default_command"], "generate")
        self.assertEqual(data["report"]["vibration_alert_threshold_mm_s"], 0.8)

    def test_main_parser_builds(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import sys

        if str(root) not in sys.path:
            sys.path.insert(0, str(root))

        import main

        parser = main.build_parser()
        self.assertIsNotNone(parser.parse_args([]))

    def test_whatsapp_message_includes_vibration_status_above(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import sys

        src = root / "src"
        if str(src) not in sys.path:
            sys.path.insert(0, str(src))

        from datetime import date

        from sismo_report.models import ChannelReading, SismogramRecord
        from sismo_report.whatsapp import build_whatsapp_message

        record = SismogramRecord(
            source_pdf="/tmp/sample.pdf",
            location="Ponto 01",
            event_date=date(2026, 5, 13),
            pspl_db_l=120.0,
            pspl_compliant=True,
            peak_vector_sum_mm_s=0.9,
            channels={
                "Tran": ChannelReading(axis="Tran", ppv_mm_s=0.7, compliant=True),
                "Vert": ChannelReading(axis="Vert", ppv_mm_s=0.6, compliant=True),
                "Long": ChannelReading(axis="Long", ppv_mm_s=0.5, compliant=True),
            },
        )

        message = build_whatsapp_message([record], vibration_alert_threshold_mm_s=0.8)
        self.assertIn("⚠️ Índices de vibração: acima de 0,8 mm/s.", message)

    def test_whatsapp_message_includes_vibration_status_below(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import sys

        src = root / "src"
        if str(src) not in sys.path:
            sys.path.insert(0, str(src))

        from datetime import date

        from sismo_report.models import ChannelReading, SismogramRecord
        from sismo_report.whatsapp import build_whatsapp_message

        record = SismogramRecord(
            source_pdf="/tmp/sample.pdf",
            location="Ponto 01",
            event_date=date(2026, 5, 13),
            pspl_db_l=120.0,
            pspl_compliant=True,
            peak_vector_sum_mm_s=0.7,
            channels={
                "Tran": ChannelReading(axis="Tran", ppv_mm_s=0.6, compliant=True),
                "Vert": ChannelReading(axis="Vert", ppv_mm_s=0.5, compliant=True),
                "Long": ChannelReading(axis="Long", ppv_mm_s=0.4, compliant=True),
            },
        )

        message = build_whatsapp_message([record], vibration_alert_threshold_mm_s=0.8)
        self.assertIn("✅ Índices de vibração: abaixo de 0,8 mm/s.", message)

    def test_report_overview_lines_include_vibration_status_above(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import sys

        src = root / "src"
        if str(src) not in sys.path:
            sys.path.insert(0, str(src))

        from datetime import date, datetime

        from sismo_report.models import ChannelReading, SismogramRecord
        from sismo_report.report import _overview_lines, _vibration_status_text

        record = SismogramRecord(
            source_pdf="/tmp/sample.pdf",
            location="Ponto 01",
            event_date=date(2026, 5, 13),
            pspl_db_l=120.0,
            pspl_compliant=True,
            peak_vector_sum_mm_s=0.9,
            channels={
                "Tran": ChannelReading(axis="Tran", ppv_mm_s=0.7, compliant=True),
                "Vert": ChannelReading(axis="Vert", ppv_mm_s=0.6, compliant=True),
                "Long": ChannelReading(axis="Long", ppv_mm_s=0.5, compliant=True),
            },
        )

        status_text = _vibration_status_text([record], 0.8)
        lines = _overview_lines([record], datetime(2026, 5, 13), status_text)
        self.assertIn("⚠️ Índices de vibração: acima de 0,8 mm/s.", lines)

    def test_report_chart_labels_do_not_overlap(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import json
        import subprocess

        try:
            subprocess.run(["node", "--version"], check=True, capture_output=True, text=True)
        except FileNotFoundError:
            self.skipTest("node not installed")

        script = r"""
import { ppvLabelPositions, psplLabelPositions } from './report.js';

const psplPoints = [
  { distance: 1100, pspl: 118, label: 'PONTO ALFA LONGO', color: '#111111', marker: 'o' },
  { distance: 1250, pspl: 121, label: 'PONTO BETA LONGO', color: '#222222', marker: 'o' },
  { distance: 1400, pspl: 124, label: 'PONTO GAMA LONGO', color: '#333333', marker: 'o' },
  { distance: 1550, pspl: 127, label: 'PONTO DELTA LONGO', color: '#444444', marker: 'o' },
];
const ppvPoints = [
  { freq: 4, ppv: 0.6, label: 'FREQUENCIA ALFA LONGA', color: '#111111', marker: 'o' },
  { freq: 5, ppv: 0.7, label: 'FREQUENCIA BETA LONGA', color: '#222222', marker: 'o' },
  { freq: 6, ppv: 0.8, label: 'FREQUENCIA GAMA LONGA', color: '#333333', marker: 'o' },
  { freq: 7, ppv: 0.9, label: 'FREQUENCIA DELTA LONGA', color: '#444444', marker: 'o' },
];

const pspl = psplLabelPositions(psplPoints, 7000, { plotWidth: 320, plotHeight: 168 });
const ppv = ppvLabelPositions(ppvPoints, { plotWidth: 318, plotHeight: 166 });

process.stdout.write(JSON.stringify({ pspl, ppv }));
"""

        completed = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
        result = json.loads(completed.stdout)

        def assert_labels_are_separated(labels: list[dict[str, float]]) -> None:
            rects = []
            for label in labels:
                rect = {
                    "left": label["xFrac"] - (label["boxWidthFrac"] / 2),
                    "right": label["xFrac"] + (label["boxWidthFrac"] / 2),
                    "top": label["yFrac"] - (label["boxHeightFrac"] / 2),
                    "bottom": label["yFrac"] + (label["boxHeightFrac"] / 2),
                }
                self.assertGreaterEqual(rect["left"], 0.0)
                self.assertLessEqual(rect["right"], 1.0)
                self.assertGreaterEqual(rect["top"], 0.0)
                self.assertLessEqual(rect["bottom"], 1.0)

                center_distance = math.hypot(label["xFrac"] - label["pointXFrac"], label["yFrac"] - label["pointYFrac"])
                connector_distance = math.hypot(label["connectorXFrac"] - label["pointXFrac"], label["connectorYFrac"] - label["pointYFrac"])
                self.assertLess(connector_distance, center_distance)

                for previous in rects:
                    gap = math.hypot(
                        max(previous["left"] - rect["right"], rect["left"] - previous["right"], 0.0),
                        max(previous["top"] - rect["bottom"], rect["top"] - previous["bottom"], 0.0),
                    )
                    self.assertGreaterEqual(gap, 0.015)
                    separated = (
                        rect["right"] <= previous["left"] + 0.008
                        or rect["left"] >= previous["right"] - 0.008
                        or rect["bottom"] <= previous["top"] + 0.008
                        or rect["top"] >= previous["bottom"] - 0.008
                    )
                    self.assertTrue(separated)

                rects.append(rect)

        assert_labels_are_separated(result["pspl"])
        assert_labels_are_separated(result["ppv"])

    def test_report_cover_title_stays_clear_of_logo(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import re

        report_text = (root / "report.js").read_text(encoding="utf-8")
        title_match = re.search(r"const COVER_TITLE_TOP_MM = ([0-9.]+);", report_text)
        logo_match = re.search(r"\.report-logo \{.*?top: ([0-9.]+)mm;.*?height: ([0-9.]+)mm;", report_text, re.S)

        self.assertIsNotNone(title_match)
        self.assertIsNotNone(logo_match)

        title_top = float(title_match.group(1))
        logo_top = float(logo_match.group(1))
        logo_height = float(logo_match.group(2))

        self.assertGreater(title_top, logo_top + logo_height)

    def test_report_adds_appendix_page_for_extra_records(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import sys
        import tempfile

        src = root / "src"
        if str(src) not in sys.path:
            sys.path.insert(0, str(src))

        import fitz

        from datetime import date, datetime

        from sismo_report.models import ChannelReading, SismogramRecord
        from sismo_report.report import export_pdf_pages_as_png, generate_report

        def build_record(index: int) -> SismogramRecord:
            return SismogramRecord(
                source_pdf=f"/tmp/sample-{index}.pdf",
                location=f"Ponto {index:02d}",
                user_name="Cliente Exemplo",
                event_date=date(2026, 5, 15),
                pspl_db_l=120.0 + index,
                pspl_compliant=True,
                peak_vector_sum_mm_s=0.5 + (index * 0.05),
                distance_m=1000.0 + (index * 10.0),
                charge_kg=10.0 + index,
                channels={
                    "Tran": ChannelReading(axis="Tran", ppv_mm_s=0.5, zc_freq_hz=10.0, compliant=True),
                    "Vert": ChannelReading(axis="Vert", ppv_mm_s=0.4, zc_freq_hz=12.0, compliant=True),
                    "Long": ChannelReading(axis="Long", ppv_mm_s=0.3, zc_freq_hz=8.0, compliant=True),
                },
            )

        records = [build_record(index) for index in range(1, 5)]

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = Path(tmpdir) / "report.pdf"
            png_path = Path(tmpdir) / "report.png"
            generate_report(records, pdf_path, None, datetime(2026, 5, 15, 10, 30), max_records=3)

            with fitz.open(str(pdf_path)) as document:
                self.assertEqual(document.page_count, 2)
                self.assertIn("Ponto 04", document.load_page(1).get_text())

            exported = export_pdf_pages_as_png(pdf_path, png_path, page_numbers=(0, 1), scale=1.0)
            self.assertIn("png", exported)
            self.assertIn("png_p2", exported)
            self.assertTrue(exported["png"].exists())
            self.assertTrue(exported["png_p2"].exists())

    def test_browser_parser_extracts_channel_values(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import os
        import subprocess
        import time
        import urllib.request

        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.skipTest("playwright not installed")

        port = 18080
        env = {**os.environ, "PORT": str(port)}

        try:
            server = subprocess.Popen(
                ["node", "server.js"],
                cwd=root,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except FileNotFoundError:
            self.skipTest("node not installed")

        try:
            deadline = time.time() + 30
            while time.time() < deadline:
                if server.poll() is not None:
                    self.fail("server.js exited before becoming ready")
                try:
                    with urllib.request.urlopen(f"http://localhost:{port}", timeout=1) as response:
                        if response.status == 200:
                            break
                except Exception:
                    time.sleep(0.2)
            else:
                self.fail("server.js did not start")

            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(
                    headless=True,
                    args=["--allow-file-access-from-files", "--disable-web-security"],
                )
                page = browser.new_page(viewport={"width": 1600, "height": 1200})
                try:
                    page.goto(f"http://localhost:{port}", wait_until="networkidle", timeout=120000)
                    record = page.evaluate(
                        """async () => {
                            const mod = await import('./parser.js');
                            const resp = await fetch('./input/20260515-BARRAGEM%20DE%20REJEITOS.pdf');
                            const blob = await resp.blob();
                            const file = new File([blob], '20260515-BARRAGEM DE REJEITOS.pdf', { type: 'application/pdf' });
                            return await mod.parsePdfFile(file);
                        }""",
                    )
                finally:
                    browser.close()

            self.assertEqual(record["location"], "BARRAGEM DE REJEITOS")
            self.assertAlmostEqual(record["channels"]["Tran"]["ppv_mm_s"], 0.063, places=3)
            self.assertAlmostEqual(record["channels"]["Tran"]["zc_freq_hz"], 26.99, places=2)
            self.assertAlmostEqual(record["channels"]["Vert"]["ppv_mm_s"], 0.071, places=3)
            self.assertAlmostEqual(record["channels"]["Long"]["zc_freq_hz"], 28.02, places=2)
        finally:
            server.terminate()
            try:
                server.wait(timeout=10)
            except Exception:
                server.kill()

    def test_browser_parser_extracts_geosonics_values(self) -> None:
        root = Path(__file__).resolve().parents[1]
        import os
        import subprocess
        import time
        import urllib.request

        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.skipTest("playwright not installed")

        port = 18081
        env = {**os.environ, "PORT": str(port)}

        try:
            server = subprocess.Popen(
                ["node", "server.js"],
                cwd=root,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except FileNotFoundError:
            self.skipTest("node not installed")

        try:
            deadline = time.time() + 30
            while time.time() < deadline:
                if server.poll() is not None:
                    self.fail("server.js exited before becoming ready")
                try:
                    with urllib.request.urlopen(f"http://localhost:{port}", timeout=1) as response:
                        if response.status == 200:
                            break
                except Exception:
                    time.sleep(0.2)
            else:
                self.fail("server.js did not start")

            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(
                    headless=True,
                    args=["--allow-file-access-from-files", "--disable-web-security"],
                )
                page = browser.new_page(viewport={"width": 1600, "height": 1200})
                try:
                    page.goto(f"http://localhost:{port}", wait_until="networkidle", timeout=120000)
                    record = page.evaluate(
                        """async () => {
                            const mod = await import('./parser.js');
                            const resp = await fetch('./modelos%20de%20sismograma/GEOSONIC.pdf');
                            const blob = await resp.blob();
                            const file = new File([blob], 'GEOSONIC.pdf', { type: 'application/pdf' });
                            return await mod.parsePdfFile(file);
                        }""",
                    )
                finally:
                    browser.close()

            self.assertEqual(record["location"], "NORDESTE")
            self.assertEqual(record["client"], "CMOC")
            self.assertEqual(record["user_name"], "CMOC")
            self.assertEqual(record["operation_name"], "ENAEX")
            self.assertEqual(record["event_date"], "2026-05-14")
            self.assertAlmostEqual(record["pspl_db_l"], 126.0, places=1)
            self.assertAlmostEqual(record["microphone_zc_freq_hz"], 11.1, places=1)
            self.assertAlmostEqual(record["peak_vector_sum_mm_s"], 0.7, places=2)
            self.assertAlmostEqual(record["channels"]["Tran"]["ppv_mm_s"], 0.38, places=2)
            self.assertAlmostEqual(record["channels"]["Vert"]["ppv_mm_s"], 0.51, places=2)
            self.assertAlmostEqual(record["channels"]["Long"]["ppv_mm_s"], 0.64, places=2)
        finally:
            server.terminate()
            try:
                server.wait(timeout=10)
            except Exception:
                server.kill()


if __name__ == "__main__":
    unittest.main()
