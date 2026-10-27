# Product 3D models

`build.py` models catalogue products in Blender and exports one GLB per product, with every finish
stored as a switchable variant (`KHR_materials_variants`). The website's product page shows the model
with finish buttons and an AR button on phones.

```sh
blender --background --python renders/build.py -- all            # every product
blender --background --python renders/build.py -- door-handles   # one category
blender --background --python renders/build.py -- knobs-2004 --qa
```

Models go to `renders/out/models/<slug>.glb`. `--qa` also renders `renders/out/qa/<id>.png`, all finishes
side by side, for comparing with the brochure photo. `renders/out/` is not committed.

- `catalog3d.py`: shared geometry (turned profiles, relief, cut-out patterns), the finish palette, and GLB export.
- `specs/`: one file per category. Each product lists its build function and finishes in brochure letter order.

The brochure gives no drawings, so shapes and proportions are measured from enlarged brochure photos and
sizes are scaled from the listed sizes (handles at 12 in, legs at 3 or 4 in). Sofa leg 1202 has no photo
and no model. Finish colours are matched by eye to the photos.

To publish, build all models, copy them into `web-app/public/models/`, and deploy the web app. The web app
serves them at `/models/<slug>.glb` without sign-in, and its public `/view3d?m=<slug>` page is the viewer
that the iOS and Android apps open. Apply `supabase/migrations/20261026120000_product_3d_models.sql` so the
live catalog links each product to its model.

```sh
cp renders/out/models/*.glb web-app/public/models/
```
