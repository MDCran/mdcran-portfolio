import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { adminSectionTitles } from "../src/lib/admin-navigation";

type Node = { type: unknown; props: Record<string, unknown> };
type Handler = (...args: unknown[]) => unknown;

// Exercise event/state transitions without a browser or any authentication calls.
function componentHarness(relativePath: string, dependencies: Record<string, unknown> = {}, fetcher?: unknown) {
  const states: unknown[] = [];
  let cursor = 0;
  const element = (type: unknown, props: Record<string, unknown>): Node => ({ type, props });
  const react = {
    useId: () => "admin-search-test",
    useEffect: () => {},
    useRef: (value: unknown) => {
      const index = cursor++;
      if (!(index in states)) states[index] = { current: value };
      return states[index];
    },
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (next: unknown) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
  };
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const testModule = { exports: {} as { default: (props: Record<string, unknown>) => Node } };
  const imports: Record<string, unknown> = {
    react, "react/jsx-runtime": { jsx: element, jsxs: element },
    "@/lib/admin-navigation": { adminSectionTitles },
    "./AdminShell.module.css": new Proxy({}, { get: (_, key) => key === "__esModule" ? false : String(key) }),
    ...dependencies,
  };
  vm.runInNewContext(output, { module: testModule, exports: testModule.exports, fetch: fetcher, require: (name: string) => {
    assert.ok(name in imports, `Unexpected dependency: ${name}`);
    return imports[name];
  } });
  return (props: Record<string, unknown> = {}) => { cursor = 0; return testModule.exports.default(props); };
}

function nodes(node: unknown): Node[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Node;
  return [element, ...nodes(element.props.children)];
}

function find(tree: Node, predicate: (node: Node) => boolean) {
  const result = nodes(tree).find(predicate);
  assert.ok(result, "Expected rendered control");
  return result;
}

function call(node: Node, event: string, payload?: unknown) {
  return (node.props[event] as Handler)(payload);
}

test("admin search arrows choose later results, Enter selects them, Escape closes", () => {
  const render = componentHarness("../src/components/admin/AdminSearch.tsx");
  let value = "content";
  const selected: string[] = [];
  const props = () => ({ value, onChange: (next: string) => { value = next; }, inputRef: { current: null }, results: [
    { id: "a", label: "Content studio", hint: "Section", section: "content-studio", onSelect: () => selected.push("a") },
    { id: "b", label: "Content health", hint: "Section", section: "content-health", onSelect: () => selected.push("b") },
  ] });
  const input = () => find(render(props()), n => n.props.role === "combobox");
  call(input(), "onFocus");
  assert.equal(input().props["aria-expanded"], true);
  let prevented = 0;
  call(input(), "onKeyDown", { key: "ArrowDown", preventDefault: () => prevented++ });
  assert.match(String(input().props["aria-activedescendant"]), /option-1$/);
  call(input(), "onKeyDown", { key: "Enter", preventDefault: () => prevented++ });
  assert.deepEqual(selected, ["b"]);
  assert.equal(input().props["aria-expanded"], false);
  call(input(), "onFocus");
  call(input(), "onKeyDown", { key: "Escape", preventDefault: () => prevented++ });
  assert.equal(value, "");
  assert.equal(input().props["aria-expanded"], false);
  assert.equal(prevented, 3);
});

test("empty admin search tolerates arrows and Enter without selecting anything", () => {
  const render = componentHarness("../src/components/admin/AdminSearch.tsx");
  const props = { value: "no match", onChange: () => {}, inputRef: { current: null }, results: [] };
  const input = () => find(render(props), n => n.props.role === "combobox");
  call(input(), "onFocus");
  for (const key of ["ArrowDown", "ArrowUp", "Enter"]) call(input(), "onKeyDown", { key, preventDefault: () => {} });
  assert.equal(input().props["aria-activedescendant"], undefined);
  call(input(), "onBlur");
  assert.equal(input().props["aria-expanded"], false);
});

test("login labels, password visibility and authentication errors are accessible", async () => {
  const render = componentHarness("../src/app/admin/page.tsx", {
    "next/navigation": { useRouter: () => ({ push: () => {} }) },
    "next/link": { default: "a", __esModule: true },
    "@/lib/utils": { assetUrl: (url: string) => url },
    "framer-motion": { motion: new Proxy({}, { get: (_, key) => String(key) }) },
  }, async () => ({ ok: true, json: async () => ({ needCode: true }) }));
  assert.equal(render().type, "main");
  const password = () => find(render(), node => node.props.id === "admin-password");
  assert.equal(find(render(), node => node.props.htmlFor === "admin-password").type, "label");
  assert.equal(password().props.autoComplete, "current-password");
  const toggle = find(render(), node => node.props["aria-label"] === "Show password");
  assert.equal(toggle.props.tabIndex, undefined);
  call(toggle, "onClick");
  assert.equal(password().props.type, "text");
  assert.equal(find(render(), node => node.props["aria-label"] === "Hide password").props["aria-pressed"], true);
  await call(find(render(), node => node.type === "form"), "onSubmit", { preventDefault: () => {} });
  assert.equal(password().props["aria-invalid"], true);
  assert.equal(password().props["aria-describedby"], "admin-login-error");
  assert.equal(find(render(), node => node.props.id === "admin-login-error").props.role, "alert");
  call(password(), "onChange", { target: { value: "fixture-password" } });
  await call(find(render(), node => node.type === "form"), "onSubmit", { preventDefault: () => {} });
  const code = find(render(), node => node.props.id === "admin-authentication-code");
  assert.equal(find(render(), node => node.props.htmlFor === code.props.id).type, "label");
  assert.equal(code.props.autoComplete, "one-time-code");
  assert.equal(code.props.pattern, "[0-9]{6}");
  assert.equal(code.props.required, true);
});
