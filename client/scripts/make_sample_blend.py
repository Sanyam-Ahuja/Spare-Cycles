"""Build the SpareCycles sample scene (web/public/samples/sparecycles-sample.blend).

A grid of graphite tiles rides a travelling wave; diagonal stripes of tiles
glow cobalt and magenta, like chunks being picked up by nodes. Tuned to render fast on CPU-only nodes:
72 frames, 640x360, Cycles at 12 samples + denoise.

    blender -b --factory-startup --python client/scripts/make_sample_blend.py -- <out.blend>
"""

import math
import sys

import bpy

out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "sparecycles-sample.blend"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ── Render settings ─────────────────────────────────────────────
scene.frame_start, scene.frame_end = 1, 72
scene.render.fps = 24
scene.render.resolution_x, scene.render.resolution_y = 640, 360
scene.render.resolution_percentage = 100
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
scene.cycles.use_adaptive_sampling = True
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 4
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "PNG"


def srgb(hex_str):
    h = hex_str.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


CARBON, GRAPHITE = srgb("#0C0C10"), srgb("#2A2A35")
COBALT, MAGENTA = srgb("#5C7CFF"), srgb("#FF2D78")

# ── World ───────────────────────────────────────────────────────
world = bpy.data.worlds.new("Carbon")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = CARBON
world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
scene.world = world


def material(name, color, emission=0.0, roughness=0.55):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = emission
    return m


tile_mat = material("Graphite", GRAPHITE, roughness=0.45)
cobalt_mat = material("Cobalt", COBALT, emission=1.8, roughness=0.4)
magenta_mat = material("Magenta", MAGENTA, emission=4.0, roughness=0.4)
floor_mat = material("Floor", CARBON, roughness=0.6)

# ── Floor ───────────────────────────────────────────────────────
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
bpy.context.object.data.materials.append(floor_mat)

# ── Tile grid on a travelling wave ──────────────────────────────
N, PITCH, SIZE = 11, 0.62, 0.5
half = (N - 1) / 2
for ix in range(N):
    for iy in range(N):
        x, y = (ix - half) * PITCH, (iy - half) * PITCH
        bpy.ops.mesh.primitive_cube_add(size=SIZE, location=(x, y, SIZE / 2))
        tile = bpy.context.object
        bevel = tile.modifiers.new("Bevel", "BEVEL")
        bevel.width, bevel.segments = 0.03, 2
        # Diagonal stripes of "dispatched chunks", alternating cobalt and magenta.
        stripe = (ix + iy) % 7 == 3
        glow = cobalt_mat if (ix + iy) % 14 == 3 else magenta_mat
        tile.data.materials.append(glow if stripe else tile_mat)
        phase = (x + y) * 0.9
        for f in range(scene.frame_start, scene.frame_end + 1, 4):
            t = (f - 1) / (scene.frame_end - scene.frame_start + 1) * 2 * math.pi
            lift = max(0.0, math.sin(t * 2 - phase)) ** 2 * 0.9
            tile.location.z = SIZE / 2 + lift
            tile.keyframe_insert("location", index=2, frame=f)

# ── Light + camera ──────────────────────────────────────────────
bpy.ops.object.light_add(type="SUN", location=(4, -4, 8))
sun = bpy.context.object
sun.data.energy = 2.5
sun.data.angle = math.radians(8)
sun.rotation_euler = (math.radians(40), math.radians(10), math.radians(35))

bpy.ops.object.camera_add(location=(7.2, -7.2, 6.0))
cam = bpy.context.object
cam.data.lens = 40
scene.camera = cam
target = bpy.data.objects.new("Target", None)
scene.collection.objects.link(target)
target.location = (0, 0, 0.4)
track = cam.constraints.new("TRACK_TO")
track.target = target
track.track_axis, track.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
# Slow orbit.
for f, ang in ((1, -45), (72, -25)):
    a = math.radians(ang)
    cam.location = (10.2 * math.cos(a), 10.2 * math.sin(a), 6.0)
    cam.keyframe_insert("location", frame=f)

bpy.ops.wm.save_as_mainfile(filepath=out, compress=False)
print("Saved", out)
