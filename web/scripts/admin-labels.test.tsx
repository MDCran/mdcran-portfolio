import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LabeledField from "../src/components/admin/LabeledField";

test("visible labels enclose each native field without generated or colliding IDs", () => {
  const html = renderToStaticMarkup(<>
    <LabeledField label="Title" required><input defaultValue="Saved title" /></LabeledField>
    <LabeledField label="Category" className="md:col-span-2"><select defaultValue="engineering"><option value="engineering">Engineering</option></select></LabeledField>
    <LabeledField label="Description"><textarea defaultValue="Saved description" /></LabeledField>
    <LabeledField label="Title"><input defaultValue="Another repeated record" /></LabeledField>
  </>);
  const fields = html.match(/<label\b[\s\S]*?<\/label>/g) ?? [];
  assert.equal(fields.length, 4);
  assert.match(fields[0], /Title[\s\S]*<input[^>]*value="Saved title"/);
  assert.match(fields[0], /aria-hidden="true"[^>]*>\*/);
  assert.match(fields[0], /\(required\)/);
  assert.match(fields[1], /class="block min-w-0 md:col-span-2"/);
  assert.match(fields[1], /Category[\s\S]*<select/);
  assert.match(fields[2], /Description[\s\S]*<textarea[^>]*>Saved description/);
  assert.match(fields[3], /Another repeated record/);
  assert.doesNotMatch(html, /\bid=/);
  for (const field of fields) assert.equal((field.match(/<label\b/g) ?? []).length, 1);
});

test("migrated admin field wrappers each contain exactly one native form control", () => {
  const files = ["AdminWorkspace", "ArticleModal", "CampaignModal", "CampaignViewModal", "ClientModal", "ContactEditorModal", "ProjectModal"];
  let migrated = 0;
  for (const name of files) {
    const source = fs.readFileSync(new URL(`../src/components/admin/${name}.tsx`, import.meta.url), "utf8");
    const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "LabeledField") {
        migrated++;
        const children = node.children.filter(child => !ts.isJsxText(child) || child.text.trim()).filter(child => !(ts.isJsxExpression(child) && !child.expression));
        assert.equal(children.length, 1, `${name} field must have one explicit control`);
        const child = children[0];
        assert.ok(ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child));
        const control = ts.isJsxElement(child) ? child.openingElement : child;
        assert.ok(["input", "select", "textarea"].includes(control.tagName.getText(ast)));
        assert.ok(node.openingElement.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === "label"));
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  assert.ok(migrated >= 110, "All 110 audited simple field pairs retain their explicit label wrapper");
});

test("booking setting captions wrap their corresponding native controls", () => {
  const source = fs.readFileSync(new URL("../src/components/admin/BookingAdmin.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("BookingAdmin", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let associated = 0;
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "span" && node.openingElement.attributes.getText(ast) === "className={label}") {
      assert.ok(ts.isJsxElement(node.parent));
      assert.equal(node.parent.openingElement.tagName.getText(ast), "label");
      const controls = node.parent.children.filter(child => ts.isJsxSelfClosingElement(child) && child.tagName.getText(ast) === "input");
      assert.equal(controls.length, 1);
      associated++;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(associated, 5);
});
