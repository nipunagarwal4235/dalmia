"""Sofa legs. The brochure gives each leg's diameter (or section) and its heights; legs are modelled
at 3 in (76 mm) unless the range starts at 4 in. Shapes are read from the photos. Each leg stands on
its plastic glide (z=0) with the mounting plate and M8 stud on top. Finishes follow the price-list codes."""
import math
import bpy
import bmesh
from catalog3d import lathe, soften, ridges, box, MM

CATEGORY = 'sofa-legs'
INCH = 25.4

# Price-list finish codes: body, accents (bands, collars, bases), and top plate.
CODES = {
    'CP': ('CP', {'body': 'chrome', 'accent': 'chrome', 'plate': 'satin'}),
    'TT': ('Two-tone', {'body': 'satin', 'accent': 'chrome', 'plate': 'satin'}),
    'MET': ('Matt steel', {'body': 'satin', 'accent': 'satin', 'plate': 'satin'}),
    'R/G': ('Rose gold', {'body': 'rose_gold_pvd', 'accent': 'rose_gold_pvd', 'plate': 'rose_gold_matt'}),
    'GOLD': ('Gold', {'body': 'gold_pvd', 'accent': 'gold_pvd', 'plate': 'gold_matt'}),
    'BLACK': ('Black', {'body': 'black_matt', 'accent': 'black_matt', 'plate': 'black_matt'}),
    'A.B.': ('Antique', {'body': 'antique', 'accent': 'antique_dark', 'plate': 'antique'}),
    'CUBIK': ('Wood grain (Cubik)', {'body': 'wood', 'accent': 'chrome', 'plate': 'satin'}),
    'R/G, BLACK': ('Black & rose gold', {'body': 'black_matt', 'accent': 'rose_gold_pvd', 'plate': 'black_matt'}),
    'BLACK, R/G': ('Black & rose gold', {'body': 'black_matt', 'accent': 'rose_gold_pvd', 'plate': 'black_matt'}),
    'BLACK, GOLD': ('Black & gold', {'body': 'black_matt', 'accent': 'gold_pvd', 'plate': 'black_matt'}),
    'BLACK-MATT, BLACK': ('Black PVD & black matt', {'body': 'black_matt', 'accent': 'black_pvd', 'plate': 'black_matt'}),
}
CODES['A/B'] = CODES['A.B.']
CODES['BLACK-GOLD'] = CODES['BLACK, GOLD']
CODES['BLACL, GOLD'] = CODES['BLACK, GOLD']
CODES['GOLD, BLACK'] = CODES['BLACK, GOLD']
CODES['MATT-BLACK, BLACK'] = CODES['BLACK-MATT, BLACK']


def finishes(*codes):
    seen, out = set(), []
    for code in codes:
        name, mapping = CODES[code]
        if name not in seen:
            seen.add(name)
            out.append((name, mapping))
    return out


def _upright(obj):
    obj.rotation_euler = (0, -math.pi / 2, 0)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    obj.select_set(False)
    return obj


def turned(name, profile, uv=False, segments=160, bevel=0.25, modulate=None):
    """Spins (height, radius[, role]) points around the vertical axis; roles default to 'body'."""
    roles = [p[2] if len(p) > 2 else 'body' for p in profile[:-1]]
    return soften(_upright(lathe(name, [(p[0], p[1]) for p in profile], roles, segments=segments, uv=uv, modulate=modulate)), bevel)


def _drill(obj, holes, z0, z1, radius=2.3):
    before = len(obj.data.polygons)
    for x, y in holes:
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius * MM, depth=(z1 - z0 + 2) * MM,
                                            location=(x * MM, y * MM, (z0 + z1) / 2 * MM))
        drill = bpy.context.object
        mod = obj.modifiers.new('Hole', 'BOOLEAN')
        mod.object, mod.solver = drill, 'EXACT'
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(drill)
    for slot in obj.material_slots:
        if slot.material is None:
            slot.material = obj.material_slots[0].material
    assert len(obj.data.polygons) >= before * 0.6, f'{obj.name}: drilling collapsed the mesh ({before} -> {len(obj.data.polygons)} faces)'
    return obj


def round_plate(z, radius, thickness=2.5):
    plate = turned('Plate', [(z, 0, 'plate'), (z, radius - 0.6, 'plate'), (z + 0.6, radius, 'plate'), (z + thickness - 0.4, radius, 'plate'),
                             (z + thickness, radius - 0.4, 'plate'), (z + thickness, 0)], bevel=0)
    r = radius * 0.8
    holes = [(r * math.cos(a), r * math.sin(a)) for a in (math.pi / 4 + k * math.pi / 2 for k in range(4))]
    return soften(_drill(plate, holes, z, z + thickness), 0.2)


def square_plate(z, half, thickness=2.5):
    plate = box('Plate', -half, half, half, thickness / 2, 'plate', z=z + thickness / 2)
    h = half - 6
    return soften(_drill(plate, [(sx * h, sy * h) for sx in (-1, 1) for sy in (-1, 1)], z, z + thickness), 0.4)


def stud(z, length=12, radius=4.0):
    """M8 threaded stud rising from the plate."""
    profile = [(z - 1, 0, 'bolt'), (z - 1, radius, 'bolt')] + [(p[0], p[1], 'bolt') for p in ridges(z + 1, z + length - 1, 8, radius, radius - 0.55, role='bolt')] + [
        (z + length - 0.4, radius - 0.4, 'bolt'), (z + length, radius - 0.9, 'bolt'), (z + length, 0)]
    profile = sorted({(round(p[0], 6), round(p[1], 6)): p for p in profile}.values(), key=lambda p: p[0])
    return turned('Stud', profile, segments=48, bevel=0)


def glide(radius, height=3.0):
    return turned('Glide', [(0, 0, 'glide'), (0, radius - 1.0, 'glide'), (0.6, radius, 'glide'), (height, radius, 'glide'), (height, 0)], bevel=0)


def round_leg(profile, plate_r, glide_r=None, plate_t=2.5, uv=False, **turn_options):
    """profile: (height, radius[, role]) from the glide top (z=3) up to the plate underside."""
    top = profile[-1][0]
    body = turned('Body', [(3.0, 0, profile[0][2] if len(profile[0]) > 2 else 'body')] + profile + [(top, 0)], uv=uv, **turn_options)
    return [glide(glide_r or profile[0][1] - 1.5), body, round_plate(top, plate_r, plate_t), stud(top + plate_t)]


def square_body(z0, z1, half0, half1, role='body', uv=False, bevel=1.2):
    """Tapered square section from half0 at z0 to half1 at z1."""
    bm = bmesh.new()
    rings = [[bm.verts.new((sx * h * MM, sy * h * MM, z * MM)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
             for z, h in ((z0, half0), (z1, half1))]
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[1])
    for k in range(4):
        bm.faces.new((rings[0][k], rings[0][(k + 1) % 4], rings[1][(k + 1) % 4], rings[1][k]))
    bm.normal_update()
    if uv:
        layer = bm.loops.layers.uv.new('UVMap')
        for face in bm.faces:
            n = face.normal
            for loop in face.loops:
                co = loop.vert.co / MM
                loop[layer].uv = ((co.x if abs(n.y) > abs(n.x) else co.y) / 60, co.z / 60) if abs(n.z) < 0.5 else (co.x / 60, co.y / 60)
    mesh = bpy.data.meshes.new('Body')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('Body', mesh)
    bpy.context.collection.objects.link(obj)
    from catalog3d import assign_roles
    assign_roles(obj, [role])
    return soften(obj, bevel)


def square_leg(half_top, half_bottom, height, plate_half, uv=False):
    top = height - 2.5
    return [glide(min(half_bottom, half_top) - 3), square_body(3.0, top, half_bottom, half_top, uv=uv),
            square_plate(top, plate_half), stud(height)]


def bands(z0, z1, count, radius, depth=0.6, role='accent', gap=0.8):
    """Alternating polished bands separated by grooves: (z, r, role) points from z0 to z1."""
    pitch = (z1 - z0) / count
    pts = []
    for i in range(count):
        a = z0 + i * pitch
        pts += [(a, radius - depth, 'body'), (a + gap / 2, radius, role if i % 2 == 0 else 'body'),
                (a + pitch - gap / 2, radius, 'body')]
    pts.append((z1, radius - depth, 'body'))
    return pts


H3 = 3 * INCH  # 76.2 mm

TOP = H3 - 2.5  # plate underside for a 3 in leg


def lines(zs, radius, role='accent', relief=0.3, width=0.8):
    """Thin raised rings (polished line inlays) at the given heights."""
    pts = []
    for z in zs:
        pts += [(z - width / 2, radius, role), (z - width / 2 + 0.15, radius + relief, role), (z + width / 2 - 0.15, radius + relief, 'body'),
                (z + width / 2, radius, 'body')]
    return pts


def aluminium(radius, plate_r):
    """Black anodised aluminium drum with two groups of polished line rings and a steel base ring (1221-1224)."""
    lower = [radius * 0 + 18 + 4 * k for k in range(3)]
    upper = [TOP - 26 + 4 * k for k in range(3)]
    profile = ([(3.0, radius + 2.0, 'accent'), (3.5, radius + 3.5, 'accent'), (9, radius + 3.5, 'accent'), (10, radius + 2.4, 'accent'),
                (10.4, radius + 0.5, 'body'), (12, radius)] + lines(lower, radius) + lines(upper, radius) + [(TOP - 1.2, radius), (TOP, radius - 0.8)])
    return round_leg(profile, plate_r)


PRODUCTS = {
    'sofa-legs-1201': dict(build=lambda: round_leg(
        [(3.0, 26.0, 'accent'), (3.6, 27.0, 'accent'), (6, 27.0, 'accent'), (8, 25.8, 'accent'), (11, 23.6, 'accent'), (13, 22.8), (14, 22.5)]
        + bands(24, 60, 5, 22.5) + [(TOP - 1.2, 22.5), (TOP, 21.8)], 32), variants=finishes('TT')),
    'sofa-legs-1203': dict(build=lambda: round_leg(
        [(3.0, 29.0, 'accent'), (3.5, 30.5, 'accent'), (9, 30.5, 'accent'), (10, 29.4, 'accent'), (10.4, 26.0), (11, 25.0)]
        + bands(16, 64, 4, 25.0) + [(TOP - 1.2, 25.0), (TOP, 24.2)], 36), variants=finishes('CP')),
    'sofa-legs-1204': dict(build=lambda: round_leg(
        [(3.0, 36.5, 'accent'), (3.6, 38.0, 'accent'), (7, 38.0, 'accent'), (10, 35.5, 'accent'), (14, 33.0), (16, 32.5)]
        + bands(20, 66, 4, 32.5) + [(TOP - 1.2, 32.5), (TOP, 31.7)], 46), variants=finishes('TT')),
    'sofa-legs-1208': dict(build=lambda: round_leg(
        [(3.0, 31.0, 'accent'), (4, 32.4, 'accent'), (8, 32.0, 'accent'), (16, 30.0, 'accent'), (28, 27.6, 'accent'), (40, 26.0, 'accent'),
         (46, 25.4)] + bands(46, 66, 3, 25.2) + [(TOP - 1.2, 25.2), (TOP, 24.4)], 36), variants=finishes('TT')),
    'sofa-legs-1210': dict(build=lambda: round_leg(
        [(3.0, 22.5), (3.4, 24.6), (5, 27.0), (8, 28.0), (12, 27.6), (16, 26.2), (20, 25.2), (22, 25.0), (TOP - 1.2, 25.0), (TOP, 24.2)], 36),
        variants=finishes('CP', 'R/G', 'GOLD', 'BLACK', 'A/B')),
    'sofa-legs-1214': dict(build=lambda: round_leg(
        [(3.0, 34.0), (3.4, 37.0), (5.5, 40.5), (9, 42.0), (14, 41.2), (19, 39.4), (24, 38.0), (27, 37.5), (TOP - 1.2, 37.5), (TOP, 36.7)], 52),
        variants=finishes('CP')),
    'sofa-legs-1217': dict(build=lambda: square_leg(30, 27, H3, 40), variants=finishes('CP', 'MET', 'R/G', 'GOLD', 'BLACK')),
    'sofa-legs-1219': dict(build=lambda: square_leg(25, 23, H3, 35, uv=True), variants=finishes('CP', 'MET', 'R/G', 'CUBIK')),
    'sofa-legs-1221': dict(build=lambda: aluminium(32.5, 45),
                           variants=[('Black aluminium', {'body': 'black_matt', 'accent': 'satin', 'plate': 'satin'})]),
    'sofa-legs-1222': dict(build=lambda: aluminium(25, 36),
                           variants=[('Black aluminium', {'body': 'black_matt', 'accent': 'satin', 'plate': 'satin'})]),
    'sofa-legs-1226': dict(build=lambda: round_leg(
        [(3.0, 21.6), (5, 22.4), (10, 24.2), (16, 26.8), (22, 28.8), (28, 29.8), (33, 29.6), (33.6, 28.9), (34.4, 28.9), (35, 29.4), (40, 28.2),
         (46, 25.0), (50, 22.8), (54, 21.8), (58, 22.2), (63, 23.8), (68, 26.4), (71.5, 28.6), (TOP, 29.0)], 36),
        variants=finishes('CP', 'R/G', 'BLACK', 'GOLD', 'A.B.')),
    'sofa-legs-1232': dict(build=lambda: round_leg(
        [(3.0, 30.5, 'accent'), (3.5, 32.0, 'accent'), (10, 32.0, 'accent'), (10.8, 30.5, 'accent'), (11, 25.5), (46, 30.0), (46.4, 31.6, 'accent'),
         (50, 32.5, 'accent'), (56, 32.5, 'accent'), (60, 31.2, 'accent'), (62, 29.0, 'accent'), (64, 27.8, 'accent'), (68, 27.6, 'accent'),
         (71, 29.4, 'accent'), (TOP, 30.5, 'accent')], 40, uv=True),
        variants=finishes('CP') + [('Rose gold & black', CODES['R/G, BLACK'][1]), ('Gold & black', CODES['BLACK, GOLD'][1])] + finishes('CUBIK')),
    'sofa-legs-1245': dict(build=lambda: round_leg(
        [(3.0, 36.5, 'accent'), (3.5, 38.0, 'accent'), (8, 38.0, 'accent'), (8.6, 36.6, 'accent'), (9.2, 35.2), (14, 33.6), (22, 31.2),
         (32, 30.2), (44, 30.6), (46, 31.2), (46.2, 32.5, 'accent'), (TOP - 1.2, 32.5, 'accent'), (TOP, 31.8, 'accent')], 45, uv=True),
        variants=finishes('CP', 'CUBIK')),
}


def bulges(z0, z1, count, crest, root, role='body'):
    """Rounded convex rings stacked from z0 to z1."""
    pitch = (z1 - z0) / count
    pts = []
    for i in range(count):
        a = z0 + i * pitch
        pts += [(a + pitch * (0.5 - 0.5 * math.cos(math.pi * k / 8)), root + (crest - root) * math.sin(math.pi * k / 8), role) for k in range(8)]
    pts.append((z1, root, role))
    return pts


def aluminium_waisted(radius, plate_r):
    """Black aluminium flaring to a wide foot, with three polished line rings under the plate (1223, 1224)."""
    flare = radius * 1.17
    profile = ([(3.0, flare - 1.5, 'body'), (4, flare, 'body'), (8, flare - 0.6), (14, flare - radius * 0.1), (22, radius * 1.0),
                (30, radius * 0.95), (38, radius * 0.97), (42, radius)] + lines([TOP - 22, TOP - 16, TOP - 10], radius)
               + [(TOP - 1.2, radius), (TOP, radius - 0.8)])
    return round_leg(profile, plate_r)


def corner_leg(height=H3, wing=58.0, thickness=1.6, flange=13.0):
    """Corner (Y) leg folded from sheet: two tapering wings meeting at the corner, top flanges with fixing holes."""
    from catalog3d import contours, cutter, on_face, pocket, sd_box, sd_circle
    parts = []
    for k, (dx, dy) in enumerate(((1, 0), (0, 1))):
        bm = bmesh.new()
        # Outline in (along the wing, height): narrow foot, concave sweep out to the wing tip at the top.
        outline = [(0, 0), (7, 0)] + [(7 + (wing - 7) * t ** 2.2, height * 0.12 + (height - 2 - height * 0.12) * t) for t in
                                      (i / 14 for i in range(1, 15))] + [(wing, height - 2), (wing, height), (0, height)]
        for s in (0, thickness):
            pass
        verts = [[bm.verts.new(((u * dx - (s if dy else 0)) * MM, (u * dy - (s if dx else 0)) * MM, z * MM)) for u, z in outline]
                 for s in (0, thickness)]
        n = len(outline)
        bm.faces.new(verts[0])
        bm.faces.new(list(reversed(verts[1])))
        for i in range(n):
            bm.faces.new((verts[0][i], verts[0][(i + 1) % n], verts[1][(i + 1) % n], verts[1][i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new(f'Wing {k}')
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(f'Wing {k}', mesh)
        bpy.context.collection.objects.link(obj)
        from catalog3d import assign_roles
        assign_roles(obj, ['body'])
        parts.append(soften(obj, 0.3))
        # Top flange: a strip folded outward along the wing, with an oval and two round holes.
        # Flanges fold inward, under the sofa frame that sits inside the corner.
        x0, x1 = (0, wing) if dx else (0, flange)
        y0, y1 = (0, flange) if dx else (flange, wing)  # the first flange covers the corner square
        top = box(f'Flange {k}', x0, x1, (y1 - y0) / 2, thickness / 2, 'body', z=height - thickness / 2)
        top.location.y += (y0 + y1) / 2 * MM
        bpy.context.view_layer.objects.active = top
        top.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        top.select_set(False)
        holes = [(16, 'round'), (30, 'oval'), (46, 'round')]
        for along, kind in holes:
            cx, cy = (along, flange / 2) if dx else (flange / 2, along)
            r = 2.2
            field = (lambda u, v, cx=cx, cy=cy, kind=kind: sd_box(u, v, cx, cy, 4.0 if (kind == 'oval' and dx) else 2.2,
                                                                  4.0 if (kind == 'oval' and dy) else 2.2, round_=2.2))
            loops = contours(field, cx - 6, cx + 6, cy - 6, cy + 6, step=0.1)
            pocket(top, cutter('Hole', loops, on_face('z', 1, height, thickness + 0.5)), 'body')
        parts.append(soften(top, 0.3))
    foot = turned('Foot', [(0, 0, 'glide'), (0, 5.5, 'glide'), (3, 5.5, 'glide'), (3, 4.0, 'body'), (6, 4.0, 'body'), (6, 0)], bevel=0)
    foot.location = (4.5 * MM, 4.5 * MM, 0)
    bpy.context.view_layer.objects.active = foot
    foot.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    foot.select_set(False)
    return parts + [foot]


PRODUCTS.update({
    'sofa-legs-1223': dict(build=lambda: aluminium_waisted(32.5, 45),
                           variants=[('Black aluminium', {'body': 'black_matt', 'accent': 'satin', 'plate': 'satin'})]),
    'sofa-legs-1224': dict(build=lambda: aluminium_waisted(25, 36),
                           variants=[('Black aluminium', {'body': 'black_matt', 'accent': 'satin', 'plate': 'satin'})]),
    'sofa-legs-1227': dict(build=lambda: round_leg(
        [(3.0, 27.0, 'accent'), (3.5, 28.4, 'accent'), (10, 28.4, 'accent'), (10.5, 27.4, 'accent'), (11, 25.2), (20, 26.4), (35, 28.6),
         (50, 30.6), (62, 32.0), (70, 32.8), (TOP, 33.0)], 40), variants=finishes('CP', 'R/G', 'GOLD', 'BLACK', 'A.B.')),
    'sofa-legs-1228': dict(build=lambda: round_leg(
        [(3.0, 27.6), (4, 29.0), (8, 28.8), (11, 27.4), (13, 26.0)] + bulges(14, 58, 4, 27.5, 24.5) + [(60, 25.0), (TOP - 3, 25.6), (TOP, 26.2)], 36),
        variants=finishes('CP', 'R/G', 'BLACK', 'A.B.')),
    'sofa-legs-1229': dict(build=lambda: round_leg(
        [(3.0, 28.4), (5, 29.6), (9, 29.0), (13, 27.0), (16, 25.4)] + bulges(17, 47, 2, 27.4, 25.0) + [(52, 25.2), (62, 26.0), (68, 27.4),
                                                                                                       (TOP, 28.6)], 36),
        variants=finishes('CP', 'R/G', 'GOLD', 'A.B.')),
    'sofa-legs-1231': dict(build=lambda: round_leg(
        [(3.0, 35.5), (3.5, 37.0), (6, 37.0), (6.5, 35.6), (7, 37.0), (10, 37.0), (10.5, 35.6), (11, 37.0), (14, 37.0), (15, 35.0),
         (16, 30.0, 'accent'), (22, 33.8, 'accent'), (32, 34.2, 'accent'), (42, 33.0, 'accent'), (48, 31.6, 'accent'), (49, 32.6),
         (54, 33.4), (55, 31.0, 'accent'), (56, 32.0, 'accent'), (TOP, 32.5, 'accent')], 46),
        variants=[('A · Rose gold & black', {'body': 'black_matt', 'accent': 'rose_gold_pvd', 'plate': 'rose_gold_matt'}),
                  ('B · Black & rose gold', {'body': 'rose_gold_pvd', 'accent': 'black_matt', 'plate': 'black_matt'}),
                  ('Gold & black', {'body': 'black_matt', 'accent': 'gold_pvd', 'plate': 'gold_matt'})]),
    'sofa-legs-1233': dict(build=lambda: round_leg(
        [(3.0, 30.5, 'accent'), (3.5, 32.0, 'accent'), (9, 32.0, 'accent'), (10, 30.6, 'accent'), (10.4, 22.0, 'accent'), (14, 22.0, 'accent'),
         (14, 28.0), (34, 28.0), (34, 21.0, 'accent'), (40, 21.0, 'accent'), (40, 26.0), (56, 26.0), (56, 27.0, 'accent'),
         (TOP - 1, 27.0, 'accent'), (TOP, 26.2, 'accent')], 36, uv=True),
        variants=[('A · Wood & matt steel', {'body': 'wood', 'accent': 'satin', 'plate': 'satin'}),
                  ('B · Matt steel', {'body': 'satin', 'accent': 'satin', 'plate': 'satin'}), ('CP', {'body': 'chrome', 'accent': 'chrome', 'plate': 'satin'})]),
    'sofa-legs-1235': dict(build=lambda: round_leg([(3.0, 15.5), (TOP - 1, 23.4), (TOP, 23.6)], 33),
                           variants=finishes('CP', 'R/G', 'BLACK', 'GOLD', 'A.B.')),
    'sofa-legs-1236': dict(build=lambda: round_leg(
        [(3.0, 34.0), (4, 36.0), (8, 35.6), (14, 33.6), (20, 32.6), (22, 32.5), (39.6, 32.5), (40, 32.1, 'accent'), (40.4, 32.5, 'accent'),
         (TOP - 1.2, 32.5, 'accent'), (TOP, 31.7, 'accent')], 45, uv=True),
        variants=finishes('CP', 'TT', 'BLACK', 'CUBIK', 'R/G')),
    'sofa-legs-1237': dict(build=corner_leg, variants=[
        ('A · Antique copper', {'body': 'rose_gold_matt'}), ('B · Antique', {'body': 'antique'}), ('C · Black', {'body': 'black_matt'}),
        ('D · Matt steel', {'body': 'satin'}), ('E · Gold', {'body': 'gold_matt'}), ('F · Rose gold', {'body': 'rose_gold_pvd'})]),
    'sofa-legs-1238': dict(build=lambda: round_leg(
        [(3.0, 30.0, 'accent'), (4, 31.0, 'accent'), (12, 28.6, 'accent'), (24, 25.6, 'accent'), (34, 23.6, 'accent')]
        + bulges(35, 64, 4, 25.2, 23.0) + [(66, 24.0), (TOP, 26.0)], 36),
        variants=finishes('CP', 'TT', 'BLACK', 'R/G', 'GOLD', 'R/G, BLACK')),
    'sofa-legs-1239': dict(build=lambda: round_leg(
        [(3.0, 29.0), (4, 30.4), (9, 30.0), (12, 28.0), (13, 26.0)] + bulges(13, 64, 5, 27.4, 25.0) + [(66, 25.6), (TOP, 27.0)], 36),
        variants=finishes('CP', 'R/G', 'GOLD', 'BLACK', 'A.B.')),
})


def _fluted(x, a, r):
    """Eight rounded flutes, deepest toward the scalloped foot (1243)."""
    if r < 20 or x < 3.5 or x > TOP - 1.5:
        return r
    depth = 0.7 + 1.5 * max(0.0, 1 - (x - 3) / (TOP - 3))
    return r + depth * math.cos(8 * a)


def _dense_profile(points, step=1.5):
    """Inserts points so relief has rings to bend."""
    out = [points[0]]
    for p, q in zip(points, points[1:]):
        n = max(1, int((q[0] - p[0]) / step))
        for i in range(1, n):
            t = i / n
            out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, *p[2:]))
        out.append(q)
    return out


PRODUCTS.update({
    'sofa-legs-1240': dict(build=lambda: round_leg(
        [(3.0, 38.5), (4, 40.4), (9, 40.2), (11, 38.6), (12, 35.0), (13, 33.6), (14, 34.4), (18, 37.2), (24, 38.0), (30, 36.2), (33, 33.4),
         (34, 32.6), (35, 34.2), (37, 34.6), (39, 33.4), (40, 32.4), (42, 34.4), (48, 37.6), (54, 38.0), (60, 36.0), (64, 33.4), (66, 32.4),
         (70, 32.8), (TOP, 34.0)], 46), variants=finishes('CP', 'R/G', 'GOLD', 'A.B.')),
    'sofa-legs-1241': dict(build=lambda: round_leg(
        [(3.0, 35.0), (4, 37.0), (8, 36.4), (12, 34.2), (16, 33.0), (22, 32.4)] + bulges(24, 52, 2, 34.2, 32.0) + [(56, 32.4), (TOP, 33.0)], 46),
        variants=finishes('CP', 'R/G', 'BLACK', 'GOLD', 'A.B.')),
    'sofa-legs-1242': dict(build=lambda: round_leg(
        [(3.0, 33.5, 'accent'), (4, 35.6, 'accent'), (7, 36.2, 'accent'), (11, 35.4, 'accent'), (14, 33.2, 'accent'), (16, 30.4), (22, 25.0),
         (28, 20.6), (34, 17.6), (40, 16.2), (52, 16.0, 'accent'), (TOP, 16.0, 'accent')], 36),
        variants=finishes('CP') + [('Black & rose gold', CODES['R/G, BLACK'][1])] + finishes('BLACK')),
    'sofa-legs-1243': dict(build=lambda: round_leg(_dense_profile(
        [(3.0, 27.0), (5, 29.5), (9, 30.5), (13, 29.4), (18, 26.6), (30, 25.4), (50, 25.0), (TOP, 25.4)]), 36, segments=192, modulate=_fluted),
        variants=finishes('CP', 'R/G', 'BLACK', 'GOLD', 'A.B.')),
    'sofa-legs-1244': dict(build=lambda: round_leg(
        [(3.0, 32.5, 'accent'), (3.5, 34.0, 'accent'), (10, 34.0, 'accent'), (10.8, 32.4, 'accent'), (11.2, 22.0), (30, 22.0), (30, 25.0, 'accent'),
         (34, 25.0, 'accent'), (34, 30.0), (54, 30.0), (54, 31.0, 'accent'), (TOP, 31.0, 'accent')], 36, uv=True),
        variants=finishes('CUBIK', 'CP') + [('Black & rose gold', CODES['R/G, BLACK'][1])]),
    'sofa-legs-1246': dict(build=lambda: round_leg(
        [(3.0, 31.0, 'accent'), (3.5, 32.4, 'accent'), (8, 32.4, 'accent'), (9, 31.2, 'accent'), (10, 29.6, 'accent'), (11, 28.0), (18, 30.6),
         (28, 31.6), (38, 30.8), (46, 28.6), (48, 28.2, 'accent'), (49, 30.4, 'accent'), (52, 31.2, 'accent'), (56, 30.6, 'accent'),
         (58, 29.4, 'accent'), (TOP, 30.0, 'accent')], 42, uv=True), variants=finishes('CP', 'CUBIK')),
})


def _fluted10(x, a, r):
    """Ten rounded flutes over a scalloped foot (1252)."""
    if r < 25 or x < 3.5 or x > TOP - 1.5:
        return r
    depth = 0.9 + 1.6 * max(0.0, 1 - (x - 3) / (TOP - 3))
    return r + depth * math.cos(10 * a)


PRODUCTS.update({
    'sofa-legs-1247': dict(build=lambda: round_leg(
        [(3.0, 32.5, 'accent'), (3.5, 34.0, 'accent'), (10, 34.0, 'accent'), (11, 32.0, 'accent'), (11.4, 19.0, 'accent'), (14, 18.4, 'accent'),
         (26, 18.4, 'accent'), (27, 20.0, 'accent'), (30, 25.0, 'accent'), (32, 26.4), (TOP - 1, 28.0), (TOP, 27.4)], 40, uv=True),
        variants=finishes('CUBIK', 'CP')),
    'sofa-legs-1249': dict(build=lambda: round_leg(
        [(3.0, 29.6, 'accent'), (4, 31.0, 'accent'), (8, 31.0, 'accent'), (9, 29.6, 'accent'), (10, 30.4, 'accent'), (14, 30.4, 'accent'),
         (16, 28.0, 'accent'), (19, 25.6, 'accent'), (22, 25.0), (TOP - 1, 25.0), (TOP, 24.4)], 36, uv=True),
        variants=finishes('CP', 'R/G', 'BLACK', 'GOLD', 'R/G, BLACK')
        + [('Wood grain (Cubik)', {'body': 'chrome', 'accent': 'wood', 'plate': 'satin'})]),
    'sofa-legs-1250': dict(build=lambda: round_leg(
        [(3.0, 30.0, 'accent'), (4, 31.4, 'accent'), (9, 31.0, 'accent'), (11, 29.0, 'accent'), (12, 26.0), (16, 28.4), (22, 29.0), (28, 27.4),
         (31, 25.0), (32, 24.2, 'accent'), (33, 26.2, 'accent'), (35, 26.6, 'accent'), (37, 26.0, 'accent'), (38, 24.4), (42, 27.4), (48, 28.4),
         (54, 27.2), (58, 25.0), (60, 24.4, 'accent'), (64, 25.4, 'accent'), (70, 27.2, 'accent'), (TOP, 28.0, 'accent')], 36),
        variants=finishes('CP', 'R/G', 'BLACK', 'GOLD', 'R/G, BLACK', 'A.B.')),
    'sofa-legs-1251': dict(build=lambda: round_leg(
        [(3.0, 30.4), (4, 32.0), (8, 31.6), (11, 29.8), (14, 27.0), (20, 24.0), (28, 22.4), (34, 22.2), (34.4, 23.6, 'accent'), (35.6, 24.6, 'accent'),
         (38.4, 24.6, 'accent'), (39.6, 23.6, 'accent'), (40, 22.2), (46, 22.6), (54, 24.4), (62, 26.4), (TOP, 28.4)], 36),
        variants=finishes('BLACK', 'CP', 'R/G', 'A.B.', 'R/G, BLACK')),
    'sofa-legs-1252': dict(build=lambda: round_leg(_dense_profile(
        [(3.0, 34.0), (5, 37.0), (9, 38.2), (13, 37.0), (18, 34.0), (30, 32.8), (50, 32.5), (TOP, 32.8)]), 46, segments=200, modulate=_fluted10),
        variants=finishes('CP', 'R/G', 'GOLD', 'A.B.')),
    'sofa-legs-1253': dict(build=lambda: round_leg(
        [(3.0, 33.6), (4, 35.0), (8, 35.0), (9, 34.0), (10, 35.2), (12, 36.0), (15, 35.6), (17, 34.2), (18.4, 32.8), (20, 32.5),
         (TOP - 1.2, 32.5), (TOP, 31.7)], 46), variants=finishes('CP', 'R/G', 'BLACK', 'GOLD')),
})


def block_leg(height, length=90.0, width=25.0, corner=False):
    """Rectangular block leg (1254-1257): straight, or an L for corners; fixing holes on top, glides below."""
    z0 = 3.0
    arms = [box('Arm', -length / 2, length / 2, width / 2, (height - z0) / 2, 'body', z=(height + z0) / 2)] if not corner else [
        box('Arm A', 0, length, width / 2, (height - z0) / 2, 'body', z=(height + z0) / 2),
        box('Arm B', 0, width, (length - width) / 2 + 0.5, (height - z0) / 2, 'body', z=(height + z0) / 2)]
    if corner:
        arms[0].location.y += width / 2 * MM
        arms[1].location.y += (width + (length - width) / 2 - 0.5) * MM
        for arm in arms:
            bpy.context.view_layer.objects.active = arm
            arm.select_set(True)
            bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
            arm.select_set(False)
        # One seamless solid: overlap arm B into arm A slightly, then union.
        arms[1].scale.y = 1.0
        mod = arms[0].modifiers.new('Union', 'BOOLEAN')
        mod.operation, mod.object, mod.solver = 'UNION', arms[1], 'EXACT'
        bpy.context.view_layer.objects.active = arms[0]
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(arms[1])
        arms = arms[:1]
    holes = ([(-length / 4, 0), (length / 4, 0)] if not corner else
             [(length * 0.45, width / 2), (length * 0.8, width / 2), (width / 2, length * 0.55), (width / 2, length * 0.85)])
    parts = []
    for arm in arms:
        mine = [(x, y) for x, y in holes if _inside(arm, x, y)]
        parts.append(soften(_drill(arm, mine, height - 12, height, 2.4) if mine else arm, 0.6))
    feet = ([(-length / 2 + 12, 0), (length / 2 - 12, 0)] if not corner else [(length - 12, width / 2), (width / 2, length - 12)])
    for x, y in feet:
        foot = glide(6.0)
        foot.location = (x * MM, y * MM, 0)
        parts.append(foot)
    return parts


def _inside(obj, x, y):
    from mathutils import Vector
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    return min(p.x for p in pts) <= x * MM <= max(p.x for p in pts) and min(p.y for p in pts) <= y * MM <= max(p.y for p in pts)


BLOCK = [('Matt', {'body': 'satin'}), ('CP', {'body': 'chrome'}), ('Rose gold', {'body': 'rose_gold_pvd'}), ('Black', {'body': 'black_matt'})]

PRODUCTS.update({
    'sofa-legs-1254': dict(build=lambda: block_leg(2 * INCH, length=75, corner=True), variants=BLOCK),
    'sofa-legs-1255': dict(build=lambda: block_leg(2 * INCH), variants=BLOCK),
    'sofa-legs-1256': dict(build=lambda: block_leg(3 * INCH, length=75, corner=True), variants=BLOCK),
    'sofa-legs-1257': dict(build=lambda: block_leg(3 * INCH, length=100), variants=BLOCK[:3]),
    'sofa-legs-1262': dict(build=lambda: round_leg(
        [(3.0, 29.6), (4, 31.2), (9, 31.0), (10, 29.6), (11, 26.0), (12, 25.0), (30, 25.0), (31, 23.6), (44, 23.6), (45, 25.0),
         (TOP - 1.2, 25.0), (TOP, 24.2)], 36), variants=finishes('CP', 'R/G', 'A.B.', 'GOLD')),
    'sofa-legs-1263': dict(build=lambda: round_leg(
        [(3.0, 25.0, 'accent'), (4, 26.4, 'accent'), (8, 26.2, 'accent'), (10, 25.2, 'accent'), (14, 22.0, 'accent'), (19, 19.4, 'accent'),
         (21, 18.6), (34, 19.4), (48, 21.2), (60, 23.4), (TOP, 25.2)], 36),
        variants=finishes('BLACK-MATT, BLACK', 'BLACK-GOLD', 'BLACK, R/G')),
})


def flutes(count, z0, z1, depth, min_r=0.0):
    """Rounded vertical flutes between heights z0 and z1, fading out over 2 mm at each end."""
    def modulate(x, a, r):
        if not (z0 <= x <= z1) or r < min_r:
            return r
        fade = min(1.0, (x - z0) / 2, (z1 - x) / 2)
        return r - depth * fade * (0.5 - 0.5 * math.cos(count * a)) ** 0.6
    return modulate


def square_frustum_leg(height, half_top, half_bottom, plate_half):
    """Tapered square leg on a square plate with a threaded insert instead of a stud (1274)."""
    top = height - 2.5
    parts = [glide(min(half_bottom, half_top) - 3), square_body(6.0, top, half_bottom, half_top, bevel=0.6),
             turned('Tip', [(3.0, 0, 'glide'), (3.0, half_bottom - 2, 'glide'), (6.0, half_bottom - 2, 'glide'), (6.0, 0)], bevel=0)]
    plate = square_plate(top, plate_half)
    insert = turned('Insert', [(top + 2.5, 0, 'bolt'), (top + 2.5, 5.2, 'bolt'), (top + 3.2, 5.2, 'bolt'), (top + 3.2, 3.4, 'bolt'),
                               (top - 6, 3.4, 'bolt'), (top - 6, 0)], segments=48, bevel=0)
    return parts + [plate, insert]


def angled_leg(length=6 * INCH, tilt=15.0, plate_half=30.0):
    """Tapered round leg welded at an angle to a square plate, with a rubber tip (1272)."""
    from mathutils import Matrix
    body = turned('Body', [(-8, 0), (-8, 15.0), (6, 15.0), (length - 18, 10.4), (length - 16, 10.2), (length - 16, 0)])
    tip = turned('Tip', [(length - 16.5, 0, 'glide'), (length - 16.5, 10.6, 'glide'), (length - 10, 11.2, 'glide'),
                         (length - 4, 9.6, 'glide'), (length - 1, 6.0, 'glide'), (length, 0)], bevel=0)
    plate = square_plate(-2.5, plate_half)
    for obj in (body, tip):
        obj.matrix_world = Matrix.Rotation(math.radians(180 - tilt), 4, 'Y') @ obj.matrix_world
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
        obj.select_set(False)
    # The tube's welded end is cut flat against the plate's underside.
    bm = bmesh.new()
    bm.from_mesh(body.data)
    cut = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, -2.5 * MM), plane_no=(0, 0, 1),
                                 clear_outer=True)
    edges = [e for e in cut['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    bmesh.ops.edgeloop_fill(bm, edges=edges)
    bm.to_mesh(body.data)
    bm.free()
    # Stand it on its tip: lift so the lowest point is at z=0.
    parts = [plate, body, tip]
    from mathutils import Vector
    low = min((o.matrix_world @ Vector(c)).z for o in parts for c in o.bound_box)
    for o in parts:
        o.location.z -= low
    return parts


def _wire(name, points, radius=2.0, role='body'):
    """A round wire through 3D points (mm), with smooth bends."""
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius * MM
    curve.bevel_resolution = 4
    curve.use_fill_caps = True
    spline = curve.splines.new('NURBS')
    spline.points.add(len(points) - 1)
    for p, (x, y, z) in zip(spline.points, points):
        p.co = (x * MM, y * MM, z * MM, 1)
    spline.order_u = 3
    spline.use_endpoint_u = True
    spline.resolution_u = 12
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.object
    obj.select_set(False)
    obj.data.materials.clear()
    from catalog3d import assign_roles
    assign_roles(obj, [role])
    return soften(obj, 0)


def wire_corner_leg(height=4 * INCH, tube_r=11.0, arm=70.0):
    """Corner leg: a tube under the corner, braced by three bent wires to an L bracket (1273)."""
    parts = [turned('Tube', [(3.0, 0), (3.0, tube_r), (height - 2, tube_r), (height - 2, 0)]),
             turned('Tip', [(0, 0, 'glide'), (0, tube_r - 0.5, 'glide'), (3.0, tube_r - 0.5, 'glide'), (3.0, 0)], bevel=0)]
    for k, (dx, dy) in enumerate(((1, 0), (0, 1))):
        x0, x1 = (-tube_r, arm) if dx else (-tube_r, 18 - tube_r)
        y0, y1 = (-tube_r, 18 - tube_r) if dx else (18 - tube_r, arm)  # bracket 0 covers the corner square
        plate = box(f'Bracket {k}', x0, x1, (y1 - y0) / 2, 1.0, 'body', z=height - 1)
        plate.location.y += (y0 + y1) / 2 * MM
        bpy.context.view_layer.objects.active = plate
        plate.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        plate.select_set(False)
        holes = [(30, 0), (52, 0)] if dx else [(0, 30), (0, 52)]
        parts.append(soften(_drill(plate, [(x if dx else -tube_r + 9, y if dy else -tube_r + 9) for x, y in holes], height - 2, height, 2.2), 0.3))
    for i, frac in enumerate((0.25, 0.5, 0.75)):
        z = 3 + (height - 6) * frac
        reach = arm * (1 - frac) * 0.95
        pts = [(reach, 0, height - 2), (tube_r + 1, 0, z), (0, -tube_r - 1, z), (-tube_r - 1, 0, z), (0, tube_r + 1, z), (0, reach, height - 2)]
        parts.append(_wire(f'Wire {i}', [(reach, -tube_r + 2, height - 2.5), (tube_r * 0.9, -tube_r * 0.6, z), (-tube_r * 0.2, -tube_r * 1.05, z),
                                          (-tube_r * 1.05, -tube_r * 0.2, z), (-tube_r * 0.6, tube_r * 0.9, z), (-tube_r + 2, reach, height - 2.5)], 1.8))
    return parts


PRODUCTS.update({
    'sofa-legs-1264': dict(build=lambda: round_leg(
        [(3.0, 25.6), (4, 27.0), (8, 27.0), (12, 25.4), (20, 21.4), (30, 19.0), (38, 18.6), (46, 19.4), (56, 21.8), (66, 24.4), (TOP, 25.4)], 35),
        variants=finishes('CP', 'BLACK', 'R/G', 'GOLD')),
    'sofa-legs-1265': dict(build=lambda: round_leg(
        [(3.0, 11.0, 'glide'), (10, 11.0, 'glide'), (10, 14.0), (20, 16.4), (34, 19.6), (48, 22.6), (56, 23.8), (62, 23.6), (66, 21.6),
         (68.5, 17.6, 'accent'), (TOP, 16.8, 'accent')], 34),
        variants=finishes('R/G', 'GOLD') + [('Black & rose gold', CODES['R/G, BLACK'][1]), ('Black & gold', CODES['BLACK, GOLD'][1]),
                                             ('CP', CODES['CP'][1])]),
    'sofa-legs-1266': dict(build=lambda: round_leg(
        [(3.0, 34.0, 'accent'), (4, 35.6, 'accent'), (6, 35.6, 'accent'), (6.6, 34.4, 'accent'), (7.2, 35.6, 'accent'), (9, 35.6, 'accent'),
         (9.6, 34.4, 'accent'), (10.2, 35.6, 'accent'), (14, 35.2, 'accent'), (20, 33.0, 'accent'), (24, 30.0, 'accent'), (27, 27.4),
         (30, 26.0), (34, 25.4), (34.6, 26.6), (35.2, 25.4), (TOP - 3, 24.4), (TOP, 25.4)], 36),
        variants=[('A · Black & rose gold', {'body': 'rose_gold_pvd', 'accent': 'black_matt', 'plate': 'black_matt'}),
                  ('B · Black & gold', {'body': 'gold_pvd', 'accent': 'black_matt', 'plate': 'black_matt'}),
                  ('C · Antique', CODES['A.B.'][1]), ('D · Gold', CODES['GOLD'][1]), ('E · Rose gold', CODES['R/G'][1])]),
    'sofa-legs-1267': dict(build=lambda: round_leg(
        [(3.0, 25.6), (14, 21.6), (26, 18.0), (36.4, 16.4), (37, 18.4, 'accent'), (38.6, 19.0, 'accent'), (40.2, 18.4, 'accent'), (40.8, 16.4),
         (52, 20.0), (64, 24.0), (TOP, 27.0)], 37),
        variants=[('A · Black & rose gold', CODES['BLACK, R/G'][1]), ('B · Black PVD & black matt', CODES['BLACK-MATT, BLACK'][1]),
                  ('C · Black & gold', CODES['BLACK, GOLD'][1])]),
    'sofa-legs-1268': dict(build=lambda: round_leg(
        [(3.0, 31.4), (4, 33.0), (8, 32.8), (12, 30.4), (16, 28.2), (22, 26.8), (30, 26.4), (40, 27.0), (50, 28.4), (60, 30.2), (TOP, 32.0)], 44),
        variants=finishes('R/G', 'BLACK', 'GOLD', 'CP')),
    'sofa-legs-1269': dict(build=lambda: round_leg(_dense_profile(
        [(3.0, 21.0, 'accent'), (4, 22.4, 'accent'), (9, 22.4, 'accent'), (10, 21.2, 'accent'), (11, 22.0, 'accent'), (14, 22.0, 'accent'),
         (17, 18.0), (20, 16.0), (TOP, 16.0)]), 30, segments=240, modulate=flutes(24, 20.5, TOP - 1, 0.9, 15.5)),
        variants=finishes('GOLD', 'BLACK', 'CP', 'R/G', 'A.B.')),
    'sofa-legs-1270': dict(build=lambda: round_leg(_dense_profile(
        [(3.0, 30.0, 'accent'), (4, 31.6, 'accent'), (9, 31.6, 'accent'), (10, 30.0, 'accent'), (14, 27.0, 'accent'), (22, 22.6, 'accent'),
         (30, 18.4, 'accent'), (36, 16.4, 'accent'), (37, 15.0), (39, 14.0), (TOP - 4, 15.0), (TOP, 16.0)], 1.0), 36, segments=240,
        modulate=flutes(20, 10.5, 36, 1.4, 15)),
        variants=[('A · Black & gold', {'body': 'black_matt', 'accent': 'gold_pvd', 'plate': 'black_matt'}),
                  ('B · Black & rose gold', {'body': 'black_matt', 'accent': 'rose_gold_pvd', 'plate': 'black_matt'})]),
    'sofa-legs-1271': dict(build=lambda: round_leg(_dense_profile(
        [(3.0, 26.0), (6, 25.6), (14, 22.0), (22, 18.0), (28, 16.4), (30.4, 16.4), (31, 18.0, 'accent'), (33, 18.4, 'accent'),
         (35, 18.0, 'accent'), (35.6, 16.4), (TOP - 3, 16.6), (TOP, 18.4)], 1.0), 35, segments=240, modulate=flutes(20, 36, TOP - 3.5, 0.8, 15)),
        variants=[('A · Black & rose gold', CODES['BLACK, R/G'][1]), ('B · Rose gold', CODES['R/G'][1]), ('C · Black', CODES['BLACK'][1])]),
    'sofa-legs-1272': dict(build=angled_leg, variants=finishes('BLACK', 'CP', 'GOLD', 'R/G')),
    'sofa-legs-1273': dict(build=wire_corner_leg, variants=finishes('CP', 'BLACK', 'GOLD', 'R/G')),
    'sofa-legs-1274': dict(build=lambda: square_frustum_leg(4 * INCH, 21.0, 13.0, 30.0),
                           variants=[('A · Rose gold', {'body': 'rose_gold_matt', 'plate': 'rose_gold_matt'}),
                                     ('B · Antique', {'body': 'antique', 'plate': 'antique'}),
                                     ('C · Black', {'body': 'black_matt', 'plate': 'black_matt'}),
                                     ('D · Gold', {'body': 'gold_matt', 'plate': 'gold_matt'})]),
})


# ---- 1501-1521: aluminium legs. Heights use the smallest listed size. ----
from .door_handles import knurl

H4 = 4 * INCH


def V(body, accent=None, plate='black_matt'):
    return {'body': body, 'accent': accent or body, 'plate': plate}


def column(profile, top_kind='plate', plate_r=30.0, segments=192, modulate=None):
    """A turned leg from the floor (z=0) up: profile is (z, r, role). top_kind 'plate' adds a round plate with
    a slotted screw; 'stud' a round plate with an M8 stud; 'flush' drills three fixing holes in the top face."""
    top = profile[-1][0]
    body = turned('Body', profile + [(top, 0)], segments=segments, modulate=modulate)
    parts = [body]
    if top_kind in ('plate', 'stud'):
        parts += [round_plate(top, plate_r)]
        if top_kind == 'stud':
            parts.append(stud(top + 2.5))
        else:
            parts.append(turned('Screw', [(top + 2.5, 0, 'bolt'), (top + 2.5, 4.6, 'bolt'), (top + 3.6, 4.2, 'bolt'), (top + 4.2, 3.0, 'bolt'),
                                          (top + 4.4, 0)], segments=48, bevel=0))
    else:
        r = profile[-1][1] * 0.55
        _drill(body, [(r * math.cos(a), r * math.sin(a)) for a in (math.pi / 2 + k * 2 * math.pi / 3 for k in range(3))], top - 5, top, 2.0)
        parts.append(stud(top))
    return parts


def tip(r, h=4.0, role='rubber'):
    return [(0, 0, role), (0, r - 0.8, role), (0.6, r, role), (h, r, role)]


def glide_foot(r, h=3.0):
    return [(0, 0, 'glide'), (0, r - 1.0, 'glide'), (0.6, r, 'glide'), (h, r, 'glide')]


def stack(z0, z1, count, r0, r1, depth=1.6, role='body'):
    """Stacked rings (each a flat band with a rounded lower edge) from radius r0 at z0 to r1 at z1."""
    pitch = (z1 - z0) / count
    pts = []
    for i in range(count):
        a = z0 + i * pitch
        r = r0 + (r1 - r0) * (i + 0.5) / count
        pts += [(a, r - depth, role), (a + pitch * 0.12, r - depth * 0.35, role), (a + pitch * 0.3, r, role), (a + pitch * 0.92, r, role),
                (a + pitch, r - depth * 0.15, role)]
    return pts


def square_fluted(z0, z1, grooves=2, depth=1.0, n=10):
    """Rounded-square section with grooves on each face, over heights z0..z1 (1505)."""
    def modulate(x, a, r):
        if not (z0 <= x <= z1):
            return r
        c, s = abs(math.cos(a)), abs(math.sin(a))
        rr = r / (c ** n + s ** n) ** (1 / n)
        t = (math.sin(a) / max(c, 1e-6)) if c > s else (math.cos(a) / max(s, 1e-6))
        t = max(-1.0, min(1.0, t))
        g = sum(math.exp(-((t - p) / 0.13) ** 2) for p in ([-0.4, 0.4] if grooves == 2 else [0.0]))
        return rr - depth * g * min(1.0, (x - z0) / 2, (z1 - x) / 2)
    return modulate


def ornate_plate(z, half=30.0, thickness=2.5):
    """Square plate with round lobes at the corners and a notch between each pair (1505)."""
    from catalog3d import contours, cutter, sd_box, sd_circle
    def field(u, v):
        body = sd_box(u, v, 0, 0, half - 5, half - 5, round_=1.5)
        lobes = min(sd_circle(u, v, sx * (half - 7), sy * (half - 7), 7.0) for sx in (-1, 1) for sy in (-1, 1))
        notches = min(sd_circle(u, v, cx, cy, 3.2) for cx, cy in ((0, half - 3), (0, -half + 3), (half - 3, 0), (-half + 3, 0)))
        return max(min(body, lobes), -notches)
    loops = contours(field, -half - 2, half + 2, -half - 2, half + 2, step=0.15)
    plate = cutter('Plate', loops, lambda u, v, t: (u, v, z + t * thickness), floor_index=0)
    from catalog3d import assign_roles
    assign_roles(plate, ['plate'])
    return soften(_drill(plate, [(sx * (half - 7), sy * (half - 7)) for sx in (-1, 1) for sy in (-1, 1)], z, z + thickness, 2.2), 0.3)


T4 = H4 - 2.5  # plate underside for a 4 in leg
T3 = H3 - 2.5

PRODUCTS.update({
    'sofa-legs-1501': dict(build=lambda: column(_dense_profile(
        tip(10.6) + [(4.4, 10.6, 'accent'), (30, 10.6, 'accent'), (30.4, 15.0), (33, 16.2), (T4 - 4, 19.0), (T4 - 1.4, 19.4), (T4, 19.6)], 1.2),
        'stud', 30, segments=240, modulate=flutes(30, 33.5, T4 - 4.5, 0.9, 14)),
        variants=[('A · Black & rose gold', V('black_matt', 'rose_gold_pvd')), ('B · Black', V('black_matt', 'black_pvd')),
                  ('C · Black & gold', V('black_matt', 'gold_pvd')), ('D · Green', V('green_matt', 'green_matt', 'green_matt')),
                  ('E · Antique & gold', V('antique', 'gold_pvd', 'antique'))]),
    'sofa-legs-1502': dict(build=lambda: column(_dense_profile(
        glide_foot(23.5) + [(3.4, 24.4), (6, 25.0), (9, 24.4), (11.4, 22.8), (12.2, 21.4), (13, 21.0), (T3 - 1, 21.0), (T3, 21.6)], 1.2),
        'stud', 30, segments=240, modulate=flutes(28, 13.5, T3 - 1.5, 0.8, 19)),
        variants=[('A · Grey', V('grey_matt', plate='grey_matt')), ('B · Green', V('green_matt', plate='green_matt')),
                  ('C · Black', V('black_matt')), ('D · Gold', V('gold_pvd', plate='gold_matt')), ('E · Rose gold', V('rose_gold_pvd', plate='rose_gold_matt'))]),
    'sofa-legs-1503': dict(build=lambda: column(_dense_profile(
        glide_foot(10.5) + [(3.4, 11.4, 'accent'), (8, 13.0, 'accent'), (14, 15.4, 'accent'), (19, 17.0, 'accent'), (20.4, 17.2, 'accent'),
                            (21.2, 16.4), (22, 17.0), (T3 - 1, 17.0), (T3, 17.4)], 1.2),
        'stud', 30, segments=240, modulate=flutes(26, 22.5, T3 - 1.5, 0.8, 15)),
        variants=[('A · Black', V('black_matt', 'black_pvd')), ('B · Antique & black', V('antique', 'black_matt')),
                  ('C · Black & rose gold', V('black_matt', 'rose_gold_pvd')), ('D · Black & gold', V('black_matt', 'gold_pvd')),
                  ('E · Rose gold & black', V('rose_gold_matt', 'black_matt'))]),
    'sofa-legs-1504': dict(build=lambda: column(_dense_profile(
        glide_foot(12.0) + [(3.4, 12.6, 'accent'), (6, 13.6, 'accent'), (9, 13.4, 'accent'), (11, 11.4, 'accent'), (12.5, 8.4, 'accent'),
                            (16, 8.4, 'accent'), (17, 14.0, 'accent'), (18.4, 15.4, 'accent'), (21.6, 15.4, 'accent'), (22.4, 14.6),
                            (T4 - 1, 14.6), (T4, 15.0)], 1.2),
        'plate', 25, segments=240, modulate=flutes(24, 23, T4 - 1.5, 0.8, 13.5)),
        variants=[('A · Black', V('black_matt', 'black_pvd')), ('B · Antique & gold', V('antique', 'gold_pvd')),
                  ('C · Green & gold', V('green_matt', 'gold_pvd', 'green_matt')), ('D · Black & gold', V('black_matt', 'gold_pvd')),
                  ('E · Rose gold', V('rose_gold_matt', 'rose_gold_pvd', 'rose_gold_matt'))]),
    'sofa-legs-1505': dict(build=lambda: [*column(_dense_profile(
        [(0, 0, 'rubber'), (0, 11.0, 'rubber'), (6, 11.0, 'rubber'), (6, 10.8), (T3 - 6, 15.4), (T3, 16.6)], 1.2),
        'flush', segments=256, modulate=square_fluted(6.5, T3 - 0.5))[:1], ornate_plate(T3, 30), stud(T3 + 2.5)],
        variants=[('A · Rose gold', V('rose_gold_pvd', plate='rose_gold_matt')), ('B · Green', V('green_matt', plate='green_matt')),
                  ('C · Black', V('black_matt')), ('D · Grey', V('grey_matt', plate='grey_matt')), ('E · Gold', V('gold_pvd', plate='gold_matt'))]),
    'sofa-legs-1506': dict(build=lambda: column(_dense_profile(
        glide_foot(16.0) + [(3.4, 17.6, 'accent'), (5.6, 17.6, 'accent'), (6.2, 16.8), (T3 - 1, 16.8), (T3, 16.0)], 1.2),
        'flush', segments=256, modulate=flutes(32, 6.6, T3 - 1.4, 0.8, 15)),
        variants=[('A · Green & gold', V('green_matt', 'gold_pvd')), ('B · Black', V('black_matt', 'black_pvd')),
                  ('C · Rose gold & gold', V('rose_gold_matt', 'gold_pvd')), ('D · Black & gold', V('black_matt', 'gold_pvd')),
                  ('E · Black & rose gold', V('black_matt', 'rose_gold_pvd')), ('F · Antique & black', V('antique', 'black_matt'))]),
    'sofa-legs-1507': dict(build=lambda: column(
        glide_foot(11.0) + stack(3.0, T4 - 8, 12, 12.0, 17.0) + [(T4 - 7.5, 15.0), (T4 - 3, 14.0), (T4, 14.5)], 'plate', 25),
        variants=[('A · Black PVD', V('black_pvd')), ('B · Gold & green', V('gold_pvd', plate='green_matt')),
                  ('C · Green & black', V('green_matt')), ('D · Rose gold', V('rose_gold_pvd', plate='rose_gold_matt')),
                  ('E · Gold & black', V('gold_pvd'))]),
    'sofa-legs-1508': dict(build=lambda: column(
        glide_foot(10.0) + stack(3.0, T4 - 26, 12, 10.6, 14.6) + [(T4 - 25, 13.0, 'accent'), (T4 - 12, 10.4, 'accent'), (T4 - 4, 9.4, 'accent'),
                                                                    (T4 - 1, 10.0, 'accent'), (T4, 10.4, 'accent')], 'plate', 22),
        variants=[('A · Rose gold', V('rose_gold_pvd', plate='rose_gold_matt')), ('B · Black PVD', V('black_pvd')),
                  ('C · Green & black', V('green_matt', 'black_matt')), ('D · Grey', V('grey_matt', plate='grey_matt')),
                  ('E · Gold & green', V('gold_pvd', 'green_matt', 'green_matt')), ('F · Gold & black', V('gold_pvd', 'black_matt'))]),
    'sofa-legs-1509': dict(build=lambda: column(
        glide_foot(10.4) + stack(3.0, 32, 8, 12.8, 10.0, depth=1.4, role='accent') + [(32, 9.6), (50, 11.6), (70, 14.2), (T4 - 2, 16.4), (T4, 16.6)],
        'plate', 22),
        variants=[('A · Green & gold', V('green_matt', 'gold_pvd')), ('B · Black & rose gold', V('black_matt', 'rose_gold_pvd')),
                  ('C · Black & gold', V('black_matt', 'gold_pvd')), ('D · Black', V('black_matt', 'black_pvd')),
                  ('E · Green & black', V('green_matt', 'black_matt')), ('F · Grey & black', V('grey_matt', 'black_matt')),
                  ('G · Rose gold', V('rose_gold_matt', 'rose_gold_pvd')), ('H · Gold', V('gold_matt', 'gold_pvd'))]),
    'sofa-legs-1510': dict(build=lambda: column(
        tip(9.6) + stack(4.0, 26, 5, 12.4, 10.2, depth=1.2, role='accent') + [(26, 9.6), (50, 12.6), (75, 16.2), (H4 - 6, 18.6),
                                                                              (H4 - 5.6, 19.2), (H4 - 0.4, 19.2), (H4, 18.6)],
        'flush'),
        variants=[('A · Green & gold', V('green_matt', 'gold_pvd')), ('B · Black', V('black_matt', 'black_pvd')),
                  ('C · Rose gold', V('rose_gold_matt', 'rose_gold_pvd')), ('D · Gold', V('gold_matt', 'gold_pvd'))]),
    'sofa-legs-1511': dict(build=lambda: column(_dense_profile(
        tip(12.4) + [(4.4, 13.4), (18, 13.4), (18.6, 11.0), (T4 - 30, 11.0), (T4 - 29.4, 13.4), (T4 - 2, 13.4), (T4 - 1, 12.4), (T4, 12.4)], 0.5),
        'plate', 25, segments=256, modulate=knurl(0, T4, 13.4, 64, pitch=1.4, depth=0.45)),
        variants=[('A · Gold', V('gold_pvd')), ('B · Black', V('black_pvd')), ('C · Rose gold', V('rose_gold_pvd'))]),
    'sofa-legs-1512': dict(build=lambda: column(
        tip(5.6) + [(4.4, 6.4, 'accent'), (6, 8.2, 'accent'), (9, 10.2, 'accent'), (13, 11.0, 'accent'), (17, 10.2, 'accent'), (20, 8.0, 'accent'),
                    (21, 7.6, 'accent'), (22, 8.2, 'accent'), (26, 11.6, 'accent'), (31, 12.8, 'accent'), (36, 12.0, 'accent'), (40, 9.4, 'accent'),
                    (42, 9.2), (48, 12.4), (56, 15.4), (64, 17.0), (72, 16.6), (80, 14.0), (86, 13.2), (92, 14.6), (T4, 16.4)], 'plate', 25),
        variants=[('A · Black & rose gold', V('black_matt', 'rose_gold_pvd')), ('B · Black', V('black_matt', 'black_pvd')),
                  ('C · Black & gold', V('black_matt', 'gold_pvd')), ('D · Rose gold', V('rose_gold_matt', 'rose_gold_pvd', 'rose_gold_matt')),
                  ('E · Gold', V('gold_matt', 'gold_pvd', 'gold_matt'))]),
    'sofa-legs-1513': dict(build=lambda: column(
        tip(5.0) + stack(4.0, 70, 11, 6.4, 15.0, depth=1.0, role='accent') + [(70, 14.0), (80, 15.8), (88, 19.6), (94, 24.6), (T4 - 1, 27.4),
                                                                               (T4, 27.6)], 'plate', 28),
        variants=[('A · Black PVD', V('black_pvd', 'black_pvd')), ('B · Black & rose gold', V('black_matt', 'rose_gold_pvd')),
                  ('C · Gold', V('gold_pvd', 'gold_pvd', 'gold_matt')), ('D · Black & gold', V('black_matt', 'gold_pvd')),
                  ('E · Rose gold', V('rose_gold_pvd', 'rose_gold_pvd', 'rose_gold_matt'))]),
    'sofa-legs-1514': dict(build=lambda: column(
        tip(8.4) + stack(4.0, 42, 7, 10.0, 12.6, depth=1.4, role='accent') + stack(42, H4 - 6, 9, 14.0, 19.6, depth=1.4)
        + [(H4 - 5, 20.2), (H4 - 0.5, 20.2), (H4, 19.8)], 'flush'),
        variants=[('A · Black & rose gold', V('black_matt', 'rose_gold_pvd')), ('B · Black', V('black_matt', 'black_pvd')),
                  ('C · Black & gold', V('black_matt', 'gold_pvd'))]),
    'sofa-legs-1515': dict(build=lambda: column(
        tip(8.6) + [(4.4, 9.4, 'accent')] + bulges(4.4, 16, 3, 11.4, 9.4, role='accent')[1:] + [(16, 8.0), (30, 8.6), (46, 10.4), (56, 13.6),
                                                                                                 (63, 15.6), (68, 15.4), (72, 14.4)]
        + bulges(72, 94, 4, 16.0, 14.0, role='accent') + [(94, 15.2), (95, 16.4), (H4 - 0.4, 16.4), (H4, 16.0)], 'flush'),
        variants=[('A · Black & rose gold', V('black_matt', 'rose_gold_pvd')), ('B · Black', V('black_matt', 'black_pvd')),
                  ('C · Black & gold', V('black_matt', 'gold_pvd'))]),
    'sofa-legs-1516': dict(build=lambda: column(
        tip(8.4) + [(4.4, 8.4, 'accent'), (20, 9.2, 'accent'), (40, 10.4, 'accent'), (56, 12.2, 'accent'), (66, 14.0, 'accent'), (66.4, 14.6),
                    (78, 17.6), (88, 20.6), (94, 22.0), (95, 23.0), (96, 23.6), (H4 - 2, 23.6), (H4 - 1.6, 22.2), (H4, 22.2)], 'flush'),
        variants=[('A · Black', V('black_matt', 'black_matt')), ('B · Black & rose gold', V('black_matt', 'rose_gold_pvd')),
                  ('C · Black & gold', V('black_matt', 'gold_pvd'))]),
    'sofa-legs-1517': dict(build=lambda: column(
        tip(7.6) + [(4.4, 8.2), (20, 9.2), (34, 11.0), (44, 13.8), (50, 15.4), (54, 15.0), (58, 13.0), (60, 12.6), (62, 13.8), (66, 15.6),
                    (71, 16.0), (76, 15.2), (79, 13.2), (80.6, 13.0), (83, 15.4), (88, 16.6), (94, 16.6), (95, 15.8), (96, 16.6),
                    (H4 - 0.5, 16.6), (H4, 16.0)], 'flush'),
        variants=[('A · Rose gold', V('rose_gold_pvd')), ('B · Black PVD', V('black_pvd')), ('C · Gold', V('gold_pvd'))]),
    'sofa-legs-1518': dict(build=lambda: column(_dense_profile(
        tip(15.4) + [(4.4, 16.4, 'accent'), (28, 16.4, 'accent'), (28.6, 14.6), (H4 - 6, 14.6), (H4 - 5.6, 15.6, 'accent'), (H4 - 0.5, 15.6, 'accent'),
                     (H4, 15.0, 'accent')], 0.5), 'flush', segments=256, modulate=knurl(4.6, 27.8, 16.4, 72, pitch=1.4, depth=0.45)),
        variants=[('A · Gold', V('gold_pvd', 'gold_matt')), ('B · Black', V('black_pvd', 'black_matt')), ('C · Rose gold', V('rose_gold_pvd', 'rose_gold_matt'))]),
    'sofa-legs-1519': dict(build=lambda: column(
        tip(13.4) + [(4.4, 14.0, 'accent'), (50, 14.6, 'accent'), (50.4, 14.6), (70, 15.4), (84, 16.8), (92, 18.6), (96, 20.0), (H4 - 1.6, 20.4),
                     (H4 - 1.2, 19.4), (H4, 19.4)], 'flush'),
        variants=[('A · Black & gold', V('black_matt', 'gold_pvd')), ('B · Black', V('black_matt', 'black_pvd')),
                  ('C · Black & rose gold', V('black_matt', 'rose_gold_pvd'))]),
    'sofa-legs-1520': dict(build=lambda: column(
        tip(6.2) + [(4.4, 6.6), (24, 7.4), (44, 9.4), (56, 11.4), (62, 13.4)] + bulges(62, 92, 4, 15.4, 12.6)[1:] + [(94, 14.0), (T4, 15.0)],
        'plate', 26),
        variants=[('A · Black PVD', V('black_pvd')), ('B · Rose gold', V('rose_gold_pvd', plate='rose_gold_matt')),
                  ('C · Gold', V('gold_pvd', plate='gold_matt'))]),
    'sofa-legs-1521': dict(build=lambda: column(
        glide_foot(14.0, 2.0) + [(2.0, 15.0, 'accent'), (4, 19.6, 'accent'), (6.5, 21.4, 'accent'), (9, 21.0, 'accent'), (12, 18.0, 'accent'),
                                 (14, 15.6, 'accent'), (15, 14.6), (40, 15.6), (70, 17.4), (H4 - 6, 18.8), (H4 - 5.6, 19.4), (H4 - 0.4, 19.4),
                                 (H4, 19.0)], 'flush'),
        variants=[('A · Black', V('black_matt', 'black_pvd')), ('B · Black & rose gold', V('black_matt', 'rose_gold_pvd')),
                  ('C · Black & gold', V('black_matt', 'gold_pvd'))]),
})
