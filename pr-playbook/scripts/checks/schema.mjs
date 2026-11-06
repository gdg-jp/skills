// Minimal JSON Schema validator for the strict subset the Skills' output schemas use
// (Codex --output-schema): type, enum, const, properties, required, additionalProperties,
// items, anyOf/oneOf, $ref to #/$defs, min/max items/length, minimum/maximum, pattern.

export function validateSchema(schema, value) {
  const errors = [];
  walk(schema, value, "$", schema, errors);
  return errors;
}

function resolve(ref, root) {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((node, key) => node?.[key.replace(/~1/g, "/").replace(/~0/g, "~")], root);
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function typeMatches(expected, actual) {
  if (expected === actual) return true;
  if (expected === "number" && actual === "integer") return true;
  return false;
}

function walk(schema, value, path, root, errors) {
  if (schema === true || schema === undefined) return;
  if (schema === false) {
    errors.push(`${path}: not allowed`);
    return;
  }
  if (schema.$ref) {
    walk(resolve(schema.$ref, root), value, path, root, errors);
    return;
  }
  const alternatives = schema.anyOf ?? schema.oneOf;
  if (alternatives) {
    const ok = alternatives.some((alt) => {
      const sub = [];
      walk(alt, value, path, root, sub);
      return sub.length === 0;
    });
    if (!ok) errors.push(`${path}: matches none of anyOf`);
    return;
  }
  const actual = typeOf(value);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(t, actual))) {
      errors.push(`${path}: expected ${types.join("|")}, got ${actual}`);
      return;
    }
  }
  if (schema.const !== undefined && value !== schema.const)
    errors.push(`${path}: expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value))
    errors.push(`${path}: not one of ${schema.enum.join(", ")}`);
  if (actual === "string") {
    if (schema.minLength !== undefined && [...value].length < schema.minLength)
      errors.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength)
      errors.push(`${path}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value))
      errors.push(`${path}: does not match ${schema.pattern}`);
  }
  if (actual === "integer" || actual === "number") {
    if (schema.minimum !== undefined && value < schema.minimum)
      errors.push(`${path}: below ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum)
      errors.push(`${path}: above ${schema.maximum}`);
  }
  if (actual === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      errors.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      errors.push(`${path}: more than ${schema.maxItems} items`);
    if (schema.items)
      value.forEach((item, i) => walk(schema.items, item, `${path}[${i}]`, root, errors));
  }
  if (actual === "object") {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}.${key}: required`);
    }
    const props = schema.properties ?? {};
    for (const [key, child] of Object.entries(value)) {
      if (key in props) walk(props[key], child, `${path}.${key}`, root, errors);
      else if (schema.additionalProperties === false)
        errors.push(`${path}.${key}: unexpected property`);
      else if (typeof schema.additionalProperties === "object")
        walk(schema.additionalProperties, child, `${path}.${key}`, root, errors);
    }
  }
}
