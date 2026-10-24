#!/usr/bin/env python3
"""Prepare, but never install, the shared proxy upgrade from the legacy release.

Fail closed on unexpected Oferta edits. Preserve all appended sites byte-for-byte,
reuse the live certificate paths, and scope real-IP trust to Oferta's TLS servers.
"""
import argparse
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BASELINE = "df03c2bc1fbb3adaaf853dd1eb17829996f018fc"


def prepare(live: str, legacy: str, template: str, cloudflare: str) -> str:
    # The legacy prefix has two TLS servers. Additional sites follow it.
    for directive, default in (
        ("ssl_certificate", "/etc/ssl/cloudflare/cert.pem"),
        ("ssl_certificate_key", "/etc/ssl/cloudflare/key.pem"),
    ):
        values = re.findall(r"(?m)^\s*" + directive + r"\s+([^;\s]+);", live)[:2]
        if len(values) != 2 or len(set(values)) != 1:
            raise ValueError("Oferta certificate paths differ; manual review required")
        legacy = legacy.replace(directive + " " + default + ";", directive + " " + values[0] + ";")
        template = template.replace(directive + " " + default + ";", directive + " " + values[0] + ";")
    if not live.startswith(legacy):
        raise ValueError("Live Oferta configuration differs from the known baseline; manual review required")
    include = "include /etc/nginx/oferta-cloudflare.conf;\n"
    if template.count(include) != 1:
        raise ValueError("Unexpected template include; manual review required")
    template = template.replace(include, "", 1)
    directives = "\n".join("    " + line for line in cloudflare.splitlines())
    for names in ("img.ofertasuksesi.com", "ofertasuksesi.com www.ofertasuksesi.com"):
        marker = "    server_name " + names + ";"
        if template.count(marker) != 1:
            raise ValueError("Unexpected template servers; manual review required")
        template = template.replace(marker, marker + "\n\n" + directives, 1)
    return template + live[len(legacy):]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.resolve() == args.live.resolve() or args.output.exists():
        parser.error("Output must be a new candidate file, separate from the live config")
    legacy = subprocess.check_output(
        ["git", "show", BASELINE + ":nginx.conf"], cwd=ROOT, text=True,
    )
    try:
        candidate = prepare(
            args.live.read_text(), legacy,
            (ROOT / "nginx.conf").read_text(),
            (ROOT / "nginx-cloudflare.conf").read_text(),
        )
    except ValueError as error:
        parser.error(str(error))
    with args.output.open("x") as output:
        output.write(candidate)
    print("Candidate prepared:", args.output)
    print("Live config unchanged. Review the diff and validate with nginx -t before installation.")


if __name__ == "__main__":
    main()
