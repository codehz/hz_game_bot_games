import JSZip from "/deps/jszip.js";

function splitFilename(filename: string): [string, string] {
  const idx = filename.lastIndexOf(".");
  return [filename.substring(0, idx), filename.substring(idx)];
}

async function withBlobURL<R>(blob: Blob, f: (url: string) => R) {
  const url = URL.createObjectURL(blob);
  try {
    return await f(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default class AssLoader {
  #audioctx = new AudioContext();
  #fonts = new Map<string, FontFace>();
  #audios = new Map<string, AudioBuffer>();
  #images = new Map<string, HTMLImageElement>();
  #xmls = new Map<string, Document>();

  getFont(name: string) {
    return this.#fonts.get(name);
  }
  getAudio(name: string) {
    return this.#audios.get(name);
  }
  getImage(name: string) {
    return this.#images.get(name);
  }
  getXml(name: string) {
    return this.#xmls.get(name);
  }

  static async load(url: string) {
    const resp = await fetch(url);
    const buff = await resp.arrayBuffer();
    const zip = await JSZip.loadAsync(buff);
    const ret = new AssLoader();
    await Promise.all(
      Object.entries(zip.files).map(async ([name, file]) => {
        console.log("loading %s", name);
        const [filename, ext] = splitFilename(name);
        switch (ext) {
          case ".ttf": {
            const data = await file.async("arraybuffer");
            const fontface = await new FontFace(
              filename.replace(/_/g, " "),
              data
            ).load();
            ret.#fonts.set(filename, fontface);
            console.log("loaded font %s", name);
            break;
          }
          case ".ogg": {
            const buffer = await file.async("arraybuffer");
            const audio = await ret.#audioctx.decodeAudioData(buffer);
            ret.#audios.set(filename, audio);
            console.log("loaded audio %s", name);
            break;
          }
          case ".png": {
            const blob = await file.async("blob");
            const img = await withBlobURL(
              blob,
              (url) =>
                new Promise<HTMLImageElement>((resolve, reject) => {
                  const img = new Image();
                  img.src = url;
                  img.onload = () => resolve(img);
                  img.onerror = reject;
                })
            );
            ret.#images.set(filename, img);
            console.log("loaded image %s", name);
            break;
          }
          case ".xml": {
            const txt = await file.async("string");
            const doc = new DOMParser().parseFromString(txt, "text/xml");
            ret.#xmls.set(filename, doc);
            console.log("loaded xml %s", name);
            break;
          }
        }
      })
    );
    return ret;
  }
}
