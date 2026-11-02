export const objFixture = 'o MinhaPiramide\nv -1 0 -1\nv 1 0 -1\nv 1 0 1\nv -1 0 1\nv 0 2 0\nf 1 2 5\nf 2 3 5\nf 3 4 5\nf 4 1 5\nf 1 4 3 2\n';
export function glbFixture() {
  const vertices = Buffer.alloc(36);
  [-1, 0, 0, 1, 0, 0, 0, 1.5, 0].forEach((value, i) => vertices.writeFloatLE(value, i * 4));
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'Triangulo' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }], materials: [{ doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [.3, .8, .6, 1], metallicFactor: 0, roughnessFactor: .8 } }],
    buffers: [{ byteLength: 36 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1, 0, 0], max: [1, 1.5, 0] }] };
  let str = JSON.stringify(json); str += ' '.repeat((4 - str.length % 4) % 4);
  const chunk = Buffer.from(str), output = Buffer.alloc(12 + 8 + chunk.length + 8 + vertices.length);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(chunk.length, 12); output.writeUInt32LE(0x4e4f534a, 16); chunk.copy(output, 20);
  output.writeUInt32LE(vertices.length, 20 + chunk.length); output.writeUInt32LE(0x004e4942, 24 + chunk.length); vertices.copy(output, 28 + chunk.length);
  return output;
}
