"""Shared modelling, finishes, and export for the catalogue's 3D models.

Products are built from roles ("bar", "cap", "inlay", ...). Each finish variant maps
roles to palette materials, and the exported GLB carries every variant through
KHR_materials_variants so viewers can switch finishes.
Units: specs are written in millimetres; Blender works in metres.
"""
import bpy, bmesh, json, math, os, struct
from mathutils import Vector

MM = 0.001

# Linear base colour, metallic, roughness. Tuned against the brochure photographs.
PALETTE = {
    'black_matt': ((0.006, 0.006, 0.006), 0.0, 0.55),
    'black_pvd': ((0.025, 0.025, 0.028), 1.0, 0.16),
    'gold_pvd': ((1.0, 0.77, 0.36), 1.0, 0.10),
    'gold_matt': ((1.0, 0.77, 0.36), 1.0, 0.42),
    'rose_gold_pvd': ((0.72, 0.30, 0.17), 1.0, 0.10),
    'rose_gold_matt': ((0.62, 0.26, 0.15), 1.0, 0.38),
    'chrome': ((0.92, 0.92, 0.93), 1.0, 0.04),
    'satin': ((0.62, 0.60, 0.56), 1.0, 0.32),
    'antique': ((0.42, 0.36, 0.18), 1.0, 0.38),
    'antique_dark': ((0.25, 0.20, 0.11), 1.0, 0.32),
    'green_matt': ((0.12, 0.21, 0.15), 0.0, 0.6),
    'grey_matt': ((0.15, 0.15, 0.155), 0.0, 0.7),
    # Parts that keep their material in every finish.
    'glide': ((0.80, 0.80, 0.78), 0.0, 0.55),
    'rubber': ((0.018, 0.018, 0.018), 0.0, 0.85),
    'bolt': ((0.52, 0.53, 0.55), 1.0, 0.42),
    'wood': ((1.0, 1.0, 1.0), 0.0, 0.45),
    'gold_brushed': ((1.0, 0.77, 0.36), 1.0, 0.30),
    'rose_gold_brushed': ((0.72, 0.30, 0.17), 1.0, 0.30),
    'antique_brushed': ((0.42, 0.36, 0.18), 1.0, 0.30),
}


TEXTURES = {'wood': 'wenge.jpg'}  # palette keys drawn from an image, generated on first use
TEXTURE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'textures')


def texture_path(key):
    path = os.path.join(TEXTURE_DIR, TEXTURES[key])
    if not os.path.exists(path):
        _make_wenge(path)
    return path


def _make_wenge(path, width=512, height=1024, seed=7):
    """Wenge wood grain: dark chocolate with fine, slightly wandering light streaks running along v.
    Noise is periodic across u so the texture wraps round a leg without a seam."""
    import numpy as np
    rng = np.random.default_rng(seed)

    def periodic_noise(n, falloff, lo=2, hi=None):
        spectrum = np.zeros(n // 2 + 1, dtype=complex)
        k = np.arange(lo, (hi or n // 2) + 1)
        spectrum[lo:lo + k.size] = (rng.normal(size=k.size) + 1j * rng.normal(size=k.size)) / k ** falloff
        noise = np.fft.irfft(spectrum, n)
        return (noise - noise.mean()) / (noise.std() + 1e-9)

    fine = periodic_noise(width * 4, 0.5, lo=14, hi=150)  # dense grain lines, smooth at pixel scale
    broad = periodic_noise(width * 4, 1.4, lo=1, hi=24)   # wide colour bands
    wander = periodic_noise(height, 1.8, lo=1, hi=12)[:, None] * 0.0025  # grain drifts slowly along its length
    u = (np.linspace(0, 1, width, endpoint=False)[None, :] + wander) % 1.0
    idx = u * width * 4
    sample = lambda arr: np.interp(idx, np.arange(arr.size), arr, period=arr.size)
    g, b = sample(fine), sample(broad)
    streak = np.clip(g * 0.55 + 0.15, 0, 1) ** 1.6
    band = np.clip(b * 0.25 + 0.5, 0, 1)
    deep = np.array([0.16, 0.085, 0.045])
    base = np.array([0.34, 0.19, 0.105])
    light = np.array([0.62, 0.40, 0.24])
    rgb = deep + (base - deep) * band[..., None]
    rgb = rgb + (light - rgb) * streak[..., None] * 0.8
    rgba = np.concatenate([rgb, np.ones((height, width, 1))], axis=2).astype(np.float32)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image = bpy.data.images.new('wenge', width, height, alpha=False)
    image.colorspace_settings.name = 'sRGB'
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = path
    image.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 88
    image.save()
    bpy.data.images.remove(image)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def palette_material(key):
    name = 'finish:' + key
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    colour, metallic, roughness = PALETTE[key]
    mat = bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*colour, 1)
    if key in TEXTURES:
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = bpy.data.images.load(texture_path(key), check_existing=True)
        mat.node_tree.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if not metallic:  # powder coat: weak, soft reflections so it stays black
        bsdf.inputs['Specular IOR Level'].default_value = 0.2
    return mat


def role_material(role):
    """Placeholder material named after the role; export and QA swap in finishes."""
    return bpy.data.materials.get(role) or bpy.data.materials.new(role)


def assign_roles(obj, roles):
    for role in roles:
        obj.data.materials.append(role_material(role))


def lathe(name, points, roles, segments=160, modulate=None, recolour=None, uv=False):
    """Spins (x, radius) points in mm around the X axis. roles[i] colours the span points[i]..points[i+1].
    modulate(x, angle, r) -> r adds angle-dependent relief (flutes, twists, knurls);
    recolour(x, angle, role) -> role colours faces by position (inlays, strips)."""
    assert len(roles) == len(points) - 1, name
    angles = [2 * math.pi * k / segments for k in range(segments)]
    face_roles = [[recolour((x0 + x1) / 2, (angles[k] + math.pi / segments), roles[span]) if recolour else roles[span]
                   for k in range(segments)] for span, ((x0, _), (x1, _)) in enumerate(zip(points, points[1:]))]
    unique_roles = list(dict.fromkeys(r for row in face_roles for r in row))
    mesh, bm = bpy.data.meshes.new(name), bmesh.new()
    rings = []
    for x, r in points:
        if r == 0:
            rings.append([bm.verts.new((x * MM, 0, 0))] * segments)
        else:
            radii = [modulate(x, a, r) for a in angles] if modulate else [r] * segments
            rings.append([bm.verts.new((x * MM, rr * MM * math.cos(a), rr * MM * math.sin(a))) for a, rr in zip(angles, radii)])
    uv_layer = bm.loops.layers.uv.new('UVMap') if uv else None
    radius = max(r for _, r in points) or 1.0
    for span, (a, b) in enumerate(zip(rings, rings[1:])):
        for k in range(segments):
            quad = list(dict.fromkeys([a[k], a[(k + 1) % segments], b[(k + 1) % segments], b[k]]))
            if len(quad) >= 3:
                face = bm.faces.new(quad)
                face.material_index = unique_roles.index(face_roles[span][k])
                if uv_layer:
                    for loop in face.loops:
                        co = loop.vert.co
                        angle = math.atan2(co.z, co.y) % (2 * math.pi) / (2 * math.pi) * segments
                        if angle < k - segments / 2:
                            angle += segments
                        elif angle > k + segments / 2:
                            angle -= segments
                        if math.hypot(co.y, co.z) < 1e-9:
                            angle = k + 0.5
                        loop[uv_layer].uv = (angle / segments * 2 * math.pi * radius / 60, co.x / MM / 60)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_roles(obj, unique_roles)
    return obj


def soften(obj, bevel=0.2, angle=30):
    """Rounds hard edges (bevel in mm) so they catch highlights, then smooths curved faces."""
    for other in bpy.context.selected_objects:
        other.select_set(False)
    if bevel:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width, mod.segments, mod.limit_method, mod.angle_limit = bevel * MM, 3, 'ANGLE', math.radians(angle)
        mod.harden_normals = False
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle + 5))
    weighted = obj.modifiers.new('Weighted', 'WEIGHTED_NORMAL')
    weighted.mode, weighted.keep_sharp, weighted.weight = 'FACE_AREA', True, 50
    bpy.ops.object.modifier_apply(modifier=weighted.name)
    obj.select_set(False)
    return obj


# Profile helpers. Each returns (x, radius, role) points; the role colours the span to the next point.

def ball(radius, neck, x0=0.0, role='cap', steps=14):
    """A ball finial starting at its tip, ending where the ball narrows to the neck radius."""
    end = math.pi - math.asin(min(1.0, neck / radius))
    return [(x0 + radius - radius * math.cos(t), radius * math.sin(t), role)
            for t in (end * i / steps for i in range(steps + 1))]


def ridges(x0, x1, count, crest, root, role='cap', groove_role=None, shape='round'):
    """count bands between x0 and x1. 'round' bands bulge between grooves of radius root;
    'saw' bands fall from crest at their outer (x0) side to root, then step back up.
    crest and root may be (start, end) pairs to follow a taper."""
    pair = lambda v: v if isinstance(v, tuple) else (v, v)
    (c0, c1), (r0, r1) = pair(crest), pair(root)
    pitch = (x1 - x0) / count
    points = []
    for i in range(count):
        a = x0 + i * pitch
        t = (i + 0.5) / count
        c, r = c0 + (c1 - c0) * t, r0 + (r1 - r0) * t
        if shape == 'saw':
            points += [(a, c, role), (a + pitch * 0.25, c - (c - r) * 0.08, role), (a + pitch * 0.55, c - (c - r) * 0.35, role),
                       (a + pitch * 0.85, c - (c - r) * 0.75, role), (a + pitch, r, role)]
        else:
            g = pitch * 0.18  # groove width
            points += [(a, r, groove_role or role), (a + g, r, role)]
            points += [(a + g + (pitch - 2 * g) * k / 6, r + (c - r) * math.sin(math.pi * k / 6), role) for k in range(1, 6)]
            points += [(a + pitch - g, r, groove_role or role)]
    if shape == 'saw':
        points.append((x1, c1, role))
    else:
        points.append((x1, r1, groove_role or role))
    return points


def post(name, x, top, bottom, radius, role='bar', screw_hole=True):
    """Plain mounting post along Z from top to bottom (mm), grub-screw hole facing -Y."""
    return turned_post(name, x, [(-top, 0), (-top, radius), (-bottom, radius), (-bottom, 0)], role, 9 if screw_hole else None)


def turned_post(name, x, profile, role='bar', hole=9):
    """Post turned from (depth below the bar axis, radius) points in mm; hole is the screw hole height above the floor."""
    assert all(b[0] >= a[0] - 1e-6 for a, b in zip(profile, profile[1:])), f'{name}: post depths must not decrease'
    obj = lathe(name, profile, [role] * (len(profile) - 1), segments=96)
    obj.rotation_euler = (0, math.pi / 2, 0)
    obj.location = (x * MM, 0, 0)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    obj.select_set(False)
    if hole is not None:
        floor = max(d for d, _ in profile)
        z = -floor + hole
        radius = max(r for d, r in profile if abs(-d - z) < 4) if any(abs(-d - z) < 4 for d, r in profile) else max(r for _, r in profile)
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=1.3 * MM, depth=radius * 2 * MM,
                                            location=(x * MM, -radius * MM, z * MM), rotation=(math.pi / 2, 0, 0))
        cutter = bpy.context.object
        cut = obj.modifiers.new('Screw hole', 'BOOLEAN')
        cut.object, cut.solver = cutter, 'EXACT'
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=cut.name)
        bpy.data.objects.remove(cutter)
        obj.data.materials.clear()  # booleans leave the cutter's empty slot behind
        assign_roles(obj, [role])
    return soften(obj, 0.3)


def radial(name, xs, radius, role=lambda x, a: 'bar', segments=160):
    """Mesh around the X axis whose radius varies with position and angle: radius(x_mm, angle) -> mm.
    Covers twists, flutes, and knurling. Open at both ends, so it butts against turned parts
    that end on the same radius with the same segment count."""
    roles = []
    mesh, bm = bpy.data.meshes.new(name), bmesh.new()
    rings = [[bm.verts.new((x * MM, radius(x, a) * MM * math.cos(a), radius(x, a) * MM * math.sin(a)))
              for a in (2 * math.pi * k / segments for k in range(segments))] for x in xs]
    for (x0, a_ring), (x1, b_ring) in zip(zip(xs, rings), zip(xs[1:], rings[1:])):
        for k in range(segments):
            face_role = role((x0 + x1) / 2, 2 * math.pi * (k + 0.5) / segments)
            if face_role not in roles:
                roles.append(face_role)
            bm.faces.new([a_ring[k], a_ring[(k + 1) % segments], b_ring[(k + 1) % segments], b_ring[k]]).material_index = roles.index(face_role)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_roles(obj, roles)
    return obj


def join(objs, name):
    """Joins meshes and welds coincident seams, merging role materials by name."""
    for other in bpy.context.selected_objects:
        other.select_set(False)
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.002 * MM)
    bpy.ops.object.mode_set(mode='OBJECT')
    obj.select_set(False)
    # Collapse duplicate role slots ("bar" and "bar.001" are the same role material already).
    return obj


def _clean(profile):
    merged = [profile[0]]
    for point in profile[1:]:  # helpers can repeat a boundary point; keep the later role
        if abs(point[0] - merged[-1][0]) < 1e-9 and abs(point[1] - merged[-1][1]) < 1e-9:
            merged[-1] = point
        else:
            merged.append(point)
    assert all(b[0] >= a[0] - 1e-6 for a, b in zip(merged, merged[1:])), 'profile x must not decrease'
    return merged


def dense(x0, x1, r, step=0.5, role=None):
    """Evenly spaced points at one radius, so modulated relief has rings to bend."""
    n = max(1, round((x1 - x0) / step))
    return [(x0 + (x1 - x0) * i / n, r, *([role] if role else [])) for i in range(n + 1)]


def turned_bar(cap, length, middle_role='bar', full=False, **lathe_options):
    """The full turned bar: cap mirrored at both ends. If the cap reaches length/2 it is the whole
    half profile; with full=True, cap is the whole profile from one end to the other."""
    cap = _clean(cap)
    if full:
        roles = [p[2] if len(p) > 2 else 'cap' for p in cap[:-1]]
        return lathe('Bar', [(p[0] - length / 2, p[1]) for p in cap], roles, **lathe_options)
    points = [(p[0], p[1]) for p in cap]
    roles = [p[2] if len(p) > 2 else 'cap' for p in cap[:-1]]
    mirrored = [(length - x, r) for x, r in reversed(points)]
    if cap[-1][0] >= length / 2 - 1e-6:
        all_points, all_roles = points + mirrored[1:], roles + list(reversed(roles))
    else:
        all_points, all_roles = points + mirrored, roles + [middle_role] + list(reversed(roles))
    return lathe('Bar', [(x - length / 2, r) for x, r in all_points], all_roles, **lathe_options)


def handle_posts(centres, bar_r, standoff, post_r=6, post_role='bar', post_profile=None, hole=9):
    if post_profile:
        return [turned_post(f'Post {side}', side * centres / 2, post_profile, post_role, hole) for side in (-1, 1)]
    return [post(f'Post {side}', side * centres / 2, 0, -(bar_r + standoff), post_r, post_role) for side in (-1, 1)]


def bar_handle(cap, length=305, centres=192, bar_r=8, post_r=6, standoff=35, post_role='bar', post_profile=None, hole=9,
               full=False, bevel=0.2, **lathe_options):
    """A round bar with identical turned caps at both ends and two posts.

    cap lists (x, radius[, role]) from the end face inward; the role (default "cap")
    colours the span to the next point. It either ends at bar_r (a plain bar fills the
    middle) or reaches length/2 (a fully turned half profile). post_profile, if given,
    lists (depth below the bar axis, radius) for a turned post. Parts are centred on the bar.
    """
    bar = soften(turned_bar(cap, length, full=full, **lathe_options), bevel)
    return [bar, *handle_posts(centres, bar_r, standoff, post_r, post_role, post_profile, hole)]


def finish(objs, variant):
    """Swaps role materials on objs for one variant's palette materials."""
    for obj in objs:
        for slot in obj.material_slots:
            role = slot.material.name.split('.')[0] if slot.material else None
            key = variant.get(role, role if role in PALETTE else None)
            if key:
                slot.material = palette_material(key)


def group(objs, name='Product'):
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for obj in objs:
        obj.parent = root
    return root


def export(objs, path, variants):
    """Writes a GLB of objs with every variant as a KHR_materials_variants entry."""
    for other in bpy.context.selected_objects:
        other.select_set(False)
    for obj in objs:
        obj.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_extras=False,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                              export_draco_position_quantization=16, export_draco_normal_quantization=12)
    with open(path, 'rb') as file:
        data = file.read()
    json_length = struct.unpack_from('<I', data, 12)[0]
    gltf = json.loads(data[20:20 + json_length])
    bin_length = struct.unpack_from('<I', data, 20 + json_length)[0]
    binary = data[28 + json_length:28 + json_length + bin_length]  # BIN chunk payload
    materials = gltf['materials']
    roles = [m['name'] for m in materials]
    pick = lambda variant, role: variant.get(role, role)  # fixed parts are named after their palette key
    used = [pick(v, roles[p['material']]) for m in gltf['meshes'] for p in m['primitives'] for _, v in variants]
    index = {}
    for key in dict.fromkeys(used):
        colour, metallic, roughness = PALETTE[key]
        index[key] = len(materials)
        pbr = {'baseColorFactor': [*colour, 1], 'metallicFactor': metallic, 'roughnessFactor': roughness}
        if key in TEXTURES:
            binary = binary + b'\0' * (-len(binary) % 4)
            with open(texture_path(key), 'rb') as file:
                png = file.read()
            gltf.setdefault('bufferViews', []).append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(png)})
            binary += png
            gltf.setdefault('images', []).append({'bufferView': len(gltf['bufferViews']) - 1, 'mimeType': 'image/jpeg'})
            gltf.setdefault('samplers', []).append({})
            gltf.setdefault('textures', []).append({'sampler': len(gltf['samplers']) - 1, 'source': len(gltf['images']) - 1})
            pbr['baseColorTexture'] = {'index': len(gltf['textures']) - 1}
        materials.append({'name': key, 'pbrMetallicRoughness': pbr})
    binary = binary + b'\0' * (-len(binary) % 4)
    gltf['buffers'][0]['byteLength'] = len(binary)
    for mesh in gltf['meshes']:
        for primitive in mesh['primitives']:
            role = roles[primitive['material']]
            primitive['material'] = index[pick(variants[0][1], role)]
            primitive.setdefault('extensions', {})['KHR_materials_variants'] = {
                'mappings': [{'material': index[pick(v, role)], 'variants': [i]} for i, (_, v) in enumerate(variants)]}
    gltf.setdefault('extensions', {})['KHR_materials_variants'] = {'variants': [{'name': name} for name, _ in variants]}
    gltf['extensionsUsed'] = sorted({*gltf.get('extensionsUsed', []), 'KHR_materials_variants'})
    text = json.dumps(gltf, separators=(',', ':')).encode()
    text += b' ' * (-len(text) % 4)
    header = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(text) + 8 + len(binary)) + struct.pack('<II', len(text), 0x4E4F534A)
    with open(path, 'wb') as file:
        file.write(header + text + struct.pack('<II', len(binary), 0x004E4942) + binary)
    return os.path.getsize(path)


def studio(scene, resolution=(1600, 900), samples=48):
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = True
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.view_settings.look = 'AgX - Medium High Contrast'
    world = bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.52, 0.48, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.06


def _aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def qa_render(build, variants, path, samples=48):
    """Renders every variant side by side on a cream sweep, for comparing with the brochure photo."""
    reset()
    scene = bpy.context.scene
    studio(scene, samples=samples)
    roots = []
    for i, (_, variant) in enumerate(variants):
        objs = build()
        finish(objs, variant)
        roots.append(group(objs, f'Variant {i}'))
    # Lay the copies out in a diagonal row sized to the product.
    bounds = [Vector(c) for obj in roots[0].children for c in (obj.matrix_world @ Vector(v) for v in obj.bound_box)]
    lo = Vector((min(v.x for v in bounds), min(v.y for v in bounds), min(v.z for v in bounds)))
    hi = Vector((max(v.x for v in bounds), max(v.y for v in bounds), max(v.z for v in bounds)))
    size = hi - lo
    span = max(size.x, size.y, size.z)
    elongated = size.x > 3 * max(size.y, size.z)
    if elongated:
        gap = max(size.y, size.z) * 1.9 + span * 0.08
        for i, root in enumerate(roots):
            root.location = (i * span * 0.12, -i * gap, -lo.z)
            root.rotation_euler.z = math.radians(-14)
        centre = Vector(((len(roots) - 1) * span * 0.06, -(len(roots) - 1) * gap / 2, size.z / 2))
    else:  # compact products (knobs, legs) in a grid
        cols = math.ceil(math.sqrt(len(roots)))
        gap = max(size.x, size.y) * 1.6
        for i, root in enumerate(roots):
            root.location = ((i % cols) * gap - (lo.x + hi.x) / 2, -(i // cols) * gap - (lo.y + hi.y) / 2, -lo.z)
        rows = math.ceil(len(roots) / cols)
        centre = Vector(((cols - 1) * gap / 2, -(rows - 1) * gap / 2, size.z / 2))
    floor_z = 0.0
    mesh, bm = bpy.data.meshes.new('Backdrop'), bmesh.new()
    extent = span * 6 + gap * len(roots) * 3
    curve = [(y, floor_z) for y in (-extent, centre.y + extent * 0.15)]
    radius = extent * 0.25
    curve += [(centre.y + extent * 0.15 + radius * math.sin(t), floor_z + radius * (1 - math.cos(t)))
              for t in (math.pi / 2 * i / 24 for i in range(1, 25))]
    curve += [(curve[-1][0], extent * 2)]
    rows = [[bm.verts.new((x, y, z)) for x in (-extent, extent)] for y, z in curve]
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    bm.to_mesh(mesh)
    bm.free()
    backdrop = bpy.data.objects.new('Backdrop', mesh)
    bpy.context.collection.objects.link(backdrop)
    backdrop.data.shade_smooth()
    backdrop.data.materials.append(bpy.data.materials.new('Sweep'))
    bsdf = backdrop.active_material.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.72, 0.62, 0.46, 1)
    bsdf.inputs['Roughness'].default_value = 0.6
    scale = max(span, gap * len(roots))
    for name, offset, size_, power, colour in (('Key', (-1.1, -1.0, 1.8), 2.6, 55, (1, 0.97, 0.92)),
                                               ('Fill', (1.8, -1.1, 0.7), 3.0, 10, (0.92, 0.95, 1)),
                                               ('Rim', (0.3, 1.8, 1.1), 2.0, 25, (1, 0.97, 0.92))):
        light = bpy.data.lights.new(name, 'AREA')
        light.shape, light.size, light.size_y, light.color = 'RECTANGLE', size_ * scale, size_ * scale * 0.6, colour
        light.energy = power * scale ** 2
        obj = bpy.data.objects.new(name, light)
        bpy.context.collection.objects.link(obj)
        obj.location = centre + Vector(offset) * scale
        _aim(obj, centre)
    cam_data = bpy.data.cameras.new('Camera')
    cam_data.lens = 50
    cam = bpy.data.objects.new('Camera', cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    bpy.context.view_layer.update()
    _frame(cam, [obj for root in roots for obj in root.children], Vector((0.18, -1.0, 0.62)))
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def _frame(cam, objs, direction, margin=0.68):
    """Points the camera along direction at the objects' bounding sphere, at a distance where it fits."""
    points = [obj.matrix_world @ Vector(c) for obj in objs for c in obj.bound_box]
    centre = sum(points, Vector()) / len(points)
    radius = max((p - centre).length for p in points)
    fov = min(cam.data.angle_x, cam.data.angle_y) if cam.data.sensor_fit == 'AUTO' else cam.data.angle
    cam.location = centre + direction.normalized() * radius * margin / math.sin(fov / 2)
    _aim(cam, centre)


# Cut-out patterns. Shapes are 2D signed-distance fields in mm (negative inside), traced into
# outlines with marching squares, then extruded into cutters that pocket a surface. A pocket's
# floor takes its own role, so the core finish shows through the pattern.

def sd_circle(u, v, cu, cv, r):
    return math.hypot(u - cu, v - cv) - r


def sd_box(u, v, cu, cv, half_u, half_v, angle=0.0, round_=0.0):
    c, s = math.cos(angle), math.sin(angle)
    du, dv = (u - cu) * c + (v - cv) * s, -(u - cu) * s + (v - cv) * c
    qu, qv = abs(du) - half_u + round_, abs(dv) - half_v + round_
    return math.hypot(max(qu, 0), max(qv, 0)) + min(max(qu, qv), 0) - round_


def sd_segment(u, v, au, av, bu, bv, r):
    pu, pv, eu, ev = u - au, v - av, bu - au, bv - av
    t = max(0.0, min(1.0, (pu * eu + pv * ev) / (eu * eu + ev * ev)))
    return math.hypot(pu - eu * t, pv - ev * t) - r


def _simplify(points, tolerance):
    """Ramer-Douglas-Peucker on an open polyline."""
    if len(points) < 3:
        return points
    (au, av), (bu, bv) = points[0], points[-1]
    length = math.hypot(bu - au, bv - av) or 1e-12
    worst, index = 0.0, 0
    for i, (pu, pv) in enumerate(points[1:-1], 1):
        d = abs((bu - au) * (av - pv) - (au - pu) * (bv - av)) / length
        if d > worst:
            worst, index = d, i
    if worst <= tolerance:
        return [points[0], points[-1]]
    return _simplify(points[:index + 1], tolerance)[:-1] + _simplify(points[index:], tolerance)


def contours(field, u0, u1, v0, v1, step=0.08, tolerance=0.01):
    """Closed outlines of the region where field(u, v) < 0, by marching squares."""
    nu, nv = int(math.ceil((u1 - u0) / step)) + 1, int(math.ceil((v1 - v0) / step)) + 1
    # The border is forced outside so shapes running off the edge still trace as closed outlines.
    f = [[field(u0 + i * step, v0 + j * step) if 0 < i < nu - 1 and 0 < j < nv - 1 else 1.0 for j in range(nv)] for i in range(nu)]
    point = {}

    def edge(i, j, horizontal):
        key = (i, j, horizontal)
        if key not in point:
            a = f[i][j]
            b = f[i + 1][j] if horizontal else f[i][j + 1]
            t = a / (a - b) if a != b else 0.5
            point[key] = (u0 + (i + t * horizontal) * step, v0 + (j + t * (not horizontal)) * step)
        return key

    links = {}
    for i in range(nu - 1):
        for j in range(nv - 1):
            bl, br, tr, tl = f[i][j] < 0, f[i + 1][j] < 0, f[i + 1][j + 1] < 0, f[i][j + 1] < 0
            case = bl | br << 1 | tr << 2 | tl << 3
            if case in (0, 15):
                continue
            b, r, t, l = edge(i, j, True), edge(i + 1, j, False), edge(i, j + 1, True), edge(i, j, False)
            centre = (f[i][j] + f[i + 1][j] + f[i + 1][j + 1] + f[i][j + 1]) < 0
            pairs = {1: [(l, b)], 2: [(b, r)], 3: [(l, r)], 4: [(r, t)], 6: [(b, t)], 7: [(l, t)], 8: [(t, l)],
                     9: [(t, b)], 11: [(t, r)], 12: [(r, l)], 13: [(r, b)], 14: [(b, l)],
                     5: [(l, t), (r, b)] if centre else [(l, b), (r, t)],
                     10: [(b, r), (t, l)] if centre else [(b, l), (t, r)]}[case]
            for a, c in pairs:
                links.setdefault(a, []).append(c)
                links.setdefault(c, []).append(a)
    loops, seen = [], set()
    for start in links:
        if start in seen:
            continue
        loop, previous, current = [start], None, start
        seen.add(start)
        while True:
            options = [n for n in links[current] if n != previous]
            if not options:
                break
            previous, current = current, options[0]
            if current == start:
                break
            if current in seen:
                break
            seen.add(current)
            loop.append(current)
        if len(loop) >= 3:
            pts = [point[k] for k in loop]
            far = max(range(len(pts)), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
            pts = _simplify(pts[:far + 1], tolerance)[:-1] + _simplify(pts[far:] + [pts[0]], tolerance)[:-1]
            if len(pts) >= 3:
                loops.append(pts)
    return loops


def cutter(name, loops, mapper, floor_index=1):
    """Prisms over closed 2D outlines; mapper(u, v, t) -> (x, y, z) mm with t=0 the pocket floor and
    t=1 outside the surface. Floors use material index floor_index, walls index 0."""
    bm = bmesh.new()
    for loop in loops:
        n = len(loop)
        low = [bm.verts.new((u, v, 0.0)) for u, v in loop]
        high = [bm.verts.new((u, v, 1.0)) for u, v in loop]
        floor = bm.faces.new(list(reversed(low)))
        floor.material_index = floor_index
        bm.faces.new(high).material_index = 0
        for k in range(n):
            bm.faces.new((low[k], low[(k + 1) % n], high[(k + 1) % n], high[k])).material_index = 0
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    for vert in bm.verts:
        x, y, z = mapper(vert.co.x, vert.co.y, vert.co.z)
        vert.co = (x * MM, y * MM, z * MM)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bm.calc_volume(signed=True) < 0:  # mapping onto a cylinder can turn the shells inside out
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def wrapped(r_floor, r_out, angle0=math.pi / 2):
    """Maps (x along the bar, arc length v at r_out, t) onto a cylinder; v=0 is the top (+Z)."""
    def mapper(u, v, t):
        a = angle0 + v / r_out
        radius = r_floor + t * (r_out + 1.5 - r_floor)
        return (u, radius * math.cos(a), radius * math.sin(a))
    return mapper


def on_face(axis, sign, half, depth):
    """Maps (x, v, t) onto a box face normal to axis ('y' or 'z'), pocketing depth mm."""
    def mapper(u, v, t):
        w = sign * (half - depth + t * (depth + 1.5))
        return (u, w, v) if axis == 'y' else (u, v, w)
    return mapper


def pocket(obj, cutter_obj, floor_role, wall_role=None):
    """Cuts the cutter's pockets into obj; walls take wall_role (default obj's first role), floors floor_role."""
    names = [m.name if m else None for m in obj.data.materials]
    for role in (floor_role, wall_role):
        if role and role not in names:
            obj.data.materials.append(role_material(role))
            names.append(role)
    floor_index = names.index(floor_role)
    wall_index = names.index(wall_role) if wall_role else 0
    for poly in cutter_obj.data.polygons:
        poly.material_index = floor_index if poly.material_index == 1 else wall_index
    mod = obj.modifiers.new('Pattern', 'BOOLEAN')
    mod.operation, mod.object, mod.solver = 'DIFFERENCE', cutter_obj, 'EXACT'
    mod.material_mode = 'INDEX'
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter_obj)
    # The boolean can append empty slots; fill them with the wall role so nothing renders unassigned.
    for i, slot in enumerate(obj.material_slots):
        if slot.material is None:
            slot.material = obj.material_slots[0].material
    return obj


def box(name, x0, x1, half_y, half_z, role='bar', z=0.0, bevel=0.4):
    """Rectangular bar from x0 to x1 (mm), centred on y=0 and the given z."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2 * MM, 0, z * MM))
    obj = bpy.context.object
    obj.name = name
    obj.scale = ((x1 - x0) * MM, half_y * 2 * MM, half_z * 2 * MM)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.clear()
    assign_roles(obj, [role])
    obj.select_set(False)
    return obj
