# Builds catalogue 3D models.
#   blender --background --python renders/build.py -- <product id | category | all> ... [--qa]
# Writes renders/out/models/<slug>.glb and, with --qa, renders/out/qa/<id>.png
# showing every finish side by side for comparison with the brochure photo.
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog3d
from specs import PRODUCTS

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
wanted = [a for a in args if not a.startswith('--')]
ids = [pid for pid in PRODUCTS if 'all' in wanted or pid in wanted or PRODUCTS[pid]['category'] in wanted]
missing = [a for a in wanted if a != 'all' and a not in PRODUCTS and a not in {p['category'] for p in PRODUCTS.values()}]
if missing:
    raise SystemExit(f'Unknown products or categories: {missing}')

for pid in ids:
    spec = PRODUCTS[pid]
    catalog3d.reset()
    slug = re.sub(r'[^a-z0-9]+', '-', pid.lower()).strip('-')  # same rule as modelSlug in web-app/lib/format.ts
    size = catalog3d.export(spec['build'](), os.path.join(out, 'models', f'{slug}.glb'), spec['variants'])
    print(f'Built {pid}: {size // 1024} KB, {len(spec["variants"])} finishes')
    if '--qa' in args:
        catalog3d.qa_render(spec['build'], spec['variants'], os.path.join(out, 'qa', f'{pid}.png'))
