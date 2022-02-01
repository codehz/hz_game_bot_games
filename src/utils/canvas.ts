import EmitterElement from "./emmiter.js";
import { mat3, type Vector } from "./math.js";
import { mixinPrototype, ohno } from "./utils.js";

export type ArrayRecord<K extends readonly string[], V> = {
  [P in K[number]]: V;
};

export type GL = WebGLRenderingContext &
  ANGLE_instanced_arrays &
  OES_vertex_array_object &
  OES_element_index_uint;

function fetchGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: true,
    depth: false,
    powerPreference: "high-performance",
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false,
  })! as GL;
  try {
    mixinPrototype(gl, gl.getExtension("ANGLE_instanced_arrays")!);
    mixinPrototype(gl, gl.getExtension("OES_vertex_array_object")!);
    mixinPrototype(gl, gl.getExtension("OES_element_index_uint")!);
  } catch (e) {
    alert("检测到不支持的浏览器");
    throw e;
  }
  return gl;
}

export class Camera extends EmitterElement<{
  loop: mat3;
  click: Vector;
  reset: void;
}> {
  #canvas: HTMLCanvasElement = document.createElement("canvas");
  #gl: GL = fetchGL(this.#canvas);
  #origin: Vector = [0, 0];
  #size: number = 30;
  #matrix!: mat3;
  #glmatrix!: mat3;
  #loop_handle!: number;

  constructor() {
    super();
    Object.assign(this.#canvas.style, {
      display: "block",
      position: "absolute",
      width: "100vw",
      height: "100vh",
    });
  }

  connectedCallback() {
    document.body.appendChild(this.#canvas);
    window.addEventListener("resize", this.#fit);
    this.#canvas.addEventListener("click", this.#click);
    this.#canvas.addEventListener("webglcontextrestored", this.#restored);
    this.#canvas.addEventListener("webglcontextlost", this.#lost);
    this.#restored();
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this.#fit);
    this.#canvas.removeEventListener("click", this.#click);
    window.removeEventListener("webglcontextrestored", this.#restored);
    this.#canvas.removeEventListener("webglcontextlost", this.#lost);
    this.#lost();
    this.#canvas.remove();
  }

  get gl() {
    return this.#gl;
  }

  #recalc() {
    const scale =
      Math.min(this.#canvas.width, this.#canvas.height) / this.#size;
    this.#matrix = mat3
      .create(
        mat3.translation(this.#canvas.width / 2, this.#canvas.height / 2),
        mat3.scaling(scale / 2),
        mat3.translation(-this.#origin[0], -this.#origin[1])
      )
      .inverse();
    this.#glmatrix = mat3.create(
      mat3.scaling(scale / this.#canvas.width, -scale / this.#canvas.height),
      mat3.translation(-this.#origin[0], -this.#origin[1])
    );
  }
  #fit = () => {
    this.#canvas.width = window.innerWidth * devicePixelRatio;
    this.#canvas.height = window.innerHeight * devicePixelRatio;
    this.gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
    this.#recalc();
  };
  #loop = () => {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.emit("loop", this.#glmatrix);
    this.#loop_handle = requestAnimationFrame(this.#loop);
  };
  #lost = () => {
    cancelAnimationFrame(this.#loop_handle);
  };
  #restored = () => {
    this.#gl = fetchGL(this.#canvas);
    this.#fit();
    this.#loop_handle = requestAnimationFrame(this.#loop);
    this.emit("reset", void 0);
  };
  #click = ({ x, y }: MouseEvent) => {
    const pos = this.#matrix.transformPoint([
      x * devicePixelRatio,
      y * devicePixelRatio,
    ]);
    this.emit("click", pos);
  };
}

customElements.define("gfx-camera", Camera);

class Resource extends HTMLElement {
  #camera: Camera | null = null;
  #gl?: GL;

  #reset = () => {
    this.#camera = this.closest("gfx-camera");
    this.#gl = this.#camera?.gl;
  };

  connectedCallback() {
    this.camera.on("reset", this.#reset);
    this.#reset();
  }

  disconnectedCallback() {
    this.camera.off("reset", this.#reset);
  }

  protected get camera(): Camera {
    return this.#camera ?? ohno("not mounted or invalid position");
  }

  protected get gl(): GL {
    return this.#gl ?? ohno("cannot load gl context");
  }
}

export interface AttributeSettings {
  size: GLint;
  type: GLenum;
  normalized: GLboolean;
  stride?: GLsizei;
  offset?: GLintptr;
  divisor?: number;
}

export class Program<
  A extends readonly string[],
  U extends readonly string[]
> extends Resource {
  #program?: WebGLProgram;
  #attribute: A;
  #uniform: U;
  readonly attribute = {} as ArrayRecord<A, number>;
  readonly uniform = {} as ArrayRecord<U, WebGLUniformLocation>;
  constructor(
    readonly vertex: string,
    readonly fragment: string,
    attributes: A,
    uniforms: U
  ) {
    super();
    this.#attribute = attributes;
    this.#uniform = uniforms;
  }
  static #loadShader(gl: GL, type: number, source: string) {
    const shader = gl.createShader(type) ?? ohno("Failed to create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      throw new Error(`Failed to compile shader: ${log}`);
    }
    return shader;
  }

  connectedCallback() {
    super.connectedCallback();
    this.camera.on("reset", this.#reset);
    this.#reset();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.camera.off("reset", this.#reset);
    if (this.#program) {
      this.gl.deleteProgram(this.#program);
    }
  }

  #reset() {
    this.#program = this.gl.createProgram() ?? ohno("Failed to create program");
    this.gl.attachShader(
      this.#program,
      Program.#loadShader(this.gl, this.gl.VERTEX_SHADER, this.vertex)
    );
    this.gl.attachShader(
      this.#program,
      Program.#loadShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragment)
    );
    this.gl.linkProgram(this.#program);
    if (!this.gl.getProgramParameter(this.#program, this.gl.LINK_STATUS)) {
      const log = this.gl.getProgramInfoLog(this.#program);
      throw new Error(`Failed to link program: ${log}`);
    }
    for (const s of this.#attribute) {
      this.attribute[s as A[number]] = this.gl.getAttribLocation(
        this.#program!,
        s
      );
    }
    for (const s of this.#uniform) {
      this.uniform[s as U[number]] =
        this.gl.getUniformLocation(this.#program!, s) ??
        ohno(`Invalid uniform: ${s}`);
    }
  }

  use(): void {
    this.gl.useProgram(this.#program!);
  }

  attr(
    name: A[number],
    {
      size,
      type,
      normalized,
      stride = 0,
      offset = 0,
      divisor,
    }: AttributeSettings
  ): void {
    const index = this.attribute[name];
    this.gl.enableVertexAttribArray(index);
    this.gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    if (divisor) {
      this.gl.vertexAttribDivisorANGLE(index, divisor);
    }
  }
  attrs(
    maps: Partial<ArrayRecord<A, AttributeSettings>>,
    mixin: Partial<Record<"stride" | "offset" | "divisor", number>> = {}
  ): void {
    for (const name in maps) {
      this.attr(name, Object.assign({}, mixin, (maps as any)[name as any]));
    }
  }
}

customElements.define("gfx-program", Program);

type BufferDataSourcePure = BufferSource | number;
type BufferDataSource =
  | BufferDataSourcePure
  | null
  | (() => BufferDataSourcePure);

export class Buffer extends Resource {
  #buffer?: WebGLBuffer;
  #target: number;
  #data: BufferDataSource;
  #usage: number;
  #clean: boolean = true;
  constructor(target: number, data: BufferDataSource, usage: GLenum) {
    super();
    this.#target = target;
    this.#data = data;
    this.#usage = usage;
  }

  connectedCallback() {
    super.connectedCallback();
    this.camera.on("reset", this.#reset);
    this.#reset();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.camera.off("reset", this.#reset);
    if (this.#buffer) {
      this.gl.deleteBuffer(this.#buffer);
    }
  }

  #reset(): void {
    this.#clean = true;
    this.#buffer = this.gl.createBuffer() ?? ohno("Failed to create buffer");
    this.with(() => {
      if (typeof this.#data == "function") {
        this.gl.bufferData(this.#target, this.#data() as any, this.#usage);
      } else if (this.#data) {
        this.gl.bufferData(this.#target, this.#data as any, this.#usage);
      }
    });
  }
  use() {
    this.gl.bindBuffer(this.#target, this.#buffer!);
  }
  with(cb: () => void, ifClean: boolean = false): void {
    if (ifClean && !this.#clean) return;
    this.gl.bindBuffer(this.#target, this.#buffer!);
    cb();
    this.gl.bindBuffer(this.#target, null);
  }
  upload(data: BufferSource): void {
    this.#clean = false;
    this.with(() => {
      this.gl.bufferData(this.#target, data as any, this.#usage);
    });
  }
}

customElements.define("gfx-buffer", Buffer);

export class VertexArray extends Resource {
  #init: () => void;
  #vao: WebGLVertexArrayObjectOES | null = null;

  constructor(init: () => void) {
    super();
    this.#init = init;
  }

  connectedCallback() {
    super.connectedCallback();
    this.camera.on("reset", this.#reset);
    this.#reset();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.camera.off("reset", this.#reset);
    if (this.#vao) {
      this.gl.deleteVertexArrayOES(this.#vao);
    }
  }

  with(cb: () => void): void {
    this.gl.bindVertexArrayOES(this.#vao);
    cb();
    this.gl.bindVertexArrayOES(null);
  }

  #reset() {
    this.#vao = this.gl.createVertexArrayOES() ?? ohno("Failed to create vao");
    this.with(this.#init);
  }
}

customElements.define("gfx-vao", VertexArray);
