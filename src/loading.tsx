const target = document.getElementById("loading-progress")!;

export function reportProgress(text: string) {
  target.innerText = text;
}
