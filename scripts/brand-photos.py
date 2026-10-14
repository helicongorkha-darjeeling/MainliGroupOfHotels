"""Reproduce branded web assets from untouched originals using the supplied logo compositor."""
import argparse, hashlib, importlib.util, json, shutil
from pathlib import Path
from PIL import Image, ImageOps
ap = argparse.ArgumentParser()
ap.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1] / "public/images")
ap.add_argument("--output", type=Path, required=True)
ap.add_argument("--logo-folder", type=Path, required=True)
ap.add_argument("--files", nargs="+", help="Only rerun these source filenames")
args = ap.parse_args()
repo = Path(__file__).resolve().parents[1]
source = args.source.resolve()
output = args.output.resolve()
if output == source or source in output.parents:
    raise SystemExit("Output must be outside the source photo directory.")
spec = importlib.util.spec_from_file_location("supplied_logo", args.logo_folder / "add_logo.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
logos = {key: Image.open(args.logo_folder / name).convert("RGBA") for key, name in [
    ("ink", "mainali-logo-ink.png"), ("ivory", "mainali-logo-ivory.png"), ("knot", "mainali-knot.png")]}
files = sorted(p for p in source.iterdir() if p.is_file() and p.suffix.lower() in module.PHOTO_TYPES)
if args.files:
    files = [p for p in files if p.name in args.files]
# Keep per-photo adjustments reproducible; colours/artwork are never changed.
adjustments = {"teesta-room-seating.webp": ("bottom-left", 0.22), "teesta-arrival.webp": ("top-left", 0.22)}
web = repo / "public/branded-images"
web.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
records, failures = [], []
hero_names = {"teesta-double-room-window", "teesta-lobby", "teesta-dining-room", "teesta-exterior-front"}
for path in files:
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    position, size = adjustments.get(path.name, ("bottom-right", 0.22))
    try:
        with Image.open(path) as im:
            photo = ImageOps.exif_transpose(im).convert("RGB")
            branded = module.place_logo(photo, logos, size, position, 0.92, "full")
            target = output / path.name
            branded.convert("RGB").save(target, quality=92)
            shutil.copy2(target, web / path.name)
            presets = {"card": (1200, 900)}
            if path.stem in hero_names:
                presets.update({"hero": (1600, 900), "hero-mobile": (960, 1200)})
            derivatives = []
            for name, dimensions in presets.items():
                crop = ImageOps.fit(photo, dimensions, method=Image.Resampling.LANCZOS, centering=(0.5, 0.65))
                # Shade hero photography before stamping: the supplied compositor
                # selects ink/ivory against the final background, and the web CSS
                # must not darken the watermark again.
                if name.startswith("hero"):
                    shade = Image.new("RGBA", dimensions, (21, 19, 15, 0))
                    alpha = Image.new("L", (1, dimensions[1]))
                    alpha.putdata([round(255 * (0.35 + 0.45 * y / max(1, dimensions[1] - 1))) for y in range(dimensions[1])])
                    shade.putalpha(alpha.resize(dimensions))
                    crop = Image.alpha_composite(crop.convert("RGBA"), shade)
                result = module.place_logo(crop, logos, size, position, 0.92, "full")
                destination = web / (path.stem + "-" + name + ".webp")
                result.convert("RGB").save(destination, quality=85, method=6)
                derivatives.append(destination.name)
        after = hashlib.sha256(path.read_bytes()).hexdigest()
        if before != after:
            raise RuntimeError("Original hash changed")
        records.append({"photo": path.name, "position": position, "size": size, "opacity": 0.92, "originalSha256": before, "unchanged": before == after, "derivatives": derivatives})
        print("ok", path.name, flush=True)
    except Exception as error:
        failures.append({"photo": path.name, "reason": str(error)})
        print("skip", path.name, str(error), flush=True)
report = {"source": str(source), "output": str(output), "fullSizeCopies": len(records), "webDerivatives": sum(len(r["derivatives"]) for r in records), "failed": failures, "excluded": "Brand assets, dependencies and review screenshots are outside public/images.", "photos": records}
report_dir = repo / "output/photos"
if args.files and (report_dir / "report.json").exists():
    previous = json.loads((report_dir / "report.json").read_text(encoding="utf-8"))
    records += [r for r in previous["photos"] if r["photo"] not in args.files]
    failures += [r for r in previous["failed"] if r["photo"] not in args.files]
    report.update({"fullSizeCopies": len(records), "webDerivatives": sum(len(r["derivatives"]) for r in records), "failed": failures, "photos": sorted(records, key=lambda r: r["photo"])})
report_dir.mkdir(parents=True, exist_ok=True)
(report_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({k: v for k, v in report.items() if k != "photos"}, indent=2))
if failures:
    raise SystemExit(1)

