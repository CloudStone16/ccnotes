/* Tiny JSON-Schema (draft-07 subset) validator — enough for templates/schemas/*.
 * Supports: type, required, properties, additionalProperties(false), items,
 * enum, const, pattern, minLength, minItems, maxItems, minimum, maximum,
 * $ref (#/definitions/x), definitions, format:"date-time". */
export function validate(schema, data, root, pathStr) {
  root = root || schema; pathStr = pathStr || "";
  const errs = [];
  const at = (s) => (pathStr || "(root)") + (s ? " " + s : "");

  if (schema.$ref) {
    const key = schema.$ref.replace("#/definitions/", "");
    return validate(root.definitions[key], data, root, pathStr);
  }
  const t = schema.type;
  if (t) {
    const ok =
      t === "array" ? Array.isArray(data) :
      t === "integer" ? Number.isInteger(data) :
      t === "object" ? data && typeof data === "object" && !Array.isArray(data) :
      typeof data === t;
    if (!ok) { errs.push(`${at()}: expected ${t}, got ${Array.isArray(data) ? "array" : typeof data}`); return errs; }
  }
  if (schema.enum && !schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(data)))
    errs.push(`${at()}: ${JSON.stringify(data)} not in enum ${JSON.stringify(schema.enum)}`);
  if ("const" in schema && JSON.stringify(schema.const) !== JSON.stringify(data))
    errs.push(`${at()}: must equal ${JSON.stringify(schema.const)}`);
  if (typeof data === "string") {
    if (schema.minLength != null && data.length < schema.minLength) errs.push(`${at()}: shorter than ${schema.minLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) errs.push(`${at()}: does not match /${schema.pattern}/`);
    if (schema.format === "date-time" && isNaN(Date.parse(data))) errs.push(`${at()}: not a valid date-time`);
  }
  if (typeof data === "number") {
    if (schema.minimum != null && data < schema.minimum) errs.push(`${at()}: < ${schema.minimum}`);
    if (schema.maximum != null && data > schema.maximum) errs.push(`${at()}: > ${schema.maximum}`);
  }
  if (Array.isArray(data)) {
    if (schema.minItems != null && data.length < schema.minItems) errs.push(`${at()}: fewer than ${schema.minItems} items`);
    if (schema.maxItems != null && data.length > schema.maxItems) errs.push(`${at()}: more than ${schema.maxItems} items`);
    if (schema.items) data.forEach((v, i) => errs.push(...validate(schema.items, v, root, `${pathStr}[${i}]`)));
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const r of schema.required || [])
      if (!(r in data)) errs.push(`${at()}: missing required "${r}"`);
    for (const k of Object.keys(data)) {
      if (schema.properties && k in schema.properties)
        errs.push(...validate(schema.properties[k], data[k], root, pathStr ? `${pathStr}.${k}` : k));
      else if (schema.additionalProperties === false)
        errs.push(`${at()}: unexpected property "${k}"`);
    }
  }
  return errs;
}
