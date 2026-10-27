"""Concealed (flush) handles, profile handles, and the folding table bracket.
Concealed handles are modelled at 8 in (203 mm) and profile handles at 6 in (152 mm); widths and
depths are read from the photos. Each concealed handle's plate sits on the door face (z=0) with its
cup sunk into the door; 'inner' is the finish inside the well."""
import math
import bpy
from catalog3d import (contours, cutter, pocket, on_face, soften, assign_roles, sd_box, sd_circle, sd_segment, box, MM)

CATEGORY = 'concealed-handles'
L8 = 203.0


def prism(name, field, lo, hi, z0, z1, role, step=0.12):
    """Extrudes the region field(u, v) < 0 (u along x, v along y) from z0 to z1."""
    loops = contours(field, lo[0], hi[0], lo[1], hi[1], step=step)
    obj = cutter(name, loops, lambda u, v, t: (u, v, z0 + t * (z1 - z0)), floor_index=0)
    assign_roles(obj, [role])
    return obj


def union(a, b):
    mod = a.modifiers.new('Union', 'BOOLEAN')
    mod.operation, mod.object, mod.solver = 'UNION', b, 'EXACT'
    bpy.context.view_layer.objects.active = a
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(b)
    return a


def rounded_box(u, v, hu, hv, radii):
    """Box with its own corner radius per quadrant: radii = (+u+v, +u-v, -u+v, -u-v)."""
    r = radii[0 if u >= 0 and v >= 0 else 1 if u >= 0 else 2 if v >= 0 else 3]
    qu, qv = abs(u) - hu + r, abs(v) - hv + r
    return math.hypot(max(qu, 0), max(qv, 0)) + min(max(qu, qv), 0) - r


def flush_pull(outline, slot, width, ribs=None, lip=2.2, cup=11.0, inset=1.8, depth=9.0):
    """outline(u, v) and slot(u, v) are fields; the cup is the outline shrunk by inset. ribs(u, v), if given,
    is a field of shallow grooves cut into the plate face."""
    half_l, half_w = L8 / 2 + 2, width / 2 + 2
    plate = prism('Plate', outline, (-half_l, -half_w), (half_l, half_w), 0, lip, 'body')
    body = prism('Cup', lambda u, v: outline(u, v) + inset, (-half_l, -half_w), (half_l, half_w), -cup, 0.2, 'body')
    plate = union(plate, body)
    loops = contours(slot, -half_l, half_l, -half_w, half_w, step=0.12)
    pocket(plate, cutter('Well', loops, on_face('z', 1, lip, depth)), 'inner', 'inner')
    if ribs:
        loops = contours(ribs, -half_l, half_l, -half_w, half_w, step=0.08)
        pocket(plate, cutter('Ribs', loops, on_face('z', 1, lip, 0.45)), 'body')
    return [soften(plate, 0.35)]


def ribs_along(v0, v1, count, u_half, width=0.5):
    """count shallow grooves running along the length, between v0 and v1."""
    def field(u, v):
        if abs(u) > u_half:
            return 1.0
        return min(abs(v - (v0 + (v1 - v0) * (k + 0.5) / count)) for k in range(count)) - width / 2
    return field


def P(plate, inner='black_matt'):
    return {'body': plate, 'inner': inner}


BASIC = [('CP & black', P('chrome')), ('Matt & black', P('satin')), ('Black', P('black_matt', 'black_pvd')),
         ('Rose gold', P('rose_gold_matt')), ('Gold', P('gold_matt'))]
PVD = [('Black & black PVD', P('black_matt', 'black_pvd')), ('Black & rose gold PVD', P('black_matt', 'rose_gold_pvd')),
       ('Black & gold PVD', P('black_matt', 'gold_pvd')), ('Rose gold & rose gold PVD', P('rose_gold_matt', 'rose_gold_pvd')),
       ('Gold & gold PVD', P('gold_matt', 'gold_pvd')), ('Antique & black PVD', P('antique', 'black_pvd')), ('Satin & CP', P('satin', 'chrome'))]
PVD_EXTRA = PVD[:-1] + [('Pista & gold PVD', P('green_matt', 'gold_pvd')), ('Grey & black PVD', P('grey_matt', 'black_pvd')), PVD[-1]]


def hexagonal(hu, hv, tip, flat):
    """Elongated hexagon: full width until tip mm from each end, narrowing to a flat of half-width flat."""
    n = math.hypot(tip, hv - flat)

    def field(u, v):
        chamfer = ((abs(u) - (hu - tip)) * (hv - flat) + (abs(v) - hv) * tip) / n
        return max(sd_box(u, v, 0, 0, hu, hv), chamfer)
    return field


def ornate(hu, hv):
    """Plate with a round tab at each end and concave shoulders either side of it (1508)."""
    def field(u, v):
        core = sd_box(u, v, 0, 0, hu - 8, hv, round_=1.0)
        tab = min(sd_circle(u, v, s * (hu - 9), 0, hv * 0.62) for s in (-1, 1))
        shoulders = min(sd_circle(u, v, s * (hu - 8), t * hv, 5.0) for s in (-1, 1) for t in (-1, 1))
        return min(max(core, -shoulders), tab)
    return field


W = {'1501': 28, '1502': 32, '1503': 34, '1504': 36, '1505': 34, '1506': 40, '1507': 42, '1508': 40, '1509': 44, '1510': 44}
H = L8 / 2

PRODUCTS = {
    'concealed-handles-dh-1501': dict(build=lambda: flush_pull(
        lambda u, v: sd_box(u, v, 0, 0, H, 14, round_=0.6), lambda u, v: sd_box(u, v, 0, 0, 52, 5.5, round_=1.0), 28),
        variants=BASIC + [('Antique & black', P('antique'))]),
    'concealed-handles-dh-1502': dict(build=lambda: flush_pull(
        lambda u, v: sd_box(u, v, 0, 0, H, 16, round_=15.9), lambda u, v: sd_box(u, v, 0, 0, H - 13, 8.5, round_=8.4), 32),
        variants=BASIC),
    'concealed-handles-dh-1503': dict(build=lambda: flush_pull(
        lambda u, v: sd_box(u, v, 0, 0, H, 17, round_=0.8), lambda u, v: sd_box(u, v, 0, 0, H - 12, 9.5, round_=0.8), 34),
        variants=BASIC),
    'concealed-handles-dh-1504': dict(build=lambda: flush_pull(
        lambda u, v: rounded_box(u, v, H, 18, (17.5, 1.5, 1.5, 17.5)), lambda u, v: rounded_box(u, v, H - 14, 9.5, (9.2, 1.2, 1.2, 9.2)), 36),
        variants=PVD),
    'concealed-handles-dh-1505': dict(build=lambda: flush_pull(
        lambda u, v: sd_box(u, v, 0, 0, H, 17, round_=1.0), lambda u, v: sd_box(u, v, 0, 0, H - 16, 9.5, round_=0.8), 34),
        variants=PVD),
    'concealed-handles-dh-1506': dict(build=lambda: flush_pull(
        hexagonal(H, 20, 14, 12), hexagonal(H - 18, 9.5, 9, 5), 40), variants=PVD),
    'concealed-handles-dh-1507': dict(build=lambda: flush_pull(
        lambda u, v: sd_box(u, v, 0, 0, H, 21, round_=3.0), lambda u, v: sd_box(u, v, 0, 0, H - 14, 12, round_=1.5), 42),
        variants=PVD),
    'concealed-handles-dh-1508': dict(build=lambda: flush_pull(
        ornate(H, 20), lambda u, v: sd_box(u, v, 0, 0, H - 26, 10, round_=1.0), 40),
        variants=[('Black & black PVD', P('black_matt', 'black_pvd')), ('Rose gold PVD', P('rose_gold_pvd', 'rose_gold_matt')),
                  ('Gold PVD', P('gold_pvd', 'gold_matt')), ('Antique & gold', P('antique', 'gold_pvd'))]),
    'concealed-handles-dh-1509': dict(build=lambda: flush_pull(
        lambda u, v: sd_box(u, v, 0, 0, H, 22, round_=1.0), lambda u, v: sd_box(u, v, 0, -5.5, 48, 8.0, round_=7.8), 44,
        ribs=ribs_along(6.5, 19.5, 5, H - 0.5)), variants=PVD_EXTRA),
    'concealed-handles-dh-1510': dict(build=lambda: flush_pull(
        lambda u, v: sd_box(u, v, 0, 0, H, 22, round_=21.9), lambda u, v: sd_box(u, v, 0, -5.5, 48, 8.0, round_=7.8), 44,
        ribs=lambda u, v: max(ribs_along(6.5, 19.5, 5, H)(u, v), sd_box(u, v, 0, 0, H - 1.5, 20.5, round_=20.4))), variants=PVD_EXTRA),
}


# ---- Profile handles: 6 in aluminium extrusions ----
L6 = 152.0


def section(name, field, lo, hi, length, role='body'):
    """Extrudes a cross-section field(y, z) along x for length mm, centred."""
    loops = contours(field, lo[0], hi[0], lo[1], hi[1], step=0.05)
    obj = cutter(name, loops, lambda u, v, t: (-length / 2 + t * length, u, v), floor_index=0)
    assign_roles(obj, [role])
    return obj


def side_cut(obj, field, lo, hi, y, thickness):
    """Cuts the region field(x, z) < 0 through a wall of the given thickness at y (pattern holes, end shapes)."""
    loops = contours(field, lo[0], hi[0], lo[1], hi[1], step=0.1)
    tool = cutter('Cut', loops, lambda u, v, t: (u, y - thickness - 1 + t * (thickness + 2), v), floor_index=0)
    mod = obj.modifiers.new('Cut', 'BOOLEAN')
    mod.object, mod.solver = tool, 'EXACT'
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(tool)
    return obj


def _drill_down(obj, points, z, radius=1.8):
    for x, y in points:
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius * MM, depth=8 * MM, location=(x * MM, y * MM, z * MM))
        tool = bpy.context.object
        mod = obj.modifiers.new('Hole', 'BOOLEAN')
        mod.object, mod.solver = tool, 'EXACT'
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(tool)
    return obj


def wall(name, field, x_half, z_lo, z_hi, y0, thickness, role='body'):
    """A flat wall: the region field(x, z) < 0 extruded across y from y0 to y0 + thickness."""
    loops = contours(field, -x_half - 1, x_half + 1, z_lo - 1, z_hi + 1, step=0.1)
    obj = cutter(name, loops, lambda u, v, t: (u, y0 + t * thickness, v), floor_index=0)
    assign_roles(obj, [role])
    return obj


def profile_1001():
    """Flat strip on the drawer's top edge with a grip flange down the front; the grip is shorter, with curved ends."""
    t = 1.6
    top = box('Top', -L6 / 2, L6 / 2, 11, t / 2, 'body', z=t / 2)
    _drill_down(top, [(-L6 / 2 + 12, -3), (L6 / 2 - 12, -3)], t / 2)
    grip = wall('Grip', lambda x, z: max(sd_box(x, z, 0, -10, L6 / 2, 10.4),
                                         -min(sd_circle(x, z, s * (L6 / 2 + 2), -22, 20.0) for s in (-1, 1))),
                L6 / 2, -21, 1, 11 - t, t)
    return [soften(top, 0.25), soften(grip, 0.25)]


def profile_1002():
    """C-channel pull: top flat, front wall, and a lip returning underneath."""
    t = 1.5
    obj = section('Profile', lambda y, z: min(sd_box(y, z, 0, -t / 2, 12, t / 2, round_=0.3), sd_box(y, z, 12 - t / 2, -9, t / 2, 9, round_=0.3),
                                             sd_box(y, z, 8.5, -18 + t / 2, 3.5, t / 2, round_=0.3), sd_box(y, z, -12 + t / 2, -4, t / 2, 4, round_=0.3)),
                  (-13, -19), (13, 1), L6)
    _drill_down(obj, [(-L6 / 2 + 14, -2), (L6 / 2 - 14, -2)], -1)
    return [soften(obj, 0.2)]


def _leaves(x, z, end, inward):
    """Five concentric curved slots fanning from the wall's lower corner at x=end (1003)."""
    dx, dz = (x - end) * inward, z + 22.0
    r, a = math.hypot(dx, dz), math.degrees(math.atan2(dz, dx))
    best = 1.0
    for k in range(5):
        radius = 6.0 + k * 4.4
        band = abs(r - radius) - 1.5
        span = max(18 - a, a - 78) * radius * math.pi / 180  # arc length outside 18-78 degrees
        best = min(best, max(band, span))
    return best


def profile_1003():
    """Angle profile whose front wall has leaf cut-outs fanning from each end."""
    t = 1.5
    top = box('Top', -L6 / 2, L6 / 2, 9, t / 2, 'body', z=-t / 2)
    _drill_down(top, [(-L6 / 2 + 40, 0), (L6 / 2 - 40, 0)], -t / 2)
    front = wall('Front', lambda x, z: max(sd_box(x, z, 0, -11, L6 / 2, 11), -min(_leaves(x, z, s * L6 / 2, -s) for s in (-1, 1))),
                 L6 / 2, -22, 0, 9 - t, t)
    return [soften(top, 0.2), soften(front, 0.2)]


PROFILE = [('CP', {'body': 'chrome'}), ('Matt', {'body': 'satin'}), ('Black', {'body': 'black_matt'}),
           ('Rose gold', {'body': 'rose_gold_pvd'}), ('Gold', {'body': 'gold_pvd'})]


# ---- Folding table bracket (heavy), 12 in ----
def channel(name, length, width=24.0, height=18.0, t=1.6):
    """U channel along x from 0 to length, open side down."""
    return section(name, lambda y, z: min(sd_box(y, z, 0, height / 2 - t / 2, width / 2, t / 2),
                                          sd_box(y, z, width / 2 - t / 2, 0, t / 2, height / 2), sd_box(y, z, -width / 2 + t / 2, 0, t / 2, height / 2)),
                   (-width / 2 - 1, -height / 2 - 1), (width / 2 + 1, height / 2 + 1), length)


def bracket():
    from mathutils import Matrix, Vector
    arm = 305.0
    parts = []

    def place(obj, start, end, roll=0.0):
        """Moves a channel built along x (centred) so it runs from start to end in the x-z plane."""
        d = Vector(end) - Vector(start)
        angle = math.atan2(d.z, d.x)
        mid = (Vector(start) + Vector(end)) / 2
        obj.matrix_world = Matrix.Translation(mid * MM) @ Matrix.Rotation(-angle, 4, 'Y') @ Matrix.Rotation(roll, 4, 'X')
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=False)
        obj.select_set(False)
        parts.append(soften(obj, 0.3))
    top = channel('Shelf arm', arm)
    place(top, (0, 0, 0), (arm, 0, 0))
    wall = channel('Wall arm', arm)
    place(wall, (arm - 9, 0, 9), (arm - 9, 0, -arm + 9), math.pi / 2)
    brace_a = channel('Brace', arm * 0.62, 20.0, 15.0)
    brace_b = channel('Brace sleeve', arm * 0.5, 23.0, 18.0)
    place(brace_a, (40, 0, -6), (40 + (arm - 50) * 0.6, 0, -6 - (arm - 20) * 0.6))
    place(brace_b, (40 + (arm - 50) * 0.42, 0, -6 - (arm - 20) * 0.42), (arm - 12, 0, -arm + 14))
    slider = box('Release', 20, 80, 8.5, 4.0, 'glide', z=-6)
    hinge = box('Hinge', arm - 22, arm + 2, 13, 3, 'glide', z=-4)
    parts += [soften(slider, 0.8), soften(hinge, 0.8)]
    for x, z in ((40, -6), (arm - 12, -arm + 14), (40 + (arm - 50) * 0.5, -6 - (arm - 20) * 0.5)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=3.2 * MM, depth=28 * MM, location=(x * MM, 0, z * MM), rotation=(math.pi / 2, 0, 0))
        rivet = bpy.context.object
        rivet.name = 'Rivet'
        rivet.data.materials.clear()
        assign_roles(rivet, ['bolt'])
        parts.append(soften(rivet, 0.4))
    return parts


PRODUCTS.update({
    'profile-handles-dh-1001': dict(category='profile-handles', build=profile_1001, variants=PROFILE),
    'profile-handles-dh-1002': dict(category='profile-handles', build=profile_1002, variants=PROFILE),
    'profile-handles-dh-1003': dict(category='profile-handles', build=profile_1003, variants=PROFILE[1:]),
    'brackets-folding table bracket (heavy)': dict(category='brackets', build=bracket,
                                                   variants=[('Charcoal', {'body': 'grey_matt'}), ('Black', {'body': 'black_matt'})]),
})
