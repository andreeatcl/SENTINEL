// read the first file in a zip using the runtime's native inflate

export async function unzipFirstFileAsText(buffer) {
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );

  let eocd = buffer.length - 22;
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("zip: end of central directory not found");

  // sizes come from the central directory, local headers may leave them zeroed
  const cd = view.getUint32(eocd + 16, true);
  if (view.getUint32(cd, true) !== 0x02014b50)
    throw new Error("zip: bad central directory");
  const method = view.getUint16(cd + 10, true);
  const compressedSize = view.getUint32(cd + 20, true);
  const localHeader = view.getUint32(cd + 42, true);

  if (view.getUint32(localHeader, true) !== 0x04034b50)
    throw new Error("zip: bad local header");
  const dataStart =
    localHeader +
    30 +
    view.getUint16(localHeader + 26, true) +
    view.getUint16(localHeader + 28, true);
  const data = buffer.subarray(dataStart, dataStart + compressedSize);

  if (method === 0) return new TextDecoder("utf-8").decode(data);
  if (method !== 8) throw new Error(`zip: unsupported method ${method}`);

  const inflated = new Response(data).body.pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  return new Response(inflated).text();
}
