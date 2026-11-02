export const MAX_UNPACKED_BYTES = 64 * 1024 * 1024;
export async function compressJSONText(text) {
  const raw = new Blob([text], { type: 'application/json' });
  if (raw.size > MAX_UNPACKED_BYTES) throw Error('Divida a apresentação em arquivos menores.');
  if (typeof CompressionStream === 'undefined') return { buffer: await raw.arrayBuffer(), compressed: false, originalBytes: raw.size };
  const zipped = await new Response(raw.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  const compressed = zipped.size + 64 < raw.size;
  return { buffer: await (compressed ? zipped : raw).arrayBuffer(), compressed, originalBytes: raw.size };
}
export async function unpackLesson(blob) {
  const magic = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  let stream = blob.stream();
  if (magic[0] === 31 && magic[1] === 139) {
    if (typeof DecompressionStream === 'undefined') throw Error('Atualize seu navegador para abrir esta aula comprimida.');
    stream = stream.pipeThrough(new DecompressionStream('gzip'));
  }
  let size = 0;
  const limited = stream.pipeThrough(new TransformStream({ transform(chunk, controller) { size += chunk.byteLength; if (size > MAX_UNPACKED_BYTES) throw Error('O arquivo descomprimido ultrapassa 64 MB.'); controller.enqueue(chunk); } }));
  return JSON.parse(await new Response(limited).text());
}
