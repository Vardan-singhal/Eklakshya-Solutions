import assert from "node:assert/strict";
import { test } from "node:test";
import { cn } from "../src/lib/utils.ts";

test("cn merges single and multiple class names", () => {
  assert.equal(cn("foo", "bar"), "foo bar");
});

test("cn handles conditional and falsy values safely", () => {
  const isHidden = false;
  const isVisible = true;
  assert.equal(
    cn("base-class", isHidden && "hidden", isVisible && "block", null, undefined, 0 && "zero"),
    "base-class block"
  );
});

test("cn resolves conflicting Tailwind utility classes cleanly", () => {
  assert.equal(cn("px-4 py-2", "px-8"), "py-2 px-8");
  assert.equal(cn("text-red-500", "text-blue-500"), "text-blue-500");
  assert.equal(cn("bg-red-500", "bg-blue-500"), "bg-blue-500");
  assert.equal(cn("opacity-50", "opacity-100"), "opacity-100");
});

test("cn supports arrays and nested objects", () => {
  assert.equal(cn(["text-sm", { "font-bold": true, italic: false }]), "text-sm font-bold");
});
