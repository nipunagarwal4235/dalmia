"""Cabinet knobs. Each is turned around a vertical axis and stands on its mounting face (z=0).
Profiles list (height, radius) in mm from the base up, estimated from the brochure photos for a
knob of roughly 25-30 mm; the brochure gives no dimensions. Every knob comes in seven finishes."""
import math
import bpy
from catalog3d import lathe, soften, ball

CATEGORY = 'knobs'

FINISHES = [('CP', {'knob': 'chrome'}), ('Gold', {'knob': 'gold_pvd'}), ('Black', {'knob': 'black_matt'}),
            ('Green', {'knob': 'green_matt'}), ('Grey', {'knob': 'grey_matt'}), ('Antique', {'knob': 'antique'}),
            ('Rose gold', {'knob': 'rose_gold_pvd'})]


def knob(profile, segments=160, bevel=0.15):
    """Spins (height, radius) points around the vertical axis; a closed loop (first point repeated) makes a ring."""
    obj = lathe('Knob', [(z, r) for z, r in profile], ['knob'] * (len(profile) - 1), segments=segments)
    obj.rotation_euler = (0, -math.pi / 2, 0)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.00001)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    obj.select_set(False)
    return [soften(obj, bevel)]


def arc(cz, cr, radius, a0, a1, steps=16):
    """Points on a circular arc in the (height, radius) plane, angles in degrees from +height."""
    return [(cz + radius * math.cos(math.radians(a)), cr + radius * math.sin(math.radians(a)))
            for a in (a0 + (a1 - a0) * i / steps for i in range(steps + 1))]


def grooved(profile, at, depth=0.45, width=0.8):
    """Cuts V grooves (radially) into a monotonic-height profile at the given heights."""
    def radius(z):
        for (z0, r0), (z1, r1) in zip(profile, profile[1:]):
            if z0 <= z <= z1 and z1 > z0:
                return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    out = [p for p in profile if not any(abs(p[0] - g) < width for g in at)]
    for g in at:
        out += [(g - width / 2, radius(g - width / 2)), (g, radius(g) - depth), (g + width / 2, radius(g + width / 2))]
    return sorted(out, key=lambda p: (p[0], -p[1] if p[0] == out[-1][0] else p[1]))


def _ball_head(base_top, neck_r, radius):
    """A ball whose bottom meets a neck of neck_r at base_top, returned bottom to top."""
    centre = base_top + math.sqrt(radius ** 2 - neck_r ** 2)
    start = math.degrees(math.acos(-(centre - base_top) / radius))
    return [(centre + radius * math.cos(math.radians(a)), radius * math.sin(math.radians(a))) for a in
            [start - (start) * i / 24 for i in range(25)]], centre + radius


def knob_2001():
    head, top = _ball_head(9.5, 6.4, 12.5)
    body = [(0, 0), (0, 12.6), (0.6, 13.2), (4.4, 13.2), (5.0, 12.4), (5.6, 8.0), (6.4, 6.6), (9.5, 6.4)] + head[1:]
    centre = top - 12.5
    rings = [centre + 12.5 * math.cos(math.radians(a)) for a in (128, 112, 98, 84, 70, 56)]
    return knob(grooved(body, sorted(rings), depth=0.5, width=0.9))


def knob_2002():
    profile = [(0, 0), (0, 12.6), (0.6, 13.2), (3.8, 13.2), (4.4, 12.4), (4.6, 9.0), (8.0, 8.8), (8.4, 9.4), (26.4, 12.0),
               (27.0, 11.6), (27.2, 0)]
    profile = grooved(profile, [19.6, 21.8, 24.0], depth=0.5, width=0.9)
    return knob(profile)


def knob_2003():
    return knob([(0, 0), (0, 7.4), (0.6, 8.0), (5.0, 8.0), (5.6, 7.2), (8, 5.6), (12, 5.0), (16, 5.6), (19, 7.4), (21, 9.6),
                 (22.6, 11.8), (23.4, 12.8), (24.4, 13.1), (26, 13.0), (27.2, 12.4), (28.0, 10.0), (28.3, 6.0), (28.4, 0)])


def knob_2004():
    top = [(25.4, r) for r in (12.4,)]
    rings = []
    for k, r in enumerate((10.8, 8.8, 6.8, 4.8, 2.8)):
        rings += [(25.6, r + 0.45), (25.15, r), (25.6, r - 0.45)]
    return knob([(0, 0), (0, 10.4), (0.6, 11.0), (5.4, 11.0), (6.0, 10.2), (6.4, 6.8), (7.4, 6.4), (8.0, 7.2), (8.6, 6.4),
                 (13, 6.0), (16, 6.8), (18.4, 8.8), (20.4, 11.6), (21.6, 12.8), (24.6, 12.8), (25.6, 12.2)] + rings + [(25.6, 1.2), (25.6, 0)])


def knob_2005():
    head, top = _ball_head(10.0, 5.4, 11.5)
    return knob([(0, 0), (0, 12.4), (0.6, 13.0), (3.6, 13.0), (4.2, 12.2), (4.6, 7.6), (6.0, 7.6), (6.4, 6.2), (7.4, 7.0),
                 (8.4, 6.0), (10.0, 5.4)] + head[1:])


def knob_2006():
    head = [(13.0, 11.6), (13.4, 12.0)]
    head += [p for k in range(6) for p in [(13.4 + k * 2.3 + 0.5, 12.2), (13.4 + k * 2.3 + 1.8, 12.2), (13.4 + k * 2.3 + 2.3, 11.6)]]
    return knob([(0, 0), (0, 10.4), (0.6, 11.0), (3.0, 11.0), (3.4, 10.0), (3.8, 9.2), (6.4, 9.2), (6.8, 8.4), (8.0, 7.0),
                 (10.6, 7.0), (12.2, 9.2)] + head + [(27.6, 11.6), (27.8, 11.0), (28.0, 0)])


def knob_2007():
    return knob([(0, 0), (0, 11.4), (0.6, 12.0), (3.0, 11.0), (13.0, 5.2), (15.0, 5.2), (25.0, 11.4), (27.2, 12.4), (27.8, 11.8),
                 (28.0, 0)])


def knob_2008():
    return knob([(0, 0), (0, 11.4), (0.6, 12.0), (11.0, 12.0)] + [(z, r) for z, r in arc(11.0, 9.0, 3.0, 90, 0, 8)][1:] +
                [(14.0, 6.6), (17.0, 6.6), (17.4, 9.0), (18.4, 12.0), (19.4, 12.8), (21.6, 13.0), (23.4, 12.6), (24.6, 11.2), (25.2, 8.0),
                 (25.4, 0)])


def knob_2009():
    return knob([(0, 0), (0, 6.6), (0.6, 7.2), (6, 7.8), (12, 8.8), (18, 10.6), (22, 11.9), (25, 12.5), (27.6, 12.4), (30.2, 11.6),
                 (32.2, 9.8), (33.6, 7.0), (34.4, 3.6), (34.6, 0)])


def knob_2010():
    head, top = _ball_head(21.0, 1.6, 8.8)
    return knob([(0, 0), (0, 13.6), (0.5, 14.0), (1.4, 13.2), (6, 9.2), (12, 5.2), (17, 2.6), (20, 1.7), (21.0, 1.6)] + head[1:])


def knob_2011():
    # Spool ring: flared lips top and bottom, waisted outside, open through the middle.
    outside = [(0, 9.4), (0, 13.8), (0.5, 14.6), (1.6, 14.9), (3.0, 14.4), (5.0, 12.8), (8.0, 12.2), (11.0, 12.8), (13.0, 14.4),
               (14.4, 14.9), (15.5, 14.6), (16.0, 13.8)]
    inside = [(16.0, 12.0), (15.6, 10.6), (14.6, 9.6), (13.0, 9.2), (3.0, 9.2), (1.4, 9.4), (0.4, 9.4)]
    return knob(outside + inside + [(0, 9.4)], bevel=0.1)


def knob_2012():
    # Grommet: rounded lip on top, a plain collar below, a funnelled hole through.
    outside = [(0, 8.6), (0, 10.8), (0.5, 11.2), (9.0, 11.2), (9.4, 12.8), (10.2, 14.4), (11.6, 15.0), (13.0, 14.6), (13.8, 13.6),
               (14.0, 12.4)]
    inside = [(13.8, 11.4), (13.0, 10.2), (11.6, 9.2), (9.0, 8.6), (0.4, 8.6)]
    return knob(outside + inside + [(0, 8.6)], bevel=0.1)


def knob_2013():
    head = [(9.0, 10.8)]
    for k in range(3):
        z0 = 9.0 + k * 6.2
        head += [(z, r) for z, r in arc(z0 + 3.1, 10.0, 3.1, 180, 0, 12)][1:]
    return knob([(0, 0), (0, 11.4), (0.6, 12.0), (2.6, 12.0), (3.0, 11.2), (3.2, 9.4), (5.0, 9.4), (5.4, 8.4), (6.0, 6.4),
                 (8.2, 6.4), (9.0, 10.8)] + head[1:] + [(27.6, 12.4), (27.8, 0)])


PRODUCTS = {f'knobs-{n}': dict(build=fn, variants=FINISHES) for n, fn in (
    (2001, knob_2001), (2002, knob_2002), (2003, knob_2003), (2004, knob_2004), (2005, knob_2005), (2006, knob_2006),
    (2007, knob_2007), (2008, knob_2008), (2009, knob_2009), (2010, knob_2010), (2011, knob_2011), (2012, knob_2012),
    (2013, knob_2013))}
