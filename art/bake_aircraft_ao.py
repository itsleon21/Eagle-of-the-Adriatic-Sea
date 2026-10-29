"""Bake a restrained, meter-scale aircraft occlusion attribute for the realtime renderer.

Run with Blender --background --python art/bake_aircraft_ao.py.
The original build scripts call bake_aircraft_ao(root) before exporting as well.
COLOR_0 contains linear greyscale visibility, not paint color. The runtime applies
it to indirect illumination so direct sunlight and lacquer highlights stay intact.
"""
import bpy
import bmesh
import math
import os
from array import array
from mathutils import Vector
from mathutils.bvhtree import BVHTree

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = 24
RADIUS = .9
STRENGTH = .42


def model_objects(root):
    return [root] + list(root.children_recursive)


def transparent(material):
    if material is None:
        return False
    if material.use_nodes:
        principled = material.node_tree.nodes.get('Principled BSDF')
        if principled and principled.inputs['Alpha'].default_value < .98:
            return True
    return material.diffuse_color[3] < .98


def bake_aircraft_ao(root):
    """Write AircraftAO on every mesh without changing vertices, normals or UVs."""
    bpy.context.view_layer.update()
    meshes = [obj for obj in model_objects(root) if obj.type == 'MESH']
    vertices, faces = [], []
    for obj in meshes:
        offset = len(vertices)
        vertices.extend(obj.matrix_world @ vertex.co for vertex in obj.data.vertices)
        for face in obj.data.polygons:
            material = obj.material_slots[face.material_index].material if obj.material_slots else None
            if transparent(material):
                continue
            ids = [offset + index for index in face.vertices]
            faces.extend((ids[0], ids[i], ids[i + 1]) for i in range(1, len(ids) - 1))
    tree = BVHTree.FromPolygons(vertices, faces, all_triangles=True, epsilon=0)
    directions = []
    golden = math.pi * (3 - math.sqrt(5))
    for index in range(SAMPLES):
        radius = math.sqrt((index + .5) / SAMPLES)
        angle = index * golden
        directions.append((radius * math.cos(angle), radius * math.sin(angle), math.sqrt(1 - radius * radius)))
    minimum, total, count = 1., 0., 0
    for obj in meshes:
        mesh = obj.data
        attribute = mesh.color_attributes.get('AircraftAO')
        if attribute:
            mesh.color_attributes.remove(attribute)
        attribute = mesh.color_attributes.new(name='AircraftAO', type='FLOAT_COLOR', domain='POINT')
        mesh.color_attributes.active_color = attribute
        mesh.color_attributes.render_color_index = mesh.color_attributes.find(attribute.name)
        normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
        values = array('f')
        for vertex in mesh.vertices:
            position = obj.matrix_world @ vertex.co
            normal = (normal_matrix @ vertex.normal).normalized()
            if normal.length_squared < .01:
                values.extend((1., 1., 1., 1.))
                continue
            tangent = normal.cross(Vector((0, 1, 0)) if abs(normal.y) < .95 else Vector((1, 0, 0))).normalized()
            bitangent = normal.cross(tangent)
            origin = position + normal * .004
            occlusion = 0.
            for x, y, z in directions:
                direction = tangent * x + bitangent * y + normal * z
                hit, _, _, distance = tree.ray_cast(origin, direction, RADIUS)
                if hit is not None:
                    # A nearby structural surface occludes more than distant geometry.
                    occlusion += .35 + .65 * (1 - distance / RADIUS)
            visibility = max(1 - STRENGTH, 1 - STRENGTH * occlusion / SAMPLES)
            values.extend((visibility, visibility, visibility, 1.))
            minimum = min(minimum, visibility)
            total += visibility
            count += 1
        attribute.data.foreach_set('color', values)
    root['occlusion_attribute'] = 'AircraftAO / COLOR_0: indirect visibility only'
    root['occlusion_radius_m'] = RADIUS
    root['occlusion_samples'] = SAMPLES
    print('AIRCRAFT_AO_BAKED', root.name, 'vertices', count, 'min', round(minimum, 4),
          'mean', round(total / max(1, count), 4), 'max', 1., flush=True)


def repair_surface_uvs(root):
    """Give end caps a real planar chart instead of a collapsed span-coordinate line.

    A zero-area UV on a nonzero-area face makes exported tangent == normal,
    producing black specular wedges in WebGL even when Cycles looks correct.
    """
    repaired = 0
    for obj in model_objects(root):
        if obj.type != 'MESH':
            continue
        mesh = obj.data
        bm = bmesh.new();bm.from_mesh(mesh)
        bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4])
        degenerate=[f for f in bm.faces if f.calc_area()<1e-12]
        if degenerate:bmesh.ops.delete(bm,geom=degenerate,context='FACES_ONLY')
        bm.to_mesh(mesh);bm.free();mesh.update()
        textured = any(m and m.use_nodes and any(n.type == 'TEX_IMAGE' for n in m.node_tree.nodes) for m in mesh.materials)
        if not textured:
            continue
        layer = mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
        for face in mesh.polygons:
            ids = list(face.loop_indices)
            uv = [layer.data[i].uv.copy() for i in ids]
            area = abs(sum(a.x*b.y-b.x*a.y for a,b in zip(uv,uv[1:]+uv[:1])))
            if area > 1e-10 or face.area < 1e-10:
                continue
            axis = max(range(3), key=lambda k: abs(face.normal[k]))
            axes = [k for k in range(3) if k != axis]
            for i in ids:
                co = mesh.vertices[mesh.loops[i].vertex_index].co
                layer.data[i].uv = (co[axes[0]]*.20,co[axes[1]]*.20)
            repaired += 1
    print('AIRCRAFT_UV_CAPS_REPAIRED', repaired, flush=True)


def export_with_ao(root, filepath):
    repair_surface_uvs(root)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in model_objects(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=filepath, export_format='GLB', use_selection=True,
        export_yup=False, export_apply=True, export_extras=True, export_tangents=True,
        export_vertex_color='NAME', export_vertex_color_name='AircraftAO',
        export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True,
    )


if __name__ == '__main__':
    for stem in ['aircraft', 'm5', 'mc72']:
        source = os.path.join(BASE, 'art', stem + '.blend')
        bpy.ops.wm.open_mainfile(filepath=source)
        root = bpy.data.objects.get('AircraftRoot')
        if root is None:
            raise RuntimeError('Missing aircraft root: ' + source)
        bake_aircraft_ao(root)
        export_with_ao(root, os.path.join(BASE, 'public', 'models', stem + '.glb'))
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=source, compress=True)
        print('AIRCRAFT_AO_COMPLETE', stem, flush=True)
