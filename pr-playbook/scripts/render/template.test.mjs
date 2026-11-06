import assert from "node:assert/strict";
import { test } from "node:test";
import { renderTemplate } from "./template.mjs";

test("escapes every value and turns newlines into <br>", () => {
  assert.equal(
    renderTemplate("<p>{{a}}</p>", { a: '<script>x</script>\n"' }),
    "<p>&lt;script&gt;x&lt;/script&gt;<br>&quot;</p>",
  );
});

test("url and color drop unsafe values", () => {
  assert.equal(renderTemplate('<a href="{{url u}}">', { u: "javascript:alert(1)" }), '<a href="">');
  assert.equal(
    renderTemplate('<a href="{{url u}}">', { u: "https://e.x/?a=1&b=2" }),
    '<a href="https://e.x/?a=1&amp;b=2">',
  );
  assert.equal(renderTemplate("color:{{color c}}", { c: "red;background:url(x)" }), "color:");
  assert.equal(renderTemplate("color:{{color c}}", { c: "#1E1E1E" }), "color:#1E1E1E");
});

test("each resolves on the item, then outward, with positions", () => {
  const out = renderTemplate("{{#each items}}[{{@number}} {{name}} {{skin.x}}]{{/each}}", {
    items: [{ name: "a" }, { name: "b" }],
    skin: { x: "s" },
  });
  assert.equal(out, "[1 a s][2 b s]");
  assert.equal(
    renderTemplate("{{#each xs}}<li>{{this}}</li>{{/each}}", { xs: ["a", "<b>"] }),
    "<li>a</li><li>&lt;b&gt;</li>",
  );
});

test("if / else, with empty arrays false", () => {
  const t = "{{#if xs}}some{{else}}none{{/if}}";
  assert.equal(renderTemplate(t, { xs: [] }), "none");
  assert.equal(renderTemplate(t, { xs: [1] }), "some");
  assert.equal(renderTemplate("{{#if a}}{{#if b}}ab{{/if}}{{else}}-{{/if}}", { a: 1, b: 1 }), "ab");
});

test("rejects unbalanced blocks", () => {
  assert.throws(() => renderTemplate("{{#if a}}x", {}));
  assert.throws(() => renderTemplate("{{/each}}", {}));
});
