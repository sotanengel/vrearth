/** Pure function: compute movement delta from current held keys */
export function computeMoveDelta(
  keys: Set<string>,
  speed: number,
): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;
  if (keys.has("w") || keys.has("ArrowUp")) dy -= speed;
  if (keys.has("s") || keys.has("ArrowDown")) dy += speed;
  if (keys.has("a") || keys.has("ArrowLeft")) dx -= speed;
  if (keys.has("d") || keys.has("ArrowRight")) dx += speed;
  return { dx, dy };
}
