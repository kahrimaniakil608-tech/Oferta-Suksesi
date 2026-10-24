#!/usr/bin/env python3
"""Prepare a separate release for the existing Oferta server; no live writes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def output(*args):
    return subprocess.check_output(args, text=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live-dir", type=Path, default=Path("/opt/OfertaSuksesi"))
    args = parser.parse_args()
    live = args.live_dir.resolve()
    if live == ROOT:
        parser.error("Use a separate release checkout; keep the live checkout and mounted Nginx file intact")
    for name in (".env", ".release.env", ".nginx.candidate.conf"):
        if (ROOT / name).exists() or (ROOT / name).is_symlink():
            parser.error("Release already contains " + name + "; use a fresh release directory")
    config = json.loads(output(
        "docker", "compose", "--project-directory", str(live), "--env-file", str(live / ".env"),
        "-f", str(live / "docker-compose.yml"), "config", "--format", "json",
    ))
    env = config["services"]["api"].get("environment", {})
    for key in ("JWT_SECRET", "JWT_REFRESH_SECRET", "TURNSTILE_SECRET_KEY", "MEILISEARCH_KEY"):
        if not env.get(key):
            parser.error("Required live configuration is missing: " + key)
    if env.get("NODE_ENV") != "production":
        parser.error("Live NODE_ENV must be production")
    settings = {
        "OFERTA_LIVE_DIR": str(live),
        "OFERTA_RELEASE_TAG": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True,
        ).strip(),
    }
    for label, name in (("POSTGRES", "oferta_postgres"), ("REDIS", "oferta_redis"), ("SEARCH", "oferta_meilisearch"), ("NGINX", "oferta_nginx")):
        settings["OFERTA_" + label + "_IMAGE"] = output("docker", "inspect", "--format", "{{.Image}}", name).strip()
    networks = json.loads(output("docker", "inspect", "--format", "{{json .NetworkSettings.Networks}}", "oferta_nginx"))
    network = "ofertasuksesi_default"
    if network not in networks or not networks[network].get("IPAddress"):
        parser.error("Expected shared Docker network not found; review topology before proceeding")
    settings["OFERTA_NETWORK_NAME"] = network
    settings["OFERTA_PROXY_IP"] = networks[network]["IPAddress"]
    settings["OFERTA_ORIGINAL_NGINX_SHA256"] = hashlib.sha256((live / "nginx.conf").read_bytes()).hexdigest()
    public = config["services"]["web"]["build"].get("args", {})
    for key in ("NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_IMAGE_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"):
        if not public.get(key):
            parser.error("Required public web build setting is missing: " + key)
        settings[key] = public[key]
    if any(not re.fullmatch(r"[A-Za-z0-9_./:@-]+", value) for value in settings.values()):
        parser.error("A deployment setting needs quoting; manual review required")
    os.umask(0o077)
    subprocess.run([
        "python3", str(ROOT / "scripts/prepare-shared-nginx.py"),
        "--live", str(live / "nginx.conf"), "--output", str(ROOT / ".nginx.candidate.conf"),
    ], check=True)
    (ROOT / ".env").symlink_to(live / ".env")
    with (ROOT / ".release.env").open("x") as handle:
        for key, value in settings.items():
            handle.write(key + "=" + value + "\n")
    subprocess.run(["bash", str(ROOT / "scripts/release-compose.sh"), "config", "--quiet"],
                   env=os.environ | {"OFERTA_LIVE_DIR": str(live)}, check=True)
    print("RELEASE_PREPARED: existing network, storage, image IDs and public build settings captured.")
    print("Live containers and configuration were not changed. Build and rehearse migrations before cutover.")


if __name__ == "__main__":
    main()
