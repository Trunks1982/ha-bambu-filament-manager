"""Betttemperaturen pro Filament-ID, Druckermodell und Platte aus den Bambu-Studio-Profilen
in catalog.json schreiben. Aufruf: build_bed_temps.py <BambuStudio/resources/profiles/BBL/filament> <catalog.json>"""
import glob, json, os, sys

src, catp = sys.argv[1], sys.argv[2]
files = {}
for f in glob.glob(os.path.join(src, "*.json")):
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception:
        continue
    files[d.get("name") or os.path.basename(f)[:-5]] = d


def resolve(name, depth=0):
    d = files.get(name)
    if d is None or depth > 12:
        return {}
    base = resolve(d["inherits"], depth + 1) if d.get("inherits") else {}
    return {**base, **d}


def first(v):
    if isinstance(v, list):
        v = v[0] if v else None
    try:
        return int(float(v))
    except Exception:
        return None


PLATES = ("cool_plate", "eng_plate", "hot_plate", "textured_plate", "supertack_plate")


def temps(full):
    out = {p: first(full.get(f"{p}_temp")) for p in PLATES}
    return {p: t for p, t in out.items() if t}  # 0 = plate not suitable for this filament


base_by_id, model_by_id = {}, {}
for name in files:
    full = resolve(name)
    fid = full.get("filament_id")
    if not fid:
        continue
    if name.endswith("@base"):
        base_by_id[fid] = temps(full)
    elif "@BBL " in name and " nozzle" not in name:
        model = name.split("@BBL ", 1)[1].strip()
        model_by_id.setdefault(fid, {})[model] = temps(full)

cat = json.load(open(catp, encoding="utf-8"))
hit = 0
for fid, info in cat.items():
    info.pop("bed_temperature", None)
    default = base_by_id.get(fid)
    models = model_by_id.get(fid, {})
    if default is None and models:
        default = next(iter(models.values()))
    if not default:
        continue
    bed = {"default": default}
    for model, t in sorted(models.items()):
        if t and t != default:
            bed[model] = t
    info["bed_temperature"] = bed
    hit += 1
json.dump(cat, open(catp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(hit, "of", len(cat), "filaments with bed temperatures")
